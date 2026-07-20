/**
 * İSTEBUL Business Decision Engine — runtime süre ölçümü.
 */

export interface DecisionTiming {
  /** Başlangıç (ISO 8601) */
  startedAt: string;
  /** Bitiş (ISO 8601) */
  endedAt: string;
  /** Süre (ms) */
  durationMs: number;
}

export interface DecisionStageTimer {
  /** Monotonik başlangıç işareti */
  readonly mark: number;
  /** ISO başlangıç zamanı */
  readonly startedAt: string;
}

export function nowMs(): number {
  if (
    typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
  ) {
    return performance.now();
  }
  return Date.now();
}

export function startDecisionStageTimer(): DecisionStageTimer {
  return {
    mark: nowMs(),
    startedAt: new Date().toISOString()
  };
}

export function endDecisionStageTimer(timer: DecisionStageTimer): DecisionTiming {
  const endedAt = new Date().toISOString();
  return {
    startedAt: timer.startedAt,
    endedAt,
    durationMs: Math.max(0, Math.round(nowMs() - timer.mark))
  };
}
