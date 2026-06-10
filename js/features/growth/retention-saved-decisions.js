/**
 * P5.4 — Saved decisions for revisit & LTV (local + analytics).
 */
import { readStorageRaw, writeStorageRaw } from '../../core/storage-keys.js';
import { analytics } from '../../core/analytics.js';
import { trackGrowth } from './growth-engine.js';

const SAVED_KEY = 'istebul_saved_decisions';
const MAX_SAVED = 24;

const CATEGORY_REVISIT_PATHS = Object.freeze({
  auto: '/auto/',
  housing: '/konut/',
  travel: '/tatil/',
  finance: '/finans/',
  insurance: '/sigorta/',
  kasko: '/kasko/'
});

/**
 * @param {string} [userId]
 */
function storageKey(userId) {
  return userId ? `${SAVED_KEY}:${userId}` : SAVED_KEY;
}

function readList(key) {
  try {
    const raw = readStorageRaw(key);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * @param {object} snapshot
 */
export function saveDecisionSnapshot(snapshot = {}) {
  if (!snapshot.id && !snapshot.topVehicle) return null;

  const userId = snapshot.userId || null;
  const key = storageKey(userId);
  const entry = {
    id: snapshot.id || `dec_${Date.now()}`,
    savedAt: new Date().toISOString(),
    categoryId: snapshot.categoryId || 'auto',
    topVehicle: snapshot.topVehicle || snapshot.title || 'Karar',
    score: snapshot.score ?? null,
    summary: snapshot.summary || '',
    revisitPath:
      snapshot.revisitPath ||
      CATEGORY_REVISIT_PATHS[snapshot.categoryId] ||
      '/karar-asistani/',
    source: snapshot.source || 'auto_results'
  };

  const list = [entry, ...readList(key).filter((r) => r.id !== entry.id)].slice(0, MAX_SAVED);
  writeStorageRaw(key, JSON.stringify(list));

  if (analytics.hasConsent()) {
    trackGrowth(
      'retention_decision_saved',
      {
        decision_id: entry.id,
        category_id: entry.categoryId,
        has_score: entry.score != null
      },
      { funnel: 'retention', funnel_step: 'saved_decision' }
    );
  }

  return entry;
}

/**
 * @param {string} [userId]
 */
export function listSavedDecisions(userId) {
  return readList(storageKey(userId));
}

/**
 * @param {string} decisionId
 * @param {string} [userId]
 */
export function getSavedDecision(decisionId, userId) {
  return listSavedDecisions(userId).find((r) => r.id === decisionId) || null;
}

/**
 * @param {string} decisionId
 * @param {string} [userId]
 */
export function markDecisionRevisited(decisionId, userId) {
  const key = storageKey(userId);
  const list = readList(key).map((r) =>
    r.id === decisionId
      ? { ...r, lastRevisitedAt: new Date().toISOString(), revisitCount: (r.revisitCount || 0) + 1 }
      : r
  );
  writeStorageRaw(key, JSON.stringify(list));

  if (analytics.hasConsent()) {
    trackGrowth(
      'retention_decision_revisited',
      { decision_id: decisionId },
      { funnel: 'retention', funnel_step: 'revisit_saved' }
    );
  }
}
