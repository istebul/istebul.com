/**
 * Outcome signal capture — shared rules (browser + unit tests).
 * Server mirror: supabase/functions/_shared/outcome-capture.ts
 */

export const OUTCOME_SIGNAL_TYPES = Object.freeze([
  'vehicle_recommended_selected',
  'lead_closed',
  'partner_sale',
  'financing_accepted',
  'user_satisfaction',
  'recommendation_usefulness',
  'confidence_accuracy',
  'lead_submitted'
]);

export const OUTCOME_SIGNAL_SOURCES = Object.freeze(['user', 'partner', 'feedback', 'crm']);

const CLIENT_ALLOWED_TYPES = new Set([
  'vehicle_recommended_selected',
  'financing_accepted',
  'user_satisfaction',
  'recommendation_usefulness',
  'confidence_accuracy'
]);

const BLOCKED_PROPERTY_KEYS = new Set([
  'email',
  'phone',
  'contact_name',
  'name',
  'full_name',
  'address',
  'tc',
  'tckn',
  'password',
  'iban',
  'notes'
]);

export function isClientOutcomeSignalType(type) {
  return CLIENT_ALLOWED_TYPES.has(String(type || ''));
}

export function sanitizeOutcomeProperties(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    const k = String(key).toLowerCase().slice(0, 48);
    if (BLOCKED_PROPERTY_KEYS.has(k)) continue;
    if (value == null) continue;

    if (typeof value === 'number' && Number.isFinite(value)) {
      out[k] = Math.round(value * 1000) / 1000;
      continue;
    }
    if (typeof value === 'boolean') {
      out[k] = value;
      continue;
    }
    if (typeof value === 'string') {
      out[k] = value.slice(0, 120);
      continue;
    }
  }

  return out;
}

const PARTNER_WIN = new Set(['won', 'paid', 'closed', 'delivered', 'purchased']);
const PARTNER_FUNDED = new Set(['funded']);
const PARTNER_LOST = new Set(['lost', 'rejected']);

export function mapPartnerStatusToSignals(partnerStatus) {
  const status = String(partnerStatus || '').toLowerCase();
  const signals = [];

  if (PARTNER_WIN.has(status)) {
    signals.push({ signal_type: 'partner_sale', signal_source: 'partner' });
    signals.push({ signal_type: 'lead_closed', signal_source: 'partner', properties: { outcome: 'won' } });
  } else if (PARTNER_FUNDED.has(status)) {
    signals.push({ signal_type: 'financing_accepted', signal_source: 'partner' });
    signals.push({ signal_type: 'partner_sale', signal_source: 'partner' });
    signals.push({ signal_type: 'lead_closed', signal_source: 'partner', properties: { outcome: 'won' } });
  } else if (PARTNER_LOST.has(status)) {
    signals.push({ signal_type: 'lead_closed', signal_source: 'partner', properties: { outcome: 'lost' } });
  }

  return signals;
}

export function mapCrmLeadUpdateSignals(values = {}) {
  const signals = [];
  const status = String(values.status || '').toLowerCase();
  const partnerStatus = String(values.partner_status || '').toLowerCase();

  if (status === 'won' || status === 'lost') {
    signals.push({
      signal_type: 'lead_closed',
      signal_source: 'crm',
      properties: { outcome: status, via: 'status' }
    });
  }

  if (partnerStatus) {
    signals.push(...mapPartnerStatusToSignals(partnerStatus).map((s) => ({ ...s, signal_source: 'crm' })));
  }

  return dedupeSignals(signals);
}

export function mapDecisionFeedbackToSignals(feedbackType) {
  const type = String(feedbackType || '');
  const signals = [];

  if (type === 'helpful') {
    signals.push({
      signal_type: 'recommendation_usefulness',
      signal_source: 'feedback',
      properties: { rating: 'high' }
    });
    signals.push({
      signal_type: 'user_satisfaction',
      signal_source: 'feedback',
      properties: { score: 1 }
    });
  } else if (type === 'unclear') {
    signals.push({
      signal_type: 'recommendation_usefulness',
      signal_source: 'feedback',
      properties: { rating: 'low' }
    });
  } else if (type === 'contact') {
    signals.push({
      signal_type: 'user_satisfaction',
      signal_source: 'feedback',
      properties: { needs_support: true }
    });
  }

  return signals;
}

function dedupeSignals(signals) {
  const seen = new Set();
  const out = [];
  for (const row of signals) {
    const key = `${row.signal_type}|${row.signal_source}|${JSON.stringify(row.properties || {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function aggregateOutcomeSignalCounts(rows = []) {
  const byType = {};
  const bySource = {};

  for (const row of rows) {
    const t = String(row.signal_type || 'unknown');
    const s = String(row.signal_source || 'unknown');
    byType[t] = (byType[t] || 0) + 1;
    bySource[s] = (bySource[s] || 0) + 1;
  }

  return {
    total: rows.length,
    byType,
    bySource
  };
}

export function mergeMoatOutcomeSignals(dashboard, signalAgg) {
  return {
    ...dashboard,
    outcomeSignalTotal: signalAgg.total,
    outcomeSignalByType: signalAgg.byType,
    outcomeSignalBySource: signalAgg.bySource
  };
}
