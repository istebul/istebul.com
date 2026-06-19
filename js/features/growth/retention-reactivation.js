/**
 * P5.4 — Reactivation: deep links, UTM winback, lifecycle enroll.
 */
import { readStorageRaw, writeStorageRaw } from '../../core/storage-keys.js';
import { analytics } from '../../core/analytics.js';
import { trackGrowth } from './growth-engine.js';
import { enrollReactivationLtv } from '../lifecycle/lifecycle-client.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { listSavedDecisions } from './retention-saved-decisions.js';

const REACTIVATION_KEY = 'istebul_reactivation_handled';

/**
 * @param {URLSearchParams} [params]
 */
export function parseReactivationContext(params = new URLSearchParams(window.location?.search || '')) {
  const campaign = params.get('utm_campaign') || params.get('reactivate') || '';
  const isReactivation =
    campaign.includes('reactivation') ||
    campaign === 'inactive_users' ||
    campaign === 'retention_campaigns' ||
    params.get('utm_medium') === 'reactivation';

  if (!isReactivation) return null;

  return {
    campaign,
    content: params.get('utm_content') || '',
    decisionId: params.get('decision_id') || params.get('saved_decision') || null,
    path: params.get('return_to') || null
  };
}

function sessionHandled(key) {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function markHandled(key) {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
}

/**
 * Handle reactivation landing once per session.
 */
export function handleReactivationLanding(ctx) {
  if (!ctx || typeof window === 'undefined') return;

  const dedupe = `${REACTIVATION_KEY}:${ctx.campaign}`;
  if (sessionHandled(dedupe)) return;

  markHandled(dedupe);

  if (analytics.hasConsent()) {
    trackGrowth(
      'retention_reactivation_land',
      {
        campaign: ctx.campaign,
        decision_id: ctx.decisionId,
        has_saved_decision: Boolean(ctx.decisionId)
      },
      { funnel: 'retention', funnel_step: 'reactivation_land' }
    );
  }

  if (ctx.decisionId) {
    const saved = listSavedDecisions().find((s) => s.id === ctx.decisionId);
    if (saved?.revisitPath && !ctx.path) {
      try {
        window.history.replaceState({}, '', saved.revisitPath);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * @param {Record<string, unknown>} [meta]
 */
export async function enrollReactivationLifecycle(meta = {}) {
  const email = meta.email || readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL);
  return enrollReactivationLtv({
    email,
    user_id: meta.user_id,
    marketing_consent: meta.marketing_consent,
    days_inactive: meta.days_inactive,
    engagement_score: meta.engagement_score,
    saved_decisions_count: meta.saved_decisions_count,
    trigger_source: 'retention_reactivation'
  });
}
