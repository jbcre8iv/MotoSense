/**
 * Series Display Utilities
 *
 * Provides legally-safe terminology for racing series.
 *
 * IMPORTANT: Use generic terms to avoid trademark issues.
 * - "Supercross" and "Motocross" are generic sport terms (SAFE)
 * - "SuperMotocross" and "SMX" are trademarked brands (AVOID)
 */

export type SeriesCode = 'sx' | 'mx' | 'smx';

/**
 * Display names for racing series
 * Uses generic, legally-safe terminology
 */
export const SERIES_DISPLAY_NAMES = {
  sx: 'Supercross',
  mx: 'Motocross',
  smx: 'Championship', // Generic term for combined championship
} as const;

/**
 * Full display names (more descriptive)
 */
export const SERIES_DISPLAY_NAMES_FULL = {
  sx: 'Supercross',
  mx: 'Motocross',
  smx: 'Championship Series', // Descriptive but generic
} as const;

/**
 * Display names for standings context
 */
export const SERIES_STANDINGS_LABELS = {
  sx: 'Supercross Standings',
  mx: 'Motocross Standings',
  smx: 'Championship Standings',
} as const;

/**
 * Display names for round/event context
 */
export const SERIES_ROUND_LABELS = {
  sx: 'Supercross Round',
  mx: 'Motocross Round',
  smx: 'Championship Round',
} as const;

/**
 * Get display name for a series code
 * @param series - Series code ('sx', 'mx', 'smx')
 * @param full - Whether to use full descriptive name
 * @returns Legally-safe display name
 */
export function getSeriesDisplayName(series: SeriesCode | string, full: boolean = false): string {
  const seriesCode = series as SeriesCode;

  if (full) {
    return SERIES_DISPLAY_NAMES_FULL[seriesCode] || 'Racing Event';
  }

  return SERIES_DISPLAY_NAMES[seriesCode] || 'Racing Event';
}

/**
 * Get standings label for a series
 * @param series - Series code
 * @returns Label for standings screen
 */
export function getSeriesStandingsLabel(series: SeriesCode | string): string {
  const seriesCode = series as SeriesCode;
  return SERIES_STANDINGS_LABELS[seriesCode] || 'Standings';
}

/**
 * Get round label for a series
 * @param series - Series code
 * @param roundNumber - Round number (optional)
 * @returns Label for race/round
 */
export function getSeriesRoundLabel(series: SeriesCode | string, roundNumber?: number): string {
  const seriesCode = series as SeriesCode;
  const baseLabel = SERIES_ROUND_LABELS[seriesCode] || 'Round';

  if (roundNumber) {
    return `${baseLabel} ${roundNumber}`;
  }

  return baseLabel;
}

/**
 * Get filter label for series selection
 * @param series - Series code or 'all'
 * @returns Label for filter button
 */
export function getSeriesFilterLabel(series: SeriesCode | string | 'all'): string {
  if (series === 'all') {
    return 'All Events';
  }

  const seriesCode = series as SeriesCode;

  switch (seriesCode) {
    case 'sx':
      return 'Supercross Only';
    case 'mx':
      return 'Motocross Only';
    case 'smx':
      return 'Championship Only';
    default:
      return 'All Events';
  }
}

/**
 * Get description for series
 * @param series - Series code
 * @returns Description text
 */
export function getSeriesDescription(series: SeriesCode | string): string {
  const seriesCode = series as SeriesCode;

  switch (seriesCode) {
    case 'sx':
      return 'Indoor stadium racing series';
    case 'mx':
      return 'Outdoor motocross racing series';
    case 'smx':
      return 'Combined championship playoff series';
    default:
      return 'Professional racing series';
  }
}

/**
 * Get icon name for series (for use with icon libraries)
 * @param series - Series code
 * @returns Icon identifier
 */
export function getSeriesIcon(series: SeriesCode | string): string {
  const seriesCode = series as SeriesCode;

  switch (seriesCode) {
    case 'sx':
      return 'home-outline'; // Indoor
    case 'mx':
      return 'sunny-outline'; // Outdoor
    case 'smx':
      return 'trophy-outline'; // Championship
    default:
      return 'calendar-outline';
  }
}

/**
 * Get color theme for series
 * @param series - Series code
 * @returns Color hex code
 */
export function getSeriesColor(series: SeriesCode | string): string {
  const seriesCode = series as SeriesCode;

  switch (seriesCode) {
    case 'sx':
      return '#00d9ff'; // Cyan (indoor/stadium)
    case 'mx':
      return '#ff6b35'; // Orange (outdoor/dirt)
    case 'smx':
      return '#ffd700'; // Gold (championship)
    default:
      return '#8892b0'; // Default gray
  }
}

// Example usage in components:
/*
import { getSeriesDisplayName, getSeriesRoundLabel } from '@/utils/seriesDisplay';

// In component:
<Text>{getSeriesDisplayName(race.series)}</Text>
// Output: "Supercross" or "Motocross" or "Championship"

<Text>{getSeriesRoundLabel(race.series, race.round)}</Text>
// Output: "Supercross Round 5" or "Championship Round 1"
*/
