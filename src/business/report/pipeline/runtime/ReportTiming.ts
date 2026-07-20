/**
 * İSTEBUL Business Report Engine — runtime süre ölçümü.
 */

export interface ReportTiming {
  /** Başlangıç (ISO 8601) */
  startedAt: string;
  /** Bitiş (ISO 8601) */
  endedAt: string;
  /** Süre (ms) */
  durationMs: number;
}

export interface ReportStageTimer {
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

export function startReportStageTimer(): ReportStageTimer {
  return {
    mark: nowMs(),
    startedAt: new Date().toISOString()
  };
}

export function endReportStageTimer(timer: ReportStageTimer): ReportTiming {
  const endedAt = new Date().toISOString();
  return {
    startedAt: timer.startedAt,
    endedAt,
    durationMs: Math.max(0, Math.round(nowMs() - timer.mark))
  };
}
