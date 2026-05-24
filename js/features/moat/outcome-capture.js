import { analytics } from '../../core/analytics.js';
import { readDecisionSession } from './moat-session.js';
import { buildSegmentKey } from './scoring-intelligence.js';
import { isClientOutcomeSignalType, sanitizeOutcomeProperties } from './outcome-capture-shared.js';

/**
 * Client-side outcome signal capture (user events only).
 * Partner/CRM/feedback signals are recorded server-side.
 */

export async function captureOutcomeSignal(signalType, context = {}) {
  if (!isClientOutcomeSignalType(signalType)) return { ok: false };

  const baseUrl = (window.__env?.SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = window.__env?.SUPABASE_ANON_KEY || '';
  const session = readDecisionSession();

  const payload = {
    signal_type: signalType,
    decision_session_id: context.decisionSessionId || session.id,
    lead_id: context.leadId || null,
    segment_key: context.segmentKey || buildSegmentKey(context.form || {}),
    match_score: context.matchScore ?? session.topMatchScore ?? null,
    confidence_tier: context.confidenceTier || session.confidenceTier || null,
    surface: context.surface || 'auto',
    vehicle_slug: context.vehicle ? String(context.vehicle).slice(0, 80) : null,
    interest_type: context.interestType || null,
    client_event_id: context.clientEventId || null,
    form: context.form || {},
    properties: sanitizeOutcomeProperties(context.properties || {})
  };

  let responseOk = false;
  if (baseUrl && anonKey) {
    const res = await fetch(`${baseUrl}/functions/v1/outcome-capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      },
      body: JSON.stringify(payload)
    }).catch(() => null);
    responseOk = Boolean(res?.ok);
  }

  analytics.track(
    `outcome_signal_${signalType}`,
    {
      decision_session_id: payload.decision_session_id,
      segment_key: payload.segment_key,
      match_score: payload.match_score
    },
    {
      category: 'decision',
      funnel: 'outcome_moat',
      funnel_step: signalType,
      force: false
    }
  );

  return { ok: responseOk };
}

export function captureVehicleRecommendedSelected(context = {}) {
  return captureOutcomeSignal('vehicle_recommended_selected', {
    ...context,
    clientEventId: context.clientEventId || `vehicle:${context.vehicle || 'unknown'}`
  });
}

export function captureFinancingAccepted(context = {}) {
  return captureOutcomeSignal('financing_accepted', {
    ...context,
    properties: {
      stage: context.stage || 'user_intent',
      ...(context.properties || {})
    },
    clientEventId: context.clientEventId || `finance:${context.vehicle || 'unknown'}`
  });
}

export function captureConfidenceAccuracy(context = {}) {
  return captureOutcomeSignal('confidence_accuracy', {
    ...context,
    properties: {
      perceived_tier: context.perceivedTier || null,
      stated_match: context.matchScore ?? null,
      ...(context.properties || {})
    }
  });
}
