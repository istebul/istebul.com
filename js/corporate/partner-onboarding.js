import { initCorporateUx } from '../runtime/corporate-ux.js';
import { PARTNER_FUNNEL_EVENTS, PARTNER_ROUTE_LABELS, trackPartnerFunnel } from '../features/partner/partner-platform.js';

const STATUS_LABELS = {
  lead: 'Lead',
  qualified: 'Qualified',
  demo: 'Demo / ihtiyaç',
  pilot: 'Pilot entegrasyon',
  negotiation: 'Müzakere',
  won: 'Won — canlı',
  lost: 'Lost',
  new: 'Lead',
  contacted: 'Lead',
  integrating: 'Pilot',
  live: 'Won',
  rejected: 'Lost'
};

function getToken() {
  return new URLSearchParams(window.location.search).get('token') || '';
}

async function hubRequest(body) {
  const baseUrl = (window.__env?.SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = window.__env?.SUPABASE_ANON_KEY || '';
  if (!baseUrl || !anonKey) throw new Error('no_config');

  const res = await fetch(`${baseUrl}/functions/v1/partner-onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'request_failed'), { status: res.status });
  return data;
}

function normalizeStatus(status) {
  const map = {
    new: 'lead',
    contacted: 'lead',
    integrating: 'pilot',
    live: 'won',
    rejected: 'lost'
  };
  return map[status] || status || 'lead';
}

function renderSteps(status) {
  const order = ['lead', 'qualified', 'demo', 'pilot', 'negotiation', 'won'];
  const normalized = normalizeStatus(status);
  const idx = order.indexOf(normalized);
  return order.map((step, i) => {
    let cls = '';
    if (normalized === 'lost') cls = i <= 0 ? 'is-done' : '';
    else if (idx >= 0 && i < idx) cls = 'is-done';
    else if (i === idx) cls = 'is-current';
    return `<span class="${cls}">${STATUS_LABELS[step] || step}</span>`;
  }).join('');
}

function renderPanel(data) {
  const app = data.application;
  const root = document.getElementById('partner-onboarding-root');
  if (!root) return;

  root.innerHTML = `
    <p class="kicker">Partner onboarding</p>
    <h1>${app.company_name}</h1>
    <p class="lead">Merhaba ${app.contact_name} — başvuru durumunuz ve webhook kurulum adımları.</p>

    <div class="ib-partner-onboarding-steps" aria-label="Başvuru durumu">
      ${renderSteps(app.status)}
    </div>

    <div class="partner-hero-card" style="margin:1.5rem 0;">
      <p><strong>Kategori:</strong> ${PARTNER_ROUTE_LABELS[app.category] || app.category}</p>
      <p><strong>Plan:</strong> ${app.billing_plan || 'pilot'}</p>
      ${data.endpoint ? `<p><strong>Endpoint:</strong> ${data.endpoint.name} · ${data.endpoint.is_active ? 'aktif' : 'pasif'} · ${data.endpoint.health_status || 'healthy'}</p>` : ''}
      ${app.webhook_url_draft ? `<p><strong>Webhook taslağı:</strong> <code>${app.webhook_url_draft}</code></p>` : ''}
    </div>

    <section class="final-cta-card">
      <h2>Webhook endpoint (self-serve)</h2>
      <p>HTTPS URL girin; ekip onayından sonra canlı lead akışı başlar. İmza doğrulama için <a href="/partner-docs.html">entegrasyon dokümanı</a>.</p>
      <form id="partner-webhook-draft-form" class="partner-form">
        <label>Webhook URL
          <input name="webhook_url" type="url" required placeholder="https://api.sizin-domain.com/istebul/leads" value="${app.webhook_url_draft || ''}">
        </label>
        <button type="submit" class="btn primary">Webhook taslağını kaydet</button>
      </form>
      <p class="text-muted-sm" style="margin-top:1rem;">Test lead: admin ekibinizle veya WhatsApp ile talep edin. Production dispatch hot lead skoruna göre yapılır.</p>
    </section>

    <div class="final-cta-actions">
      <a class="btn secondary" href="/partner-docs.html">API &amp; webhook dokümantasyonu</a>
      <a class="btn secondary" href="/partner-olun.html">Partner ana sayfa</a>
    </div>
  `;

  document.getElementById('partner-webhook-draft-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const url = new FormData(event.currentTarget).get('webhook_url');
    try {
      await hubRequest({ action: 'save_webhook', token: getToken(), webhook_url: url });
      trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.WEBHOOK_DRAFT_SAVED, {}, { oncePerSession: false });
      await load();
    } catch (err) {
      alert(err.message === 'invalid_webhook_url' ? 'Geçersiz webhook URL.' : 'Kaydedilemedi.');
    }
  });
}

async function load() {
  const token = getToken();
  const root = document.getElementById('partner-onboarding-root');
  if (!token) {
    if (root) {
      root.innerHTML = '<p>Geçersiz onboarding linki. Lütfen başvuru sonrası e-postanızdaki linki kullanın veya <a href="/partner-olun.html">yeniden başvurun</a>.</p>';
    }
    return;
  }

  try {
    const data = await hubRequest({ action: 'status', token });
    trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.ONBOARDING_VIEW, { status: data.application?.status });
    renderPanel(data);
  } catch (err) {
    if (root) {
      root.innerHTML = err.status === 404
        ? '<p>Başvuru bulunamadı. Link süresi dolmuş olabilir.</p>'
        : '<p>Durum yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initCorporateUx();
  load();
});
