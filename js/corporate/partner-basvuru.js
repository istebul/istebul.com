import { initCorporateUx } from '../runtime/corporate-ux.js';
import { showInlineFormBanner } from '../runtime/enterprise-form-ux.js';
import { PARTNER_ROUTE_LABELS, PARTNER_FUNNEL_EVENTS, trackPartnerFunnel } from '../features/partner/partner-platform.js';
import {
  FUNNEL_STEPS,
  SAMPLE_WEBHOOK_PAYLOAD,
  getTokenFromUrl,
  getStepFromUrl,
  setFunnelUrl,
  hubRequest,
  submitPartnerApplication,
  renderStepper,
  trackFunnelStep,
  verifySamplePayloadSignature
} from '../features/partner/partner-funnel.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function partnerFunnelError(root, message) {
  const panel = root?.querySelector('.ib-partner-funnel-panel') || root;
  if (!panel) return;
  showInlineFormBanner(panel, message, 'error');
  panel.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

function effectiveStep(app, urlStep) {
  if (!app) return urlStep;
  const saved = Number(app.onboarding_step) || 1;
  if (app.onboarding_completed_at) return 6;
  return Math.max(urlStep, saved > 1 ? saved : urlStep);
}

function renderShell(step, app, innerHtml) {
  const completedThrough = app?.onboarding_completed_at ? 6 : (Number(app?.onboarding_step) || 1) - 1;
  return `
    ${renderStepper(step, completedThrough)}
    <div class="ib-partner-funnel-panel">
      ${innerHtml}
    </div>`;
}

function renderStep1() {
  return renderShell(1, null, `
    <p class="kicker">Adım 1 / 6</p>
    <h1>Partner başvurusu</h1>
    <p class="lead">Kurumsal bilgilerinizi girin; sonraki adımlarda uygunluk, lead ihtiyaçları ve webhook doğrulamasını self-serve tamamlayın.</p>
    <form id="partner-funnel-application" class="partner-form">
      <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="ib-honeypot">
      <div class="form-row">
        <label>Firma adı<input name="company_name" required maxlength="120"></label>
        <label>Yetkili<input name="contact_name" required maxlength="80"></label>
      </div>
      <div class="form-row">
        <label>Telefon<input name="phone" type="tel" required placeholder="5xx xxx xx xx"></label>
        <label>E-posta<input name="email" type="email" required></label>
      </div>
      <div class="form-row">
        <label>Şehir<input name="city" maxlength="60"></label>
        <label>Kategori
          <select name="category" required>
            <option value="">Seçin</option>
            <option value="dealer_partner">Bayi / Galeri</option>
            <option value="finance_partner">Finansman</option>
            <option value="insurance_partner">Sigorta</option>
            <option value="general_sales">Genel satış</option>
          </select>
        </label>
      </div>
      <label>Aylık lead kapasitesi<input name="lead_capacity" placeholder="Örn. 50–100"></label>
      <fieldset class="ib-partner-billing-fieldset" id="partner-billing-plan-fieldset">
        <legend>İlgilendiğiniz plan</legend>
        <p class="text-muted-sm">Fiyat teklif ile netleşir. <a href="/partner-planlar.html">Plan karşılaştırması</a></p>
        <label class="checkbox-row"><input type="radio" name="billing_plan" value="pilot"> Entegrasyon pilotu (ilk 5 sıcak lead ücretsiz)</label>
        <label class="checkbox-row"><input type="radio" name="billing_plan" value="starter" checked> Starter — CPL / düşük hacim</label>
        <label class="checkbox-row"><input type="radio" name="billing_plan" value="growth"> Growth — aylık kapasite</label>
        <label class="checkbox-row"><input type="radio" name="billing_plan" value="enterprise"> Enterprise — kurumsal platform</label>
      </fieldset>
      <label class="checkbox-row">
        <input type="checkbox" name="webhook_ready"> HTTPS webhook endpoint'imiz hazır veya hazırlanıyor
      </label>
      <label>Not<textarea name="notes" rows="3" placeholder="CRM, entegrasyon tercihi…"></textarea></label>
      <button type="submit" class="btn primary">Başvuruyu gönder ve devam et</button>
    </form>
    <p class="ib-partner-funnel-help">Zaten başvurdunuz mu? E-postanızdaki onboarding linkini kullanın veya <a href="/iletisim.html">kurumsal iletişim</a>.</p>
  `);
}

