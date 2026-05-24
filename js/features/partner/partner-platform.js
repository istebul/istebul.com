/**
 * B2B partner platform — acquisition funnel, rate card, analytics helpers.
 */
import { analytics } from '../../core/analytics.js';

export const PARTNER_ROUTE_LABELS = Object.freeze({
  dealer_partner: 'Bayi / Galeri',
  finance_partner: 'Finansman',
  insurance_partner: 'Sigorta',
  premium_report: 'Premium rapor',
  general_sales: 'Genel satış'
});

/** Transparent CPL bands (TRY) — contracts finalize offline. */
export const PARTNER_RATE_CARD = Object.freeze([
  {
    id: 'pilot',
    name: 'Pilot',
    priceLabel: 'İlk 5 sıcak lead ücretsiz',
    description: 'Entegrasyon doğrulama; sonrası CPL veya aylık paket.',
    cplHint: null,
    features: ['Skorlanmış hot lead', 'Webhook veya manuel teslim', 'Teslimat logları']
  },
  {
    id: 'cpl',
    name: 'CPL — sıcak lead',
    priceLabel: '₺5.000+ / sıcak lead',
    description: 'Kategori ve bölgeye göre netleşir; callback ile kazanım bildirimi.',
    cplHint: 5000,
    features: ['Hot / very_hot öncelik', 'HMAC webhook', 'Retry & failover', 'SLA hedefi 15 dk']
  },
  {
    id: 'subscription',
    name: 'Aylık kapasite',
    priceLabel: 'Özel teklif',
    description: 'Günlük lead kotası + öncelik ağırlığı; yüksek hacimli galeri ağları.',
    cplHint: null,
    features: ['Günlük cap yönetimi', 'Dedicated route', 'Öncelikli destek']
  },
  {
    id: 'enterprise',
    name: 'Enterprise API',
    priceLabel: 'Platform + entegrasyon',
    description: 'API, webhook, çoklu endpoint, özel SLA ve raporlama.',
    cplHint: null,
    features: ['Çoklu endpoint', 'Özel failover', 'Güvenlik incelemesi', 'Beyaz etiket opsiyonu']
  }
]);

export const PARTNER_FUNNEL_EVENTS = Object.freeze({
  LANDING_VIEW: 'partner_landing_view',
  APPLICATION_START: 'partner_application_start',
  APPLICATION_SUBMIT: 'partner_application_submit',
  DOCS_VIEW: 'partner_docs_view',
  ONBOARDING_VIEW: 'partner_onboarding_view',
  WEBHOOK_DRAFT_SAVED: 'partner_webhook_draft_saved'
});

function sessionKey(step) {
  return `ib_partner_funnel:${step}`;
}

export function trackPartnerFunnel(eventName, properties = {}, options = {}) {
  if (!analytics.hasConsent() && !options.force) return;

  const once = options.oncePerSession !== false;
  if (once) {
    try {
      if (sessionStorage.getItem(sessionKey(eventName))) return;
      sessionStorage.setItem(sessionKey(eventName), '1');
    } catch {
      /* ignore */
    }
  }

  analytics.track(eventName, properties, {
    category: 'partner',
    funnel: 'partner_acquisition',
    funnel_step: eventName
  });
}

export function capturePartnerAttribution() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    ref: params.get('ref')
  };
}

export function buildOnboardingUrl(token) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.istebul.com';
  return `${base}/partner-onboarding.html?token=${encodeURIComponent(token)}`;
}

export function renderRateCardHtml() {
  return `
    <div class="ib-partner-rate-grid" role="list">
      ${PARTNER_RATE_CARD.map((plan) => `
        <article class="ib-partner-rate-card${plan.id === 'pilot' ? ' ib-partner-rate-card--featured' : ''}" role="listitem">
          <span class="ib-partner-rate-kicker">${escapeHtml(plan.name)}</span>
          <h3>${escapeHtml(plan.priceLabel)}</h3>
          <p>${escapeHtml(plan.description)}</p>
          <ul>${plan.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
        </article>
      `).join('')}
    </div>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
