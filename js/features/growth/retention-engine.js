/**
 * Retention engine — engagement scoring + return-visit signals for lifecycle loops.
 */
import { analytics } from '../../core/analytics.js';
import { readStorageRaw, writeStorageRaw } from '../../core/storage-keys.js';
import { trackGrowth } from './growth-engine.js';
const LAST_VISIT_KEY = 'istebul_last_visit_at';
const ENGAGEMENT_KEY = 'istebul_session_engagement';

function readEngagement() {
  try {
    const raw = readStorageRaw(ENGAGEMENT_KEY);
    return raw ? JSON.parse(raw) : { score: 0, actions: [] };
  } catch {
    return { score: 0, actions: [] };
  }
}

function writeEngagement(state) {
  try {
    writeStorageRaw(ENGAGEMENT_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function recordEngagement(action, weight = 1) {
  const state = readEngagement();
  if (!state.actions.includes(action)) {
    state.actions.push(action);
    state.score += weight;
    writeEngagement(state);
  }

  if (analytics.hasConsent()) {
    trackGrowth('retention_engagement', { action, score: state.score }, {
      funnel: 'retention',
      funnel_step: action
    });
  }
}

function daysBetween(isoA, isoB) {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.floor(Math.abs(b - a) / 86400000);
}

export function initRetentionEngine() {
  if (typeof window === 'undefined') return;

  const now = new Date().toISOString();
  const lastVisit = readStorageRaw(LAST_VISIT_KEY);

  if (lastVisit && analytics.hasConsent()) {
    const gap = daysBetween(lastVisit, now);
    const dedupeKey = `ret_return:${gap}`;
    let already = false;
    try {
      already = Boolean(sessionStorage.getItem(dedupeKey));
      if (!already) sessionStorage.setItem(dedupeKey, '1');
    } catch {
      /* ignore */
    }
    if (gap >= 1 && !already) {
      trackGrowth('retention_return_visit', { days_since_last: gap }, {
        funnel: 'retention',
        funnel_step: 'return'
      });
    }
  }

  writeStorageRaw(LAST_VISIT_KEY, now);

  document.addEventListener('routeChanged', () => {
    recordEngagement('route_change', 1);
  });

  document.addEventListener('cookieConsentAccepted', () => {
    if (lastVisit) {
      const gap = daysBetween(lastVisit, new Date().toISOString());
      if (gap >= 1) {
        trackGrowth('retention_return_visit', { days_since_last: gap }, {
          funnel: 'retention',
          funnel_step: 'return'
        });
      }
    }
  });
}
