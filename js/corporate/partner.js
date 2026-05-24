import {
  buildOnboardingUrl,
  capturePartnerAttribution,
  PARTNER_FUNNEL_EVENTS,
  renderRateCardHtml,
  trackPartnerFunnel
} from '../features/partner/partner-platform.js';

function mountRateCard() {
  const root = document.getElementById('partner-rate-card-root');
  if (root) root.innerHTML = renderRateCardHtml();
}

document.addEventListener('DOMContentLoaded', () => {
  trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.LANDING_VIEW, {
    path: window.location.pathname
  });

  mountRateCard();

  const form = document.querySelector('#partner-application-form');
  if (!form) return;

  form.addEventListener('focusin', () => {
    trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.APPLICATION_START, {}, { oncePerSession: true });
  }, { once: true });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const fd = new FormData(form);
    const anonKey = window.__env?.SUPABASE_ANON_KEY || '';
    const baseUrl = (window.__env?.SUPABASE_URL || '').replace(/\/$/, '');
    const endpoint = baseUrl ? `${baseUrl}/functions/v1/partner-application` : '';

    if (!endpoint || !anonKey) {
      alert('Başvuru servisi yapılandırılmamış.');
      return;
    }

    const attribution = capturePartnerAttribution();
    const billingPlan = form.querySelector('[name="billing_plan"]:checked')?.value || 'pilot';

    const payload = {
      company_name: fd.get('company_name'),
      contact_name: fd.get('contact_name'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      city: fd.get('city'),
      category: fd.get('category'),
      lead_capacity: fd.get('lead_capacity'),
      webhook_ready: fd.get('webhook_ready') === 'on',
      notes: fd.get('notes') || '',
      website: fd.get('website') || '',
      billing_plan: billingPlan,
      ...attribution
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Gönderiliyor…';
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'request_failed');

      trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.APPLICATION_SUBMIT, {
        category: payload.category,
        webhook_ready: payload.webhook_ready,
        billing_plan: billingPlan
      }, { oncePerSession: false });

      const onboardingUrl = data.onboarding_path
        ? `${window.location.origin}${data.onboarding_path}`
        : data.onboarding_token
          ? buildOnboardingUrl(data.onboarding_token)
          : null;

      form.innerHTML = `
        <div class="ib-partner-success">
          <p><strong>Başvurunuz alındı.</strong></p>
          <p>Sonraki adım: webhook kurulumu ve test lead akışı.${onboardingUrl ? ' Self-serve onboarding paneliniz hazır.' : ''}</p>
          ${onboardingUrl ? `<p><a class="btn primary" href="${onboardingUrl}">Onboarding paneline git</a></p>` : ''}
          <p class="text-muted-sm">Ekibimiz ${payload.webhook_ready ? '24 saat içinde' : 'iş günü içinde'} sizinle iletişime geçecek.</p>
        </div>`;
    } catch {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Başvuruyu gönder';
      }
      alert('Başvuru gönderilemedi. Lütfen tekrar deneyin veya WhatsApp ile ulaşın.');
    }
  });
});
