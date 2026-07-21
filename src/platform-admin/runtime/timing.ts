/**
 * İSTEBUL Platform Admin — runtime süre ölçümü (PR-201A).
 *
 * Yeni dependency yoktur; `performance` yoksa `Date.now` kullanılır.
 */

export interface StageTimer {
  /** Monotonik başlangıç işareti */
  readonly mark: number;
  /** ISO başlangıç zamanı */
  readonly startedAt: string;
}

/**
 * Yüksek çözünürlüklü zaman damgası (ms).
 */
export function nowMs(): number {
  if (
    typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
  ) {
    return performance.now();
  }
  return Date.now();
}

export function startStageTimer(): StageTimer {
  return {
    mark: nowMs(),
    startedAt: new Date().toISOString()
  };
}

export function endStageTimer(timer: StageTimer): {
  endedAt: string;
  durationMs: number;
} {
  const endedAt = new Date().toISOString();
  const durationMs = Math.max(0, Math.round(nowMs() - timer.mark));
  return { endedAt, durationMs };
}
