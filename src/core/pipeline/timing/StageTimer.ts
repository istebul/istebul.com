/**
 * İSTEBUL Core — shared pipeline stage timer (PR-901B).
 *
 * Runtime-neutral timing helpers. No `performance` polyfill dependency;
 * falls back to `Date.now` when `performance.now` is unavailable.
 */

/**
 * Mutable stage timer handle.
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

/**
 * Starts a stage timer.
 */
export function startStageTimer(): StageTimer {
  return {
    mark: nowMs(),
    startedAt: new Date().toISOString()
  };
}

/**
 * Ends a stage timer and returns duration metadata.
 */
export function endStageTimer(timer: StageTimer): {
  endedAt: string;
  durationMs: number;
} {
  const endedAt = new Date().toISOString();
  const durationMs = Math.max(0, Math.round(nowMs() - timer.mark));
  return { endedAt, durationMs };
}