function renderStep2(app, q) {
  return renderShell(2, app, `
    <p class="kicker">Adım 2 / 6 · Uygunluk</p>
    <h1>${escapeHtml(app.company_name)}</h1>
    <p class="lead">Operasyonel uygunluğunuzu anlayalım; pilot ve canlı teslimat planını buna göre netleştiririz.</p>
    <form id="partner-funnel-qualification" class="partner-form">
      <label>Yıllık ciro bandı
        <select name="annual_revenue_band" required>
          <option value="">Seçin</option>
          <option value="under_10m" ${q.annual_revenue_band === 'under_10m' ? 'selected' : ''}>10M TL altı</option>
          <option value="10m_50m" ${q.annual_revenue_band === '10m_50m' ? 'selected' : ''}>10–50M TL</option>
          <option value="50m_200m" ${q.annual_revenue_band === '50m_200m' ? 'selected' : ''}>50–200M TL</option>
          <option value="200m_plus" ${q.annual_revenue_band === '200m_plus' ? 'selected' : ''}>200M TL üzeri</option>
        </select>
      </label>
      <label>CRM / lead yönetimi<input name="crm_platform" required maxlength="80" value="${escapeHtml(q.crm_platform || '')}" placeholder="Salesforce, özel CRM, Excel…"></label>
      <label>Satış ekibi büyüklüğü
        <select name="sales_team_size" required>
          <option value="">Seçin</option>
          <option value="1-5" ${q.sales_team_size === '1-5' ? 'selected' : ''}>1–5</option>
          <option value="6-20" ${q.sales_team_size === '6-20' ? 'selected' : ''}>6–20</option>
          <option value="21-50" ${q.sales_team_size === '21-50' ? 'selected' : ''}>21–50</option>
          <option value="50+" ${q.sales_team_size === '50+' ? 'selected' : ''}>50+</option>
        </select>
      </label>
      <label>Entegrasyon sorumlusu<input name="integration_owner" maxlength="80" value="${escapeHtml(q.integration_owner || '')}" placeholder="Ad soyad veya ekip"></label>
      <label>Pilot başlangıç hedefi
        <select name="pilot_timeline" required>
          <option value="">Seçin</option>
          <option value="2_weeks" ${q.pilot_timeline === '2_weeks' ? 'selected' : ''}>2 hafta içinde</option>
          <option value="1_month" ${q.pilot_timeline === '1_month' ? 'selected' : ''}>1 ay içinde</option>
          <option value="quarter" ${q.pilot_timeline === 'quarter' ? 'selected' : ''}>Çeyrek içinde</option>
        </select>
      </label>
      <label class="checkbox-row">
        <input type="checkbox" name="kvkk_dpa_ready" ${q.kvkk_dpa_ready ? 'checked' : ''}>
        KVKK / veri işleme süreçlerimiz hazır veya hazırlanıyor
      </label>
      <button type="submit" class="btn primary">Kaydet ve devam et</button>
    </form>
  `);
}

function renderStep3(app, needs) {
  const interests = Array.isArray(needs.interest_types) ? needs.interest_types : [];
  return renderShell(3, app, `
    <p class="kicker">Adım 3 / 6 · Lead ihtiyaçları</p>
    <h1>Lead profili</h1>
    <p class="lead">isteBul Auto skor ve öncelik ile teslim eder; kapasite ve coğrafya tercihlerinizi belirleyin.</p>
    <form id="partner-funnel-lead-needs" class="partner-form">
      <p><strong>Kategori:</strong> ${escapeHtml(PARTNER_ROUTE_LABELS[app.category] || app.category)}</p>
      <label>Minimum lead skoru (önerilen 120+)
        <input name="min_lead_score" type="number" min="80" max="200" value="${needs.min_lead_score || 120}">
      </label>
      <label>Günlük maksimum lead<input name="max_leads_per_day" type="number" min="1" max="500" value="${needs.max_leads_per_day || 10}"></label>
      <label>Coğrafi odak<input name="geographic_focus" maxlength="120" value="${escapeHtml(needs.geographic_focus || 'İzmir ve çevresi')}" placeholder="İl / bölge"></label>
      <label>Araç odağı<input name="vehicle_focus" maxlength="120" value="${escapeHtml(needs.vehicle_focus || '')}" placeholder="SUV, sedan, ticari…"></label>
      <fieldset class="ib-partner-billing-fieldset">
        <legend>İlgi türleri</legend>
        <label class="checkbox-row"><input type="checkbox" name="interest_types" value="vehicle_offer" ${interests.includes('vehicle_offer') ? 'checked' : ''}> Araç teklifi</label>
        <label class="checkbox-row"><input type="checkbox" name="interest_types" value="finance" ${interests.includes('finance') ? 'checked' : ''}> Finansman</label>
        <label class="checkbox-row"><input type="checkbox" name="interest_types" value="insurance" ${interests.includes('insurance') ? 'checked' : ''}> Sigorta</label>
      </fieldset>
      <label>Ek not<textarea name="notes" rows="2">${escapeHtml(needs.notes || '')}</textarea></label>
      <button type="submit" class="btn primary">Kaydet ve devam et</button>
    </form>
  `);
}

