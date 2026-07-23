/**
 * EPIC-570 — local timing helpers (keeps business tsconfig rootDir intact).
 */

export interface StageTimer {
  startedAt: string;
  startedMs: number;
}

export function nowMs(): number {
  return Date.now();
}

export function startStageTimer(): StageTimer {
  const startedMs = nowMs();
  return {
    startedAt: new Date(startedMs).toISOString(),
    startedMs
  };
}

export function endStageTimer(timer: StageTimer): { endedAt: string; durationMs: number } {
  const endedMs = nowMs();
  return {
    endedAt: new Date(endedMs).toISOString(),
    durationMs: Math.max(0, Math.round(endedMs - timer.startedMs))
  };
}
