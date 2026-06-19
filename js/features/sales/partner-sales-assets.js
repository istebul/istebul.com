/**
 * P6 — Outbound sales assets (email / LinkedIn templates).
 */
import { escapeHtml } from '../../core/dom-safe.js';
import { buildOfferApplicationUrl, buildQuoteRequestUrl } from '../partner/partner-offers.js';
import { buildOnboardingUrl } from '../partner/partner-platform.js';

let outboundCache = null;

async function loadOutboundData() {
  if (outboundCache) return outboundCache;
  try {
    const res = await fetch('/data/sales/outbound-sequences.json');
    outboundCache = res.ok ? await res.json() : { sequences: [], defaults: {} };
  } catch {
    outboundCache = { sequences: [], defaults: {} };
  }
  return outboundCache;
}

/**
 * @param {Record<string, string>} vars
 * @param {string} template
 */
export function interpolateOutboundTemplate(template, vars = {}) {
  let out = String(template || '');
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
  }
  return out;
}

/**
 * @param {string} sequenceId
 * @param {string} stepId
 * @param {Record<string, string>} [vars]
 */
export async function getOutboundStep(sequenceId, stepId, vars = {}) {
  const data = await loadOutboundData();
  const seq = (data.sequences || []).find((s) => s.id === sequenceId);
  const step = seq?.steps?.find((s) => s.id === stepId);
  if (!step) return null;

  const merged = { ...(data.defaults || {}), ...vars };
  return {
    sequenceId,
    stepId,
    channel: seq.channel,
    subject: step.subject ? interpolateOutboundTemplate(step.subject, merged) : null,
    body: interpolateOutboundTemplate(step.body, merged)
  };
}

export function buildPartnerOutboundUtm(extra = {}) {
  const params = new URLSearchParams({
    utm_source: 'sales',
    utm_medium: 'outbound',
    utm_campaign: 'partner_ae',
    ...extra
  });
  return params.toString();
}

/**
 * @param {object} ctx
 */
export function buildOutboundVarsForApplication(ctx = {}) {
  const origin = ctx.origin || 'https://www.istebul.com';
  const tier = ctx.billing_plan || ctx.tier || 'growth';
  const token = ctx.onboarding_token;
  return {
    company: ctx.company_name || 'Firmanız',
    contact_name: ctx.contact_name || 'Merhaba',
    tier: String(tier),
    apply_link: buildOfferApplicationUrl(tier, origin),
    quote_link: buildQuoteRequestUrl(tier, origin),
    docs_link: `${origin}/partner-docs.html?${buildPartnerOutboundUtm({ utm_content: 'docs' })}`,
    onboarding_link: token ? buildOnboardingUrl(token, ctx.onboarding_step || 2) : `${origin}/partner-basvuru.html`,
    booking_link: `${origin}/iletisim.html?${buildPartnerOutboundUtm({ utm_content: 'demo' })}`,
    onboarding_step: String(ctx.onboarding_step || 1)
  };
}

/**
 * @param {string} sequenceId
 * @param {object} application
 */
export async function renderOutboundSequenceHtml(sequenceId, application = {}) {
  const data = await loadOutboundData();
  const seq = (data.sequences || []).find((s) => s.id === sequenceId);
  if (!seq) return '<p class="text-muted">Sequence bulunamadı.</p>';

  const vars = buildOutboundVarsForApplication(application);
  const steps = await Promise.all(
    (seq.steps || []).map(async (step) => {
      const rendered = await getOutboundStep(sequenceId, step.id, vars);
      return { ...step, rendered };
    })
  );

  return `
    <div class="ib-sales-outbound-seq" data-sequence="${escapeHtml(sequenceId)}">
      <h4>${escapeHtml(seq.name)} <span class="ib-sales-tag">${escapeHtml(seq.channel)}</span></h4>
      ${steps
        .map(
          (s) => `
        <details class="ib-sales-outbound-step">
          <summary>Gün +${s.delayDays} · ${escapeHtml(s.id)}</summary>
          ${s.rendered?.subject ? `<p><strong>Konu:</strong> ${escapeHtml(s.rendered.subject)}</p>` : ''}
          <pre class="ib-sales-outbound-body">${escapeHtml(s.rendered?.body || '')}</pre>
          <button type="button" class="btn btn-ghost btn-sm" data-sales-copy-outbound="${escapeHtml(sequenceId)}:${escapeHtml(s.id)}">Kopyala</button>
        </details>`
        )
        .join('')}
    </div>`;
}