function renderStep4(app) {
  return renderShell(4, app, `
    <p class="kicker">Adım 4 / 6 · Webhook</p>
    <h1>Webhook endpoint</h1>
    <p class="lead">HTTPS URL kaydedin. Canlı lead, ekip onayı ve endpoint sağlık kontrolünden sonra akar. <a href="/partner-docs.html">Entegrasyon dokümanı</a></p>
    <form id="partner-funnel-webhook" class="partner-form">
      <label>Webhook URL
        <input name="webhook_url" type="url" required placeholder="https://api.sizin-domain.com/istebul/leads" value="${escapeHtml(app.webhook_url_draft || '')}">
      </label>
      <label>Entegrasyon notu (opsiyonel)<textarea name="integration_notes" rows="2" placeholder="Staging URL, IP allowlist…">${escapeHtml(app.integration_notes || '')}</textarea></label>
      <button type="submit" class="btn primary">Webhook kaydet</button>
    </form>
  `);
}

function renderStep5(app) {
  const sampleJson = escapeHtml(JSON.stringify(SAMPLE_WEBHOOK_PAYLOAD, null, 2));
  return renderShell(5, app, `
    <p class="kicker">Adım 5 / 6 · Test doğrulama</p>
    <h1>Örnek payload imzası</h1>
    <p class="lead">Paylaşılan gizli anahtarınızla aşağıdaki gövdeyi HMAC-SHA256 ile imzalayın. Bu adım, canlıya geçmeden önce entegrasyonunuzun doğru çalıştığını doğrular.</p>
    <pre class="ib-partner-funnel-sample">${sampleJson}</pre>
    <form id="partner-funnel-test" class="partner-form">
      <label>Webhook signing secret (test)
        <input name="webhook_secret" type="password" required minlength="8" autocomplete="off" placeholder="Üretim secret ile aynı mantık">
      </label>
      <p class="text-muted-sm">Secret tarayıcıda kalır; yalnızca imza doğrulaması için kullanılır ve sunucuda saklanmaz.</p>
      <button type="button" class="btn secondary" id="partner-funnel-compute-sig">İmzayı hesapla</button>
      <label>Hesaplanan imza (hex)
        <input name="signature" readonly placeholder="Önce hesaplayın veya yapıştırın">
      </label>
      <button type="submit" class="btn primary" ${app.test_payload_verified ? '' : ''}>Doğrula ve devam et</button>
      ${app.test_payload_verified ? '<p class="ib-partner-funnel-success-inline">Test doğrulaması tamamlandı.</p>' : ''}
    </form>
  `);
}

function renderStep6(app) {
  return renderShell(6, app, `
    <p class="kicker">Adım 6 / 6 · Tamamlandı</p>
    <h1>Onboarding özeti</h1>
    <div class="ib-partner-funnel-summary">
      <p><strong>Firma:</strong> ${escapeHtml(app.company_name)}</p>
      <p><strong>Plan:</strong> ${escapeHtml(app.billing_plan || 'pilot')}</p>
      <p><strong>Webhook:</strong> <code>${escapeHtml(app.webhook_url_draft || '—')}</code></p>
      <p><strong>Test payload:</strong> ${app.test_payload_verified ? 'Doğrulandı' : 'Bekliyor'}</p>
      <p><strong>Durum:</strong> ${escapeHtml(app.status)}</p>
    </div>
    ${app.onboarding_completed_at ? `
      <div class="ib-partner-success">
        <p><strong>Self-serve onboarding tamamlandı.</strong></p>
        <p>Operasyon ekibimiz endpoint onayı ve ilk canlı lead öncesi son kontrolleri yapar. Ortalama yanıt: bir iş günü.</p>
      </div>
    ` : `
      <p class="lead">Tüm adımlar tamamlandığında başvurunuzu operasyon kuyruğuna alıyoruz.</p>
      <button type="button" class="btn primary" id="partner-funnel-complete">Onboarding'i tamamla</button>
    `}
    <div class="final-cta-actions" style="margin-top:1.5rem;">
      <a class="btn secondary" href="/partner-docs.html">API dokümantasyonu</a>
      <a class="btn secondary" href="/partner-olun.html">Partner ana sayfa</a>
    </div>
  `);
}

