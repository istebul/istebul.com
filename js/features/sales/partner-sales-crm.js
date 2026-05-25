/**
 * P6 — Partner AE pipeline + CRM touch logging.
 */
import { analytics } from '../../core/analytics.js';

export const PARTNER_AE_STAGES = Object.freeze([
  { id: 'new', label: 'Yeni', nextAction: 'İlk outbound' },
  { id: 'contacted', label: 'İletişim', nextAction: 'Keşif / demo' },
  { id: 'qualified', label: 'Uygun', nextAction: 'Teklif + pilot' },
  { id: 'integrating', label: 'Entegrasyon', nextAction: 'Webhook test hızlandır' },
  { id: 'live', label: 'Canlı', nextAction: 'Upsell / kapasite' },
  { id: 'rejected', label: 'Red', nextAction: 'Nurture veya kapat' }
]);

export const SALES_TOUCH_TYPES = Object.freeze([
  { id: 'outbound_email', label: 'Outbound e-posta' },
  { id: 'outbound_linkedin', label: 'LinkedIn' },
  { id: 'discovery_call', label: 'Keşif görüşmesi' },
  { id: 'demo', label: 'Demo' },
  { id: 'proposal_sent', label: 'Teklif gönderildi' },
  { id: 'follow_up', label: 'Takip' },
  { id: 'objection_handled', label: 'İtiraz yanıtlandı' }
]);

/**
 * @param {string} stageId
 */
export function getPartnerStageMeta(stageId) {
  return PARTNER_AE_STAGES.find((s) => s.id === stageId) || { id: stageId, label: stageId, nextAction: '—' };
}

/**
 * @param {object} app partner_applications row
 */
export function scorePartnerApplication(app = {}) {
  let score = 0;
  const plan = String(app.billing_plan || 'pilot').toLowerCase();
  if (plan === 'enterprise') score += 40;
  else if (plan === 'growth') score += 28;
  else if (plan === 'starter') score += 18;
  else score += 8;

  if (app.webhook_ready) score += 15;
  if (app.webhook_url_draft) score += 8;
  if (app.utm_source === 'sales') score += 10;
  if (['qualified', 'integrating'].includes(app.status)) score += 12;
  if (app.status === 'live') score += 25;

  const q = app.qualification_data || {};
  const volume = Number(q.monthly_lead_volume || q.lead_volume || 0);
  if (volume >= 100) score += 15;
  else if (volume >= 30) score += 8;

  return Math.min(100, score);
}

/**
 * @param {string} touchType
 * @param {Record<string, unknown>} meta
 */
export function logPartnerSalesTouch(touchType, meta = {}) {
  if (!analytics.hasConsent() && !meta.force) return;

  analytics.track(
    'partner_sales_touch',
    {
      touch_type: touchType,
      application_id: meta.application_id,
      lead_id: meta.lead_id,
      stage: meta.stage,
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
  const stage = getPartnerStageMeta(app.status);
  const score = scorePartnerApplication(app);
  if (app.status === 'integrating' && !app.webhook_ready) {
    return { action: 'Onboarding link gönder + webhook test', priority: 'high', score };
  }
  if (app.status === 'new') {
    return { action: stage.nextAction, priority: 'high', score };
  }
  if (app.status === 'qualified') {
    return { action: 'Teklif (quote) linki + pilot hatırlatma', priority: 'medium', score };
  }
  return { action: stage.nextAction, priority: score >= 50 ? 'medium' : 'low', score };
}
