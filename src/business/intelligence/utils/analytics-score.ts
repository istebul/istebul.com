import type { BusinessDataPoint } from '../types/raw-business-data';
import type { MetricTrendDirection } from '../types/business-metrics';

/** Clamp a score into an inclusive range. */
export function clampScore(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Percent change from first → last point in a series. */
export function seriesChangePercent(series: readonly BusinessDataPoint[]): number {
  if (series.length < 2) return 0;
  const first = series[0]?.value ?? 0;
  const last = series[series.length - 1]?.value ?? 0;
  if (first === 0) return last === 0 ? 0 : 100;
  return ((last - first) / Math.abs(first)) * 100;
}

export function directionFromDelta(
  delta: number,
  flatThreshold = 0.5
): MetricTrendDirection {
  if (Math.abs(delta) < flatThreshold) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

export function formatPercentDelta(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function roundDelta(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}