function applyPlanFromUrl(form) {
  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan');
  const allowed = new Set(['pilot', 'starter', 'growth', 'enterprise']);
  if (!plan || !allowed.has(plan)) return;
  const input = form.querySelector(`[name="billing_plan"][value="${plan}"]`);
  if (input) input.checked = true;
  const intent = params.get('intent');
  const notes = form.querySelector('[name="notes"]');
  if (intent === 'quote' && notes && !notes.value) {
    notes.value = `Teklif talebi — ${plan} planı.`;
  }
}

function bindStep1(root) {
  const form = root.querySelector('#partner-funnel-application');
  if (!form) return;

  applyPlanFromUrl(form);

  form.addEventListener('focusin', () => {
    trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.APPLICATION_START, {}, { oncePerSession: true });
  }, { once: true });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(form);
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
      billing_plan: billingPlan
    };

    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Gönderiliyor…';
    }

    try {
      const data = await submitPartnerApplication(payload);
      trackFunnelStep(1, { category: payload.category, billing_plan: billingPlan });
      const token = data.onboarding_token;
      if (!token) throw new Error('no_token');
      setFunnelUrl(token, 2);
      await load();
    } catch {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Başvuruyu gönder ve devam et';
      }
      partnerFunnelError(root, 'Başvuru gönderilemedi. Bilgileri kontrol edip tekrar deneyin.');
    }
  });
}

function bindStep2(root, token) {
  root.querySelector('#partner-funnel-qualification')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const data = {
      annual_revenue_band: fd.get('annual_revenue_band'),
      crm_platform: fd.get('crm_platform'),
      sales_team_size: fd.get('sales_team_size'),
      integration_owner: fd.get('integration_owner'),
      pilot_timeline: fd.get('pilot_timeline'),
      kvkk_dpa_ready: fd.get('kvkk_dpa_ready') === 'on'
    };
    try {
      await hubRequest({ action: 'save_step', token, step: 2, data });
      trackFunnelStep(2);
      setFunnelUrl(token, 3);
      await load();
    } catch {
      partnerFunnelError(root, 'Kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    }
  });
}

function bindStep3(root, token) {
  root.querySelector('#partner-funnel-lead-needs')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const interest_types = [...fd.getAll('interest_types')];
    const data = {
      min_lead_score: fd.get('min_lead_score'),
      max_leads_per_day: fd.get('max_leads_per_day'),
      geographic_focus: fd.get('geographic_focus'),
      vehicle_focus: fd.get('vehicle_focus'),
      interest_types,
      notes: fd.get('notes')
    };
    try {
      await hubRequest({ action: 'save_step', token, step: 3, data });
      trackFunnelStep(3);
      setFunnelUrl(token, 4);
      await load();
    } catch {
      partnerFunnelError(root, 'Kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    }
  });
}

function bindStep4(root, token) {
  root.querySelector('#partner-funnel-webhook')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    try {
      await hubRequest({
        action: 'save_webhook',
        token,
        webhook_url: fd.get('webhook_url'),
        integration_notes: fd.get('integration_notes')
      });
      trackFunnelStep(4);
      setFunnelUrl(token, 5);
      await load();
    } catch (err) {
      partnerFunnelError(
        root,
        err.message === 'invalid_webhook_url' ? 'Geçersiz webhook URL. HTTPS adresi girin.' : 'Kaydedilemedi.'
      );
    }
  });
}

