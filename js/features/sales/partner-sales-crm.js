/**
 * P6 — Partner AE CRM touches + scoring (P6.2 pipeline).
 */
import { analytics } from '../../core/analytics.js';
import {
  normalizePartnerCrmStatus,
  getPartnerCrmStageMeta,
  recommendCrmStageAction,
  computePartnerPipelineForecast,
  partnerCrmStatusOptions,
  getPartnerCrmWinProbability
} from './partner-crm-pipeline.js';

export {
  normalizePartnerCrmStatus,
  getPartnerCrmStageMeta,
  computePartnerPipelineForecast,
  computePartnerStageConversions,
  partnerCrmStatusOptions,
  getPartnerCrmWinProbability,
  isTerminalPartnerCrmStatus
} from './partner-crm-pipeline.js';

/** @deprecated Use partnerCrmStatusOptions — kept for imports */
export const PARTNER_AE_STAGES = partnerCrmStatusOptions().map((o) => ({
  id: o.value,
  label: o.label
}));

export const SALES_TOUCH_TYPES = Object.freeze([
  { id: 'outbound_email', label: 'Outbound e-posta' },
  { id: 'outbound_linkedin', label: 'LinkedIn' },
  { id: 'discovery_call', label: 'Keşif görüşmesi' },
  { id: 'demo', label: 'Demo' },
  { id: 'proposal_sent', label: 'Teklif gönderildi' },
  { id: 'follow_up', label: 'Takip' },
  { id: 'objection_handled', label: 'İtiraz yanıtlandı' },
  { id: 'pilot_started', label: 'Pilot başladı' },
  { id: 'negotiation', label: 'Müzakere' }
]);

export function getPartnerStageMeta(stageId) {
  return getPartnerCrmStageMeta(stageId);
}

/**
 * @param {object} app partner_applications row
 */
export function scorePartnerApplication(app = {}) {
  let score = 0;
  const stageId = normalizePartnerCrmStatus(app.status);
  const plan = String(app.billing_plan || 'pilot').toLowerCase();

  if (plan === 'enterprise') score += 40;
  else if (plan === 'growth') score += 28;
  else if (plan === 'starter') score += 18;
  else score += 8;

  score += Math.round((getPartnerCrmWinProbability(stageId) || 0) * 40);

  if (app.webhook_ready) score += 12;
  if (app.webhook_url_draft) score += 6;
  if (app.utm_source === 'sales') score += 8;
  if (stageId === 'pilot' && app.test_payload_verified) score += 10;

  const q = app.qualification_data || {};
  const volume = Number(q.monthly_lead_volume || q.lead_volume || 0);
  if (volume >= 100) score += 12;
  else if (volume >= 30) score += 6;

  return Math.min(100, score);
}

/**
 * @param {string} touchType
 * @param {Record<string, unknown>} meta
 */
export function logPartnerSalesTouch(touchType, meta = {}) {
  if (!analytics.hasConsent() && !meta.force) return;

  const stage = normalizePartnerCrmStatus(meta.stage || meta.status);

  analytics.track(
    'partner_sales_touch',
    {
      touch_type: touchType,
      application_id: meta.application_id,
      lead_id: meta.lead_id,
      stage,
      tier: meta.tier
    },
    {
      category: 'partner',
      funnel: 'partner_sales',
      funnel_step: touchType
    }
  );

  analytics.track(
    'growth_crm_touch',
    {
      touch_type: touchType,
      channel: 'partner_ae',
      crm_stage: stage,
      ...meta
    },
    {
      category: 'growth',
      funnel: 'crm',
      funnel_step: touchType
    }
  );
}

/**
 * @param {string} fromStatus
 * @param {string} toStatus
 * @param {Record<string, unknown>} meta
 */
export function logPartnerCrmStageChange(fromStatus, toStatus, meta = {}) {
  const from = normalizePartnerCrmStatus(fromStatus);
  const to = normalizePartnerCrmStatus(toStatus);

  analytics.track(
    'partner_crm_stage_change',
    {
      from_stage: from,
      to_stage: to,
      application_id: meta.application_id,
      win_probability: getPartnerCrmWinProbability(to)
    },
    {
      category: 'partner',
      funnel: 'partner_crm',
      funnel_step: to
    }
  );

}

/**
 * @param {string} sequenceId
 * @param {Record<string, unknown>} meta
 */
export function logOutboundSent(sequenceId, meta = {}) {
  analytics.track(
    'partner_outbound_sent',
    { sequence_id: sequenceId, ...meta },
    { category: 'partner', funnel: 'partner_sales', funnel_step: 'outbound' }
  );
  logPartnerSalesTouch('outbound_email', { ...meta, sequence_id: sequenceId });
}

/**
 * @param {object} app
 */
export function recommendNextSalesAction(app = {}) {
  const rec = recommendCrmStageAction(app);
  const score = scorePartnerApplication(app);
  return {
    action: rec.action,
    priority: rec.priority,
    score,
    stageId: rec.stageId,
    winProbability: rec.winProbability
  };
}
