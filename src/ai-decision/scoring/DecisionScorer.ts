import type { DecisionScore } from '../types.ts';

/** Named scorer surface for the Decision Engine. */
export class DecisionScorer {
  clamp = clampScore;
  rank = rankScores;
  band = bandFromPct;
  timeFactor = timeOfDayFactor;
  weekend = weekendFactor;
  build = buildScore;
}

/** Clamp score into [0, 100]. */
export function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function rankScores(scores: DecisionScore[], limit = 5): DecisionScore[] {
  return [...scores].sort((a, b) => b.score - a.score).slice(0, limit);
}

export function bandFromPct(pct: number): 'low' | 'medium' | 'high' {
  if (pct < 40) return 'low';
  if (pct < 75) return 'medium';
  return 'high';
}

/**
 * Heuristic time-of-day density factor (mock — no telemetry).
 * Peak dinner 19:00–21:00, lunch 12:00–14:00.
 */
export function timeOfDayFactor(time: string): number {
  const [hStr, mStr] = time.split(':');
  const minutes = Number(hStr || 0) * 60 + Number(mStr || 0);
  if (minutes >= 12 * 60 && minutes <= 14 * 60) return 0.75;
  if (minutes >= 19 * 60 && minutes <= 21 * 60) return 1;
  if (minutes >= 18 * 60 && minutes < 19 * 60) return 0.85;
  if (minutes > 21 * 60 && minutes <= 22 * 60) return 0.7;
  return 0.45;
}

export function weekendFactor(dateIso: string): number {
  const day = new Date(`${dateIso}T12:00:00`).getDay();
  return day === 0 || day === 6 ? 1.15 : 1;
}

export function buildScore(
  id: string,
  label: string,
  score: number,
  reasons: string[],
  meta?: Record<string, unknown>,
): DecisionScore {
  return {
    id,
    label,
    score: clampScore(score),
    reasons,
    meta,
  };
}
