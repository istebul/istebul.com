import { safeJsonParse } from '../../core/dom-safe.js';

const STORAGE_KEY = 'istebul_decision_session';

export function createDecisionSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ds_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateDecisionSession() {
  if (typeof sessionStorage === 'undefined') {
    return { id: createDecisionSessionId(), createdAt: new Date().toISOString() };
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? safeJsonParse(raw, null) : null;
    if (parsed?.id) return parsed;
  } catch {
    /* ignore */
  }

  const session = { id: createDecisionSessionId(), createdAt: new Date().toISOString() };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
  return session;
}

export function updateDecisionSession(patch = {}) {
  const current = getOrCreateDecisionSession();
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function readDecisionSession() {
  return getOrCreateDecisionSession();
}
