/**
 * Shared Utilities for Supabase Edge Functions
 * Common functions used across all data sync functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'https://deno.land/std@0.208.0/node/crypto.ts';

// ============================================================================
// Types
// ============================================================================

export interface SyncResult {
  success: boolean;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsDeleted: number;
  error?: string;
  changes?: DataChange[];
}

export interface DataChange {
  entityType: string;
  entityId: string;
  changeType: 'created' | 'updated' | 'deleted' | 'rescheduled';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  significance: 'critical' | 'high' | 'medium' | 'low';
}

export interface RateLimitConfig {
  requests: number;
  period: number; // seconds
}

// ============================================================================
// Supabase Client
// ============================================================================

export function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, supabaseKey);
}

// ============================================================================
// Hashing & Change Detection
// ============================================================================

/**
 * Calculate SHA-256 hash of content for change detection
 */
export function hashContent(content: string): string {
  const hash = createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
}

/**
 * Check if content has changed since last fetch
 */
export async function hasContentChanged(
  supabase: any,
  sourceId: string,
  url: string,
  currentContent: string
): Promise<boolean> {
  const currentHash = hashContent(currentContent);

  // Get stored snapshot
  const { data: snapshot } = await supabase
    .from('content_snapshots')
    .select('content_hash')
    .eq('source_id', sourceId)
    .eq('url', url)
    .single();

  if (!snapshot) {
    // First time fetching - store snapshot
    await supabase
      .from('content_snapshots')
      .insert({
        source_id: sourceId,
        url,
        content_hash: currentHash,
        last_checked: new Date().toISOString(),
        last_changed: new Date().toISOString(),
      });
    return true;
  }

  const hasChanged = currentHash !== snapshot.content_hash;

  // Update snapshot
  await supabase
    .from('content_snapshots')
    .update({
      content_hash: currentHash,
      last_checked: new Date().toISOString(),
      last_changed: hasChanged ? new Date().toISOString() : undefined,
      check_count: supabase.raw('check_count + 1'),
      change_count: hasChanged ? supabase.raw('change_count + 1') : undefined,
    })
    .eq('source_id', sourceId)
    .eq('url', url);

  return hasChanged;
}

// ============================================================================
// Rate Limiting
// ============================================================================

const rateLimitCache = new Map<string, { requests: number; resetTime: number }>();

/**
 * Check if we're within rate limits for a source
 */
export function checkRateLimit(sourceId: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const key = sourceId;

  const limit = rateLimitCache.get(key);

  if (!limit || now >= limit.resetTime) {
    // Reset period has passed or first request
    rateLimitCache.set(key, {
      requests: 1,
      resetTime: now + (config.period * 1000),
    });
    return true;
  }

  if (limit.requests >= config.requests) {
    // Rate limit exceeded
    return false;
  }

  // Increment request count
  limit.requests++;
  return true;
}

/**
 * Sleep/delay utility with exponential backoff
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// HTTP Utilities with Retry
// ============================================================================

export interface FetchOptions {
  maxRetries?: number;
  retryDelay?: number; // ms
  timeout?: number; // ms
  headers?: Record<string, string>;
}

/**
 * Fetch with automatic retries and exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000,
    headers = {},
  } = options;

  const defaultHeaders = {
    'User-Agent': 'MotoSense/1.0 (Data Sync Bot; +https://motosense.app/bot)',
    ...headers,
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: defaultHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // Don't retry on 4xx errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Retry on 5xx or 429
      if (attempt < maxRetries - 1) {
        const backoffDelay = retryDelay * Math.pow(2, attempt);
        console.log(`Retry ${attempt + 1}/${maxRetries} after ${backoffDelay}ms`);
        await delay(backoffDelay);
        continue;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error: any) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      const backoffDelay = retryDelay * Math.pow(2, attempt);
      console.log(`Error: ${error.message}. Retry ${attempt + 1}/${maxRetries} after ${backoffDelay}ms`);
      await delay(backoffDelay);
    }
  }

  throw new Error('Max retries exceeded');
}

// ============================================================================
// Sync Logging
// ============================================================================

/**
 * Start a sync operation and return sync_id
 */
export async function logSyncStart(
  supabase: any,
  sourceId: string,
  syncType: string,
  metadata?: Record<string, any>
): Promise<string> {
  const { data, error } = await supabase
    .rpc('log_sync_start', {
      p_source_id: sourceId,
      p_sync_type: syncType,
      p_metadata: metadata || null,
    });

  if (error) throw error;
  return data;
}

/**
 * Complete a sync operation with results
 */
export async function logSyncComplete(
  supabase: any,
  syncId: string,
  result: SyncResult
): Promise<void> {
  await supabase.rpc('log_sync_complete', {
    p_sync_id: syncId,
    p_status: result.success ? 'success' : 'failed',
    p_records_fetched: result.recordsFetched,
    p_records_inserted: result.recordsInserted,
    p_records_updated: result.recordsUpdated,
    p_records_deleted: result.recordsDeleted,
    p_error_message: result.error || null,
  });

  // Log detected changes
  if (result.changes && result.changes.length > 0) {
    const changeRecords = result.changes.map(change => ({
      sync_history_id: syncId,
      entity_type: change.entityType,
      entity_id: change.entityId,
      change_type: change.changeType,
      field_name: change.fieldName,
      old_value: change.oldValue,
      new_value: change.newValue,
      significance: change.significance,
    }));

    await supabase
      .from('data_changes')
      .insert(changeRecords);
  }
}

// ============================================================================
// Data Validation
// ============================================================================

/**
 * Validate a date string
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate coordinates (latitude, longitude)
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Sanitize string input (remove excess whitespace, trim)
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Standard error response format
 */
export function errorResponse(message: string, statusCode: number = 500): Response {
  return new Response(
    JSON.stringify({
      error: message,
      timestamp: new Date().toISOString(),
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Standard success response format
 */
export function successResponse(data: any, statusCode: number = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// ============================================================================
// Notification Helpers
// ============================================================================

/**
 * Send notification for critical changes (placeholder - integrate with email/push later)
 */
export async function notifyCriticalChange(change: DataChange): Promise<void> {
  console.log('🚨 CRITICAL CHANGE DETECTED:', {
    type: change.entityType,
    id: change.entityId,
    change: change.changeType,
    field: change.fieldName,
    old: change.oldValue,
    new: change.newValue,
  });

  // TODO: Integrate with email service or push notification service
  // For now, just log to console (visible in Supabase Edge Functions logs)
}