function bindStep5(root, token, app) {
  const form = root.querySelector('#partner-funnel-test');
  const computeBtn = root.querySelector('#partner-funnel-compute-sig');
  computeBtn?.addEventListener('click', async () => {
    const secret = form?.querySelector('[name="webhook_secret"]')?.value;
    if (!secret || secret.length < 8) {
      partnerFunnelError(root, 'En az 8 karakterlik secret girin.');
      return;
    }
    const sig = await verifySamplePayloadSignature(secret);
    const sigInput = form?.querySelector('[name="signature"]');
    if (sigInput) sigInput.value = sig;
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const secret = form.querySelector('[name="webhook_secret"]')?.value;
    let signature = form.querySelector('[name="signature"]')?.value;
    if (!signature && secret) {
      signature = await verifySamplePayloadSignature(secret);
      form.querySelector('[name="signature"]').value = signature;
    }
    try {
      await hubRequest({ action: 'verify_test_payload', token, webhook_secret: secret, signature });
      trackFunnelStep(5);
      setFunnelUrl(token, 6);
      await load();
    } catch (err) {
      const msg = err?.data?.error === 'signature_mismatch'
        ? 'İmza eşleşmedi. Secret ve JSON gövdesini kontrol edin.'
        : 'Doğrulama başarısız.';
      partnerFunnelError(root, msg);
    }
  });

  if (app.test_payload_verified) {
    const skip = document.createElement('p');
    skip.innerHTML = '<a href="#" id="partner-funnel-skip-test">Test tamam — 6. adıma geç</a>';
    form?.appendChild(skip);
    root.querySelector('#partner-funnel-skip-test')?.addEventListener('click', (e) => {
      e.preventDefault();
      setFunnelUrl(token, 6);
      load();
    });
  }
}

function bindStep6(root, token) {
  root.querySelector('#partner-funnel-complete')?.addEventListener('click', async () => {
    try {
      await hubRequest({ action: 'complete_onboarding', token });
      trackFunnelStep(6);
      await load();
    } catch (err) {
      const code = err?.data?.error;
      if (code === 'webhook_required') partnerFunnelError(root, 'Önce webhook URL kaydedin.');
      else if (code === 'test_payload_not_verified') {
        partnerFunnelError(root, 'Önce test payload doğrulamasını tamamlayın.');
      } else partnerFunnelError(root, 'Tamamlanamadı. Destek ile iletişime geçin.');
    }
  });
}

async function load() {
  const root = document.getElementById('partner-funnel-root');
  if (!root) return;

  const token = getTokenFromUrl();
  let urlStep = getStepFromUrl(1);

  if (!token) {
    if (urlStep > 1) {
      root.innerHTML = '<p>Geçersiz link. <a href="/partner-basvuru.html">Yeni başvuru</a> ile başlayın.</p>';
      return;
    }
    root.innerHTML = renderStep1();
    bindStep1(root);
    trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.APPLICATION_START, { surface: 'partner_basvuru' }, { oncePerSession: true });
    return;
  }

  let app;
  try {
    const data = await hubRequest({ action: 'status', token });
    app = data.application;
    trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.ONBOARDING_VIEW, {
      status: app?.status,
      onboarding_step: app?.onboarding_step
    });
  } catch (err) {
    root.innerHTML = err.status === 404
      ? '<p>Başvuru bulunamadı. <a href="/partner-basvuru.html">Yeniden başvurun</a>.</p>'
      : '<p>Durum yüklenemedi.</p>';
    return;
  }

  const step = effectiveStep(app, urlStep);
  if (step !== urlStep) setFunnelUrl(token, step);

  const q = app.qualification_data || {};
  const needs = app.lead_needs_data || {};

  if (step === 2) {
    root.innerHTML = renderStep2(app, q);
    bindStep2(root, token);
  } else if (step === 3) {
    root.innerHTML = renderStep3(app, needs);
    bindStep3(root, token);
  } else if (step === 4) {
    root.innerHTML = renderStep4(app);
    bindStep4(root, token);
  } else if (step === 5) {
    root.innerHTML = renderStep5(app);
    bindStep5(root, token, app);
  } else if (step === 6) {
    root.innerHTML = renderStep6(app);
    bindStep6(root, token);
  } else {
    setFunnelUrl(token, 2);
    root.innerHTML = renderStep2(app, q);
    bindStep2(root, token);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initCorporateUx();
  trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.ONBOARDING_VIEW, { surface: 'partner_basvuru_load' }, { oncePerSession: true });
  load();
});
