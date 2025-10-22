-- Data Sync Infrastructure Migration
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. DATA SOURCES TABLE
-- Track all external data sources we pull from
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'schedule', 'results', 'riders', 'tracks', 'weather', 'timing'
  url TEXT NOT NULL,
  reliability_score DECIMAL(3, 2) DEFAULT 0.95, -- 0.00 to 1.00
  is_official BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  rate_limit_requests INTEGER, -- requests per period
  rate_limit_period INTEGER, -- period in seconds
  last_successful_fetch TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active sources
CREATE INDEX IF NOT EXISTS idx_data_sources_active ON data_sources(is_active, category);

-- Row Level Security
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

-- Everyone can view data sources
CREATE POLICY "Data sources are viewable by everyone"
  ON data_sources FOR SELECT
  USING (true);

-- Only admins can manage data sources
CREATE POLICY "Admins can manage data sources"
  ON data_sources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. SYNC HISTORY TABLE
-- Track every sync operation for monitoring and debugging
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'scheduled', 'manual', 'triggered', 'race_day'
  status TEXT NOT NULL, -- 'success', 'partial', 'failed'
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  records_fetched INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_deleted INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB, -- Additional context (race_id, filters used, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sync_history_source ON sync_history(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_date ON sync_history(created_at DESC);

-- Row Level Security
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- Admins can view sync history
CREATE POLICY "Admins can view sync history"
  ON sync_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Only system can write sync history (via service role)
-- No user-facing INSERT/UPDATE/DELETE policies

-- ============================================================================
-- 3. DATA CHANGES TABLE
-- Track detected changes for notifications and auditing
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_history_id UUID REFERENCES sync_history(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'race', 'rider', 'track', 'result'
  entity_id TEXT NOT NULL, -- ID of the changed entity
  change_type TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'rescheduled'
  field_name TEXT, -- Specific field that changed
  old_value TEXT,
  new_value TEXT,
  significance TEXT NOT NULL DEFAULT 'low', -- 'critical', 'high', 'medium', 'low'
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_data_changes_sync ON data_changes(sync_history_id);
CREATE INDEX IF NOT EXISTS idx_data_changes_entity ON data_changes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_data_changes_significance ON data_changes(significance, notified);
CREATE INDEX IF NOT EXISTS idx_data_changes_date ON data_changes(created_at DESC);

-- Row Level Security
ALTER TABLE data_changes ENABLE ROW LEVEL SECURITY;

-- Admins can view data changes
CREATE POLICY "Admins can view data changes"
  ON data_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- 4. DATA QUALITY METRICS TABLE
-- Track data quality over time
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_quality_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_records INTEGER DEFAULT 0,
  valid_records INTEGER DEFAULT 0,
  invalid_records INTEGER DEFAULT 0,
  duplicate_records INTEGER DEFAULT 0,
  missing_required_fields INTEGER DEFAULT 0,
  validation_errors JSONB, -- Detailed error breakdown
  accuracy_score DECIMAL(5, 2), -- 0.00 to 100.00
  completeness_score DECIMAL(5, 2), -- 0.00 to 100.00
  timeliness_score DECIMAL(5, 2), -- 0.00 to 100.00
  overall_score DECIMAL(5, 2), -- 0.00 to 100.00
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(source_id, metric_date)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_data_quality_source_date ON data_quality_metrics(source_id, metric_date DESC);

-- Row Level Security
ALTER TABLE data_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Admins can view quality metrics
CREATE POLICY "Admins can view quality metrics"
  ON data_quality_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- 5. CONTENT SNAPSHOTS TABLE
-- Store content hashes for change detection
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  last_checked TIMESTAMPTZ NOT NULL,
  last_changed TIMESTAMPTZ NOT NULL,
  check_count INTEGER DEFAULT 1,
  change_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(source_id, url)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_content_snapshots_source ON content_snapshots(source_id, last_checked DESC);

-- Row Level Security
ALTER TABLE content_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins can view snapshots
CREATE POLICY "Admins can view content snapshots"
  ON content_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_content_snapshots_updated_at
  BEFORE UPDATE ON content_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. SEED DATA: Insert known data sources
-- ============================================================================

INSERT INTO data_sources (name, category, url, is_official, reliability_score, rate_limit_requests, rate_limit_period, notes) VALUES
  -- Tier 1: Official Sources (Priority Order)
  ('SuperMotocross Schedule', 'schedule', 'https://www.supermotocross.com/schedule', true, 1.00, 30, 3600, 'PRIMARY - Official SuperMotocross schedule (highest priority)'),
  ('SuperMotocross Results', 'results', 'https://www.supermotocross.com/results', true, 1.00, 30, 3600, 'PRIMARY - Official SuperMotocross results'),
  ('SuperMotocross Riders', 'riders', 'https://www.supermotocross.com/riders', true, 1.00, 30, 3600, 'PRIMARY - Official SuperMotocross rider data'),

  ('SupercrossLIVE Schedule', 'schedule', 'https://www.supercrosslive.com/schedule', true, 0.98, 30, 3600, 'SECONDARY - Official Supercross schedule'),
  ('SupercrossLIVE Results', 'results', 'https://www.supercrosslive.com/results', true, 0.98, 30, 3600, 'SECONDARY - Official Supercross results'),
  ('SupercrossLIVE Live Timing', 'timing', 'https://www.supercrosslive.com/live', true, 0.98, 60, 60, 'SECONDARY - Live timing during races'),

  ('ProMotocross Schedule', 'schedule', 'https://promotocross.com/schedule', true, 0.98, 30, 3600, 'TERTIARY - Official Motocross schedule'),
  ('ProMotocross Results', 'results', 'https://promotocross.com/results', true, 0.98, 30, 3600, 'TERTIARY - Official Motocross results'),

  -- Tier 2: Highly Accurate Third-Party (Validation)
  ('Racer X Results', 'results', 'https://racerxonline.com/results', false, 0.95, 60, 3600, 'VALIDATION - Extremely accurate results for cross-checking'),
  ('Racer X News', 'news', 'https://racerxonline.com/news', false, 0.95, 60, 3600, 'VALIDATION - News, injuries, team changes'),
  ('Racer X Rider Profiles', 'riders', 'https://racerxonline.com/riders', false, 0.95, 60, 3600, 'VALIDATION - Rider database'),

  -- Weather (Already Integrated)
  ('Open-Meteo API', 'weather', 'https://api.open-meteo.com/v1/forecast', false, 0.99, 10000, 86400, 'Weather API - already integrated in app')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate data quality scores
CREATE OR REPLACE FUNCTION calculate_data_quality_score(
  p_total INTEGER,
  p_valid INTEGER,
  p_invalid INTEGER,
  p_duplicate INTEGER,
  p_missing INTEGER
) RETURNS DECIMAL AS $$
DECLARE
  accuracy DECIMAL;
  completeness DECIMAL;
  uniqueness DECIMAL;
  overall DECIMAL;
BEGIN
  -- Avoid division by zero
  IF p_total = 0 THEN
    RETURN 0.00;
  END IF;

  -- Accuracy: % of valid records
  accuracy = (p_valid::DECIMAL / p_total::DECIMAL) * 100;

  -- Completeness: % without missing required fields
  completeness = ((p_total - p_missing)::DECIMAL / p_total::DECIMAL) * 100;

  -- Uniqueness: % without duplicates
  uniqueness = ((p_total - p_duplicate)::DECIMAL / p_total::DECIMAL) * 100;

  -- Overall: weighted average (accuracy 50%, completeness 30%, uniqueness 20%)
  overall = (accuracy * 0.5) + (completeness * 0.3) + (uniqueness * 0.2);

  RETURN overall;
END;
$$ LANGUAGE plpgsql;

-- Function to log sync start
CREATE OR REPLACE FUNCTION log_sync_start(
  p_source_id UUID,
  p_sync_type TEXT,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_sync_id UUID;
BEGIN
  INSERT INTO sync_history (source_id, sync_type, status, started_at, metadata)
  VALUES (p_source_id, p_sync_type, 'running', NOW(), p_metadata)
  RETURNING id INTO v_sync_id;

  RETURN v_sync_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log sync completion
CREATE OR REPLACE FUNCTION log_sync_complete(
  p_sync_id UUID,
  p_status TEXT,
  p_records_fetched INTEGER DEFAULT 0,
  p_records_inserted INTEGER DEFAULT 0,
  p_records_updated INTEGER DEFAULT 0,
  p_records_deleted INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
  v_duration INTEGER;
BEGIN
  -- Get start time
  SELECT started_at INTO v_started_at
  FROM sync_history
  WHERE id = p_sync_id;

  -- Calculate duration
  v_duration = EXTRACT(EPOCH FROM (NOW() - v_started_at)) * 1000;

  -- Update sync record
  UPDATE sync_history
  SET
    status = p_status,
    completed_at = NOW(),
    duration_ms = v_duration,
    records_fetched = p_records_fetched,
    records_inserted = p_records_inserted,
    records_updated = p_records_updated,
    records_deleted = p_records_deleted,
    error_message = p_error_message
  WHERE id = p_sync_id;

  -- Update source last_successful_fetch if successful
  IF p_status = 'success' THEN
    UPDATE data_sources
    SET
      last_successful_fetch = NOW(),
      consecutive_failures = 0
    WHERE id = (SELECT source_id FROM sync_history WHERE id = p_sync_id);
  ELSE
    -- Increment failure counter
    UPDATE data_sources
    SET consecutive_failures = consecutive_failures + 1
    WHERE id = (SELECT source_id FROM sync_history WHERE id = p_sync_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. VIEWS FOR MONITORING
-- ============================================================================

-- View: Recent sync activity
CREATE OR REPLACE VIEW v_recent_syncs AS
SELECT
  sh.id,
  ds.name AS source_name,
  ds.category,
  sh.sync_type,
  sh.status,
  sh.started_at,
  sh.duration_ms,
  sh.records_fetched,
  sh.records_inserted + sh.records_updated + sh.records_deleted AS records_modified,
  sh.error_message
FROM sync_history sh
JOIN data_sources ds ON sh.source_id = ds.id
ORDER BY sh.started_at DESC
LIMIT 100;

-- View: Source health summary
CREATE OR REPLACE VIEW v_source_health AS
SELECT
  ds.id,
  ds.name,
  ds.category,
  ds.is_official,
  ds.is_active,
  ds.last_successful_fetch,
  ds.consecutive_failures,
  ds.reliability_score,
  COUNT(sh.id) FILTER (WHERE sh.status = 'success' AND sh.created_at > NOW() - INTERVAL '7 days') AS successful_syncs_7d,
  COUNT(sh.id) FILTER (WHERE sh.status = 'failed' AND sh.created_at > NOW() - INTERVAL '7 days') AS failed_syncs_7d,
  AVG(sh.duration_ms) FILTER (WHERE sh.created_at > NOW() - INTERVAL '7 days') AS avg_duration_ms_7d
FROM data_sources ds
LEFT JOIN sync_history sh ON ds.id = sh.source_id
GROUP BY ds.id
ORDER BY ds.category, ds.name;

-- View: Critical changes needing notification
CREATE OR REPLACE VIEW v_critical_changes AS
SELECT
  dc.id,
  dc.entity_type,
  dc.entity_id,
  dc.change_type,
  dc.field_name,
  dc.old_value,
  dc.new_value,
  dc.significance,
  dc.created_at,
  ds.name AS source_name
FROM data_changes dc
JOIN sync_history sh ON dc.sync_history_id = sh.id
JOIN data_sources ds ON sh.source_id = ds.id
WHERE dc.significance IN ('critical', 'high')
  AND dc.notified = false
ORDER BY dc.created_at DESC;

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Data sync infrastructure created successfully!';
  RAISE NOTICE '📊 Tables created: data_sources, sync_history, data_changes, data_quality_metrics, content_snapshots';
  RAISE NOTICE '🔍 Views created: v_recent_syncs, v_source_health, v_critical_changes';
  RAISE NOTICE '⚡ Functions created: calculate_data_quality_score, log_sync_start, log_sync_complete';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Review seeded data sources in data_sources table';
  RAISE NOTICE '2. Deploy Supabase Edge Functions for data syncing';
  RAISE NOTICE '3. Set up pg_cron for scheduled syncs';
  RAISE NOTICE '4. Monitor sync_history for errors';
END $$;
