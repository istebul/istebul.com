import type { MetricTrendDirection } from '../types/business-metrics';
import { directionFromDelta } from './analytics-score';

export interface TrendCalculation {
  direction: MetricTrendDirection;
  delta: number;
  label: string;
}

/**
 * Calculate a simple trend from a delta (percent or absolute).
 * Does not mutate inputs; returns a plain result object.
 */
export function calculateTrend(
  delta: number,
  flatThreshold = 0.5,
  labelPrefix = 'Trend'
): TrendCalculation {
  const direction = directionFromDelta(delta, flatThreshold);
  const abs = Math.abs(delta);
  let label: string;
  if (direction === 'flat') {
    label = `${labelPrefix}: yatay`;
  } else if (direction === 'up') {
    label = `${labelPrefix}: yükseliş (${abs.toFixed(1)})`;
  } else {
    label = `${labelPrefix}: düşüş (${abs.toFixed(1)})`;
  }
  return { direction, delta, label };
}

/**
 * Compare previous → current numeric values into a trend.
 */
export function calculateTrendFromValues(
  previous: number,
  current: number,
  flatThreshold = 0.5,
  labelPrefix = 'Trend'
): TrendCalculation {
  return calculateTrend(current - previous, flatThreshold, labelPrefix);
}

export default calculateTrend;
