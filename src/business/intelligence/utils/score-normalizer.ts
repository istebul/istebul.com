import { clampScore } from './analytics-score';

/**
 * Normalize an arbitrary numeric signal into a 0–100 score.
 * `neutral` maps to 50; `scale` controls sensitivity.
 */
export function normalizeToScore(
  value: number,
  options: { neutral?: number; scale?: number; invert?: boolean } = {}
): number {
  const neutral = options.neutral ?? 0;
  const scale = options.scale ?? 2;
  const raw = 50 + (value - neutral) * scale;
  const scored = options.invert ? 100 - raw : raw;
  return clampScore(Math.round(scored), 0, 100);
}

/** Map a 0–100 score to a health band. */
export function scoreToBand(
  score: number
): 'critical' | 'watch' | 'stable' | 'strong' {
  if (score < 40) return 'critical';
  if (score < 55) return 'watch';
  if (score < 75) return 'stable';
  return 'strong';
}
