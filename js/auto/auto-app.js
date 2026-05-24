import { recommendVehicles } from './auto-ai.js?v=ai2';
import { getVehicleCatalog } from './auto-catalog.js?v=truth3';
import { getDealerOffers } from './auto-offers.js?v=offers2';
import { FREE_LIMITS, PLANS } from '../features/monetization/plans.js';
import { analytics } from '../core/analytics.js';
import { revenueManager } from '../features/monetization/revenue-manager.js';
import { getSupabaseClient } from '../core/supabase.js';

document.documentElement.classList.add('ib-ready');

function isProActive() {
  return Boolean(revenueManager.isPremium);
}

async function initAutoEntitlements() {
  const sb = getSupabaseClient();
  if (!sb) return;
  try {
    const { data: { session } } = await sb.auth.getSession();
    await revenueManager.refresh(session?.user?.id || null);
    sb.auth.onAuthStateChange((_event, session) => {
      revenueManager.refresh(session?.user?.id || null).catch(() => {});
    });
  } catch {
    await revenueManager.refresh(null);
  }
}

function openAutoUpgradePaywall(feature = 'premium_report') {
  const existing = document.getElementById('auto-revenue-paywall');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'auto-revenue-paywall';
  overlay.className = 'revenue-paywall';
  overlay.innerHTML = `
    <div class="revenue-paywall-card" role="dialog">
      <button type="button" class="revenue-paywall-close" data-auto-paywall-close aria-label="Kapat">×</button>
      <span class="revenue-upgrade-kicker">isteBul Pro</span>
      <h3>${feature === 'premium_report' ? 'Detaylı karar raporu' : 'Pro özellik'}</h3>
      <p>${PLANS.pro.description}</p>
      <ul class="revenue-paywall-list">
        ${PLANS.pro.highlights.slice(0, 4).map((item) => `<li>${item}</li>`).join('')}
      </ul>
      <div class="revenue-upgrade-actions">
        <a class="btn primary" href="/#pricing?checkout=pro" data-auto-checkout-intent>7 gün ücretsiz dene</a>
        <button type="button" class="btn secondary" data-auto-paywall-close>Ücretsiz devam et</button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();
  overlay.querySelectorAll('[data-auto-paywall-close]').forEach((el) => el.addEventListener('click', close));
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.body.appendChild(overlay);
}

function renderAutoUpgradeStrip() {
  if (isProActive()) return '';

  return `
    <aside class="revenue-upgrade-banner revenue-upgrade-banner--compact">
      <div class="revenue-upgrade-copy">
        <span class="revenue-upgrade-kicker">isteBul Pro</span>
        <strong>Tüm sonuçları ve premium raporu açın</strong>
        <p>Ücretsiz planda ${FREE_LIMITS.maxAutoResultsPreview} model önerisi görürsünüz. Pro ile sınırsız karşılaştırma — ilk abonelikte 7 gün ücretsiz deneme.</p>
      </div>
      <div class="revenue-upgrade-actions">
        <a class="btn btn-primary" href="/#pricing?checkout=pro" data-auto-checkout-intent>7 gün ücretsiz dene</a>
        <a class="btn btn-outline" href="/#pricing">Planları incele</a>
      </div>
    </aside>
  `;
}

const formatter = new Intl.NumberFormat('tr-TR');

function getBestFinanceOffer(financeOffers, budget) {
  if (!Array.isArray(financeOffers) || !financeOffers.length) return null;

  const eligible = financeOffers.filter((offer) => {
    const min = Number(offer.min_amount || 0);
    const max = Number(offer.max_amount || 999999999);
    return budget >= min && budget <= max;
  });

  return (eligible.length ? eligible : financeOffers)[0];
}


const autoRuntimeConfig = {
  whatsappPhone: '905456786420'
};

async function loadAutoRuntimeConfig() {
  const supabaseUrl = window.__env?.SUPABASE_URL;
  const supabaseKey = window.__env?.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/site_settings?select=key,value&key=in.(auto_whatsapp_phone)`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) return;

    const rows = await response.json();
    const phoneSetting = rows.find(row => row.key === 'auto_whatsapp_phone')?.value;
    const cleanPhone = String(phoneSetting || '').replace(/\D/g, '');

    if (cleanPhone.length >= 10) {
      autoRuntimeConfig.whatsappPhone = cleanPhone;
    }
  } catch {}
}


function safeJsonParse(value, fallback = {}) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}


function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSessionId() {
  let id = sessionStorage.getItem('istebul_auto_session');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('istebul_auto_session', id);
  }
  return id;
}

function shouldTrackUnique(eventName, key = '') {
  const token = `tracked:${eventName}:${key}`;
  if (sessionStorage.getItem(token)) return false;
  sessionStorage.setItem(token, '1');
  return true;
}

function readForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setupAutoMobileNav() {
  const header = document.querySelector('.auto-header');
  const toggle = document.querySelector('.auto-nav-toggle');
  const nav = document.getElementById('auto-nav');

  if (!header || !toggle || !nav) return;

  header.classList.add('nav-enhanced');

  const setOpen = (isOpen) => {
    header.classList.toggle('is-nav-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  };

  toggle.addEventListener('click', () => {
    setOpen(!header.classList.contains('is-nav-open'));
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      setOpen(false);
    }
  });
}

function getCurrentLeadPayload() {
  const autoForm = document.getElementById('auto-form');
  const formPayload = autoForm ? readForm(autoForm) : {};
  const storedPayload = safeJsonParse(localStorage.getItem('istebul_auto_lead_payload'), {});
  return {
    ...storedPayload,
    ...formPayload
  };
}

async function callAutoIntake(payload) {
  const supabaseUrl = window.__env?.SUPABASE_URL;
  const supabaseKey = window.__env?.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/auto-intake`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Auto intake failed: ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function trackAutoEvent(eventName, metadata = {}) {
  analytics.track(
    eventName,
    {
      session_id: getSessionId(),
      email: localStorage.getItem('istebul_auto_lead_email') || metadata.email || null,
      ...metadata
    },
    {
      category: 'auto',
      funnel: 'auto',
      funnel_step: String(eventName).replace(/^auto_/, ''),
      email: metadata.email || localStorage.getItem('istebul_auto_lead_email') || null,
      phone: metadata.phone || null
    }
  );
}

function trackUniqueAutoEvent(eventName, metadata = {}, key = '') {
  if (!shouldTrackUnique(eventName, key)) return;
  trackAutoEvent(eventName, metadata);
}

function fuelLabel(fuel) {
  return {
    hybrid: 'Hibrit',
    electric: 'Elektrikli',
    gasoline: 'Benzinli',
    diesel: 'Dizel'
  }[fuel] || fuel;
}

function renderLoading() {
  document.getElementById('auto-results').innerHTML = `
    <div class="ai-loading premium-loading">
      <div class="spinner"></div>
      <p class="kicker">Karar analizi hazırlanıyor</p>
      <h3>İhtiyaç profiliniz ve toplam maliyet etkisi değerlendiriliyor...</h3>
      <p class="loading-copy">Bütçe, kullanım, yakıt tercihi, yıllık kilometre ve finansman durumunuz birlikte değerlendiriliyor.</p>
      <ul class="ai-loading-steps">
        <li class="is-done">İhtiyaç profiliniz oluşturuluyor</li>
        <li class="is-active">Uygun araç profili hazırlanıyor</li>
        <li>Toplam sahip olma maliyeti hesaplanıyor</li>
        <li>Finansman ve kullanım riski modelleniyor</li>
        <li>Profilinize en yakın seçenekler hazırlanıyor</li>
      </ul>
    </div>
  `;
}

async function updateLeadInterest(phone, interestType, vehicle = '', options = {}) {
  const email = localStorage.getItem('istebul_auto_lead_email');
  const leadPayload = getCurrentLeadPayload();

  return await callAutoIntake({
    type: 'lead',
    email: email || null,
    phone,
    turnstile_token: options.turnstileToken || '',
    formData: {
      ...leadPayload,
      phone,
      contact_name: options.contactName || '',
      preferred_contact_time: options.preferredContactTime || '',
      city: options.city || leadPayload.city || '',
      district: options.district || leadPayload.district || '',
      privacy_consent: options.privacyConsent ? 'accepted' : '',
      interest_type: interestType,
      vehicle,
      finance_bank: options.financeBank || '',
      finance_loan_amount: options.financeLoanAmount || '',
      finance_term: options.financeTerm || '',
      finance_monthly_payment: options.financeMonthlyPayment || '',
      finance_total_payment: options.financeTotalPayment || ''
    }
  });
}


const TURNSTILE_SITE_KEY = '0x4AAAAAADRgIOMcaKMMBndc';

async function getTurnstileToken() {
  return new Promise((resolve) => {
    if (!window.turnstile || !TURNSTILE_SITE_KEY) {
      resolve('');
      return;
    }

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    let settled = false;
    const finish = (token = '') => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      container.remove();
      resolve(token || '');
    };

    const timeout = setTimeout(() => finish(''), 6000);

    try {
      const widgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        size: 'invisible',
        callback: (token) => finish(token),
        'error-callback': () => finish(''),
        'timeout-callback': () => finish('')
      });

      window.turnstile.execute(widgetId);
    } catch {
      finish('');
    }
  });
}


window.__istebulGetTurnstileToken = getTurnstileToken;
window.__istebulTurnstileSiteKey = TURNSTILE_SITE_KEY;

function calculateLoanPayment(amount, monthlyRate, term) {
  const principal = Number(amount || 0);
  const rate = Number(monthlyRate || 0) / 100;
  const months = Number(term || 48);

  if (!principal || !rate || !months) return 0;

  return Math.round((principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1));
}

function getStaticFinanceOffers(vehicle) {
  const loanAmount = Math.round(Number(vehicle?.price || 0) * 0.7);
  const term = 48;

  return [
    { provider: 'Garanti BBVA', rate: 3.19, term, loanAmount },
    { provider: 'Akbank', rate: 3.29, term, loanAmount },
    { provider: 'Yapı Kredi', rate: 3.35, term, loanAmount },
    { provider: 'TEB', rate: 3.39, term: 36, loanAmount },
    { provider: 'QNB', rate: 3.45, term: 36, loanAmount }
  ].map((offer) => {
    const monthly = calculateLoanPayment(offer.loanAmount, offer.rate, offer.term);
    return {
      ...offer,
      monthly,
      total: monthly * offer.term
    };
  }).sort((a, b) => a.monthly - b.monthly);
}

function openFinanceCompareModal(vehicleName = '') {
  analytics.track('finance_funnel_start', { vehicle: vehicleName || null }, {
    category: 'finance',
    funnel: 'finance',
    funnel_step: 'compare_modal_open'
  });
  trackAutoEvent('auto_finance_click', { vehicle: vehicleName, interest_type: 'finance' });

  const vehicle = (lastResults || []).find((item) => item.name === vehicleName) || lastResults?.[0] || {};
  const vehiclePrice = Number(vehicle.price || 0);
  const maxLoanAmount = Math.round(vehiclePrice * 0.8);
  const defaultLoan = Math.round(vehiclePrice * 0.6);
  const terms = [12, 24, 36, 48];
  const isLoggedIn = !!window.currentUser;

  const existing = document.getElementById('finance-compare-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'finance-compare-modal';
  modal.className = 'lead-modal finance-compare-modal';

  function buildOffers(principal, selectedTerm) {
    return [
      { provider: 'Garanti BBVA', rate: 3.19 },
      { provider: 'Akbank', rate: 3.29 },
      { provider: 'Yapı Kredi', rate: 3.35 },
      { provider: 'TEB', rate: 3.39 },
      { provider: 'QNB', rate: 3.45 }
    ].map((offer) => {
      const monthly = calculateLoanPayment(principal, offer.rate, selectedTerm);
      return { ...offer, term: selectedTerm, loanAmount: principal, monthly, total: monthly * selectedTerm };
    }).sort((a, b) => a.monthly - b.monthly);
  }

  function render(loanAmount = defaultLoan, selectedTerm = 48) {
    const requestedLoan = Number(String(loanAmount || '').replace(/[^0-9]/g, '') || 0);
    const loanLimit = maxLoanAmount || vehiclePrice || 1600000;
    const principal = Math.max(50000, Math.min(requestedLoan || defaultLoan, loanLimit));
    const loanWasCapped = requestedLoan > loanLimit;
    const downPayment = Math.max(0, vehiclePrice - principal);
    const offers = buildOffers(principal, selectedTerm);

    window.lastFinanceComparison = {
      vehicle: vehicle.name || vehicleName,
      vehiclePrice,
      loanAmount: principal,
      term: selectedTerm,
      offers
    };

    modal.innerHTML = `
      <div class="lead-modal-card finance-compare-card finance-configurator-card">
        <button type="button" class="lead-modal-close" aria-label="Kapat">×</button>

        <p class="kicker">Kredi karşılaştırması</p>
        <h3>${escapeHtml(vehicle.name || vehicleName || 'Araç')} için kişisel finansman simülasyonu</h3>
        <p class="lead-modal-muted">Önerilen kredi tutarı araç değerinin yaklaşık %60’ıdır. Dilerseniz değiştirebilirsiniz; maksimum limit araç değerinin %80’idir.</p>

        <div class="finance-login-note">
          <strong>${isLoggedIn ? 'Karşılaştırmanız kaydedilmeye hazır.' : 'Kişisel karşılaştırmayı kaydetmek için giriş yapın.'}</strong>
          <span>${isLoggedIn ? 'Seçimleriniz profilinizde saklanabilir.' : 'Giriş yapmadan da tahmini simülasyonu görüntüleyebilirsiniz.'}</span>
        </div>

        <div class="finance-config-grid">
          <label>
            <span>Araç fiyatı</span>
            <strong>${formatter.format(vehiclePrice || 0)} ₺</strong>
          </label>

          <label>
            <span>Kredi tutarı</span>
            <input id="finance-loan-amount" type="number" min="50000" max="${loanLimit}" step="10000" value="${principal}">
            ${loanWasCapped ? '<small class="finance-input-warning">Maksimum kredi limiti araç değerinin %80’i olarak uygulandı.</small>' : ''}
          </label>

          <label>
            <span>Peşinat</span>
            <strong>${formatter.format(downPayment)} ₺</strong>
          </label>
        </div>

        <div class="finance-term-selector">
          ${terms.map((term) => `
            <button type="button" class="term-btn ${term === selectedTerm ? 'active' : ''}" data-term="${term}">
              ${term} ay
            </button>
          `).join('')}
        </div>

        <div class="finance-offer-table">
          ${offers.map((offer, index) => `
            <article class="finance-bank-row ${index === 0 ? 'best' : ''}">
              <div>
                <span class="bank-rank">${index === 0 ? 'En uygun' : 'Alternatif'}</span>
                <strong>${escapeHtml(offer.provider)}</strong>
                <small>%${offer.rate} aylık oran • ${offer.term} ay vade</small>
              </div>
              <div>
                <b>${formatter.format(offer.monthly)} ₺</b>
                <small>tahmini aylık ödeme</small>
              </div>
              <div>
                <b>${formatter.format(offer.total)} ₺</b>
                <small>toplam geri ödeme</small>
              </div>
              <button class="btn primary finance-prequal-btn" data-bank="${escapeHtml(offer.provider)}" data-vehicle="${escapeHtml(vehicle.name || vehicleName)}">
                Ön değerlendir
              </button>
            </article>
          `).join('')}
        </div>

        <p class="finance-disclaimer">Bu ekran kredi tavsiyesi değil, tahmini karşılaştırma simülasyonudur.</p>
      </div>
    `;

    const closeModal = () => modal.remove();
    modal.querySelector('.lead-modal-close')?.addEventListener('click', closeModal);

    modal.querySelector('#finance-loan-amount')?.addEventListener('input', (event) => {
      render(event.target.value, selectedTerm);
    });

    modal.querySelectorAll('.term-btn').forEach((button) => {
      button.addEventListener('click', () => {
        render(principal, Number(button.dataset.term || selectedTerm));
      });
    });

    modal.querySelectorAll('.finance-prequal-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const selectedVehicle = button.getAttribute('data-vehicle') || vehicleName;
        closeModal();
        window.lastFinanceLeadContext = {
          bank: button.dataset.bank,
          vehicle: selectedVehicle,
          comparison: window.lastFinanceComparison
        };
        sessionStorage.setItem('istebul_last_finance_lead_context', JSON.stringify(window.lastFinanceLeadContext));
        openLeadModal('finance_review', selectedVehicle);
      });
    });
  }

  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
  render();
}

function openLeadModal(type, vehicle = '') {
  trackAutoEvent('auto_modal_open', { interest_type: type, vehicle });

  const existing = document.getElementById('lead-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'lead-modal';
  modal.className = 'lead-modal';

  const flow = {
    finance_review: {
      kicker: 'Finansman ön değerlendirme',
      title: 'Finansman seçeneklerinizi karşılaştıralım',
      description: 'Partner kurumlar üzerinden oran, vade ve ön onay seçenekleri için talebinizi alalım.',
      submit: 'Finansman ön değerlendirmesini başlat',
      success: 'Finansman ön değerlendirme talebiniz alındı'
    },
    finance: {
      kicker: 'Finansman ön değerlendirme',
      title: 'Finansman seçeneklerinizi karşılaştıralım',
      description: 'Partner kurumlar üzerinden oran, vade ve ön onay seçenekleri için talebinizi alalım.',
      submit: 'Finansman ön değerlendirmesini başlat',
      success: 'Finansman ön değerlendirme talebiniz alındı'
    },
    dealer_match: {
      kicker: 'Partner eşleşmesi',
      title: 'Size uygun partner eşleşmesini hazırlayalım',
      description: 'Bölgenizdeki doğrulanmış partner ağı üzerinden teklif hazırlığı başlatılabilir.',
      submit: 'Partner eşleşmesini başlat',
      success: 'Partner eşleşmesi talebiniz alındı'
    },
    vehicle_offer: {
      kicker: 'Özel araç teklifi',
      title: 'Size özel teklif hazırlayalım',
      description: 'Araç profilinize göre teklif, bayi ve finansman seçenekleri birlikte değerlendirilebilir.',
      submit: 'Teklif sürecini başlat',
      success: 'Teklif talebiniz alındı'
    }
  }[type] || {
    kicker: 'Uzman değerlendirme',
    title: 'Uzman ekibimiz sizinle iletişime geçsin',
    description: 'Analiz sonucunuza göre en uygun seçenekleri birlikte değerlendirelim.',
    submit: 'Uzman değerlendirmesini başlat',
    success: 'Uzman değerlendirme talebiniz alındı'
  };

  const closeModal = () => modal.remove();

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  function renderLeadForm() {
    modal.innerHTML = `
      <div class="lead-modal-card premium-lead-modal">
        <button type="button" class="lead-modal-close" aria-label="Kapat">×</button>

        <div class="premium-lead-hero">
          <p class="kicker">${escapeHtml(flow.kicker)}</p>
          <h3>${escapeHtml(flow.title)}</h3>
          <p>${escapeHtml(flow.description)}</p>
        </div>
        <div class="premium-lead-points">
          <span>✓ Doğrulanmış partner ağı</span>
          <span>✓ Finansman ön değerlendirme</span>
          <span>✓ Hızlı geri dönüş</span>
          <span>✓ Zorunlu satın alma yok</span>
        </div>
        <p class="lead-modal-muted">Bilgileriniz KVKK kapsamında işlenir.</p>

        <form id="phone-lead-form">
          <input name="vehicle" type="hidden" value="${escapeHtml(vehicle)}">
          <input name="name" type="text" required placeholder="Ad Soyad">
          <input name="phone" type="tel" required placeholder="05xx xxx xx xx">
          <input name="email" type="email" placeholder="E-posta (opsiyonel)">
          <input name="city" type="text" placeholder="Şehir">

          <select name="interest">
            <option value="${escapeHtml(type)}">${escapeHtml(flow.kicker)}</option>
            <option value="vehicle_offer">Araç teklifi</option>
            <option value="finance_review">Finansman</option>
            <option value="dealer_match">Partner eşleşmesi</option>
            <option value="expert_consultation">Uzman görüşmesi</option>
          </select>

          <label class="lead-consent">
            <input name="privacy_consent" type="checkbox" value="accepted" required>
            <span>
              <a href="/kvkk.html" target="_blank" rel="noopener">KVKK</a>,
              <a href="/gizlilik.html" target="_blank" rel="noopener">Gizlilik Politikası</a> ve uygun partnerlerle iletişim amacıyla paylaşım metnini kabul ediyorum.
            </span>
          </label>

          <button class="btn primary" type="submit">${escapeHtml(flow.submit)}</button>
          <button class="btn secondary" type="button" id="cancel-lead-modal">Vazgeç</button>
        </form>
      </div>
    `;

    modal.querySelector('.lead-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('cancel-lead-modal')?.addEventListener('click', closeModal);

    let leadSubmitting = false;

    document.getElementById('phone-lead-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (leadSubmitting) return;
      leadSubmitting = true;

      const submitButton = event.currentTarget.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Talebiniz güvenli şekilde gönderiliyor...';
      }

      const form = new FormData(event.currentTarget);
      const phone = form.get('phone');
      const contactName = form.get('name') || '';
      const selectedVehicle = form.get('vehicle') || vehicle;
      const selectedInterest = form.get('interest') || type;
      const city = String(form.get('city') || '').trim();
      const privacyConsent = form.get('privacy_consent') === 'accepted';

      if (form.get('email')) {
        localStorage.setItem('istebul_auto_lead_email', form.get('email'));
      }

      const turnstileToken = await getTurnstileToken();

      try {
        const financeContext = window.lastFinanceLeadContext
          || safeJsonParse(sessionStorage.getItem('istebul_last_finance_lead_context'), {});
        const financeComparison = financeContext.comparison || {};
        const bestFinanceOffer = Array.isArray(financeComparison.offers)
          ? financeComparison.offers.find((offer) => offer.provider === financeContext.bank) || financeComparison.offers[0]
          : null;

        await updateLeadInterest(phone, selectedInterest, selectedVehicle, {
          turnstileToken,
          contactName,
          city,
          privacyConsent,
          financeBank: financeContext.bank || '',
          financeLoanAmount: financeComparison.loanAmount || '',
          financeTerm: financeComparison.term || '',
          financeMonthlyPayment: bestFinanceOffer?.monthly || '',
          financeTotalPayment: bestFinanceOffer?.total || ''
        });

        renderStep3();
      } catch {
        leadSubmitting = false;
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = flow.submit;
        }
        renderError();
      }
    });
  }

  function renderStep3() {
    const financeContext = window.lastFinanceLeadContext || {};
    const financeComparison = financeContext.comparison || {};
    const financeMeta = financeContext.bank && financeComparison.loanAmount
      ? `${financeContext.bank} • ${formatter.format(financeComparison.loanAmount)} ₺ • ${financeComparison.term} ay`
      : '';

    modal.innerHTML = `
      <div class="lead-modal-card premium-lead-modal lead-success-modal">
        <button type="button" class="lead-modal-close" aria-label="Kapat">×</button>

        <p class="kicker">Talep alındı</p>
        <h3>${escapeHtml(flow.success)}</h3>
        <p>${financeMeta
          ? 'Seçtiğiniz finansman simülasyonu partner değerlendirmesine iletildi.'
          : 'Ekibimiz uygun teklif ve finansman seçenekleriyle sizinle iletişime geçecek.'}</p>

        ${financeMeta ? `
          <div class="finance-selected-summary">
            <strong>Seçilen simülasyon</strong>
            <span>${escapeHtml(financeMeta)}</span>
          </div>
        ` : ''}

        <div class="premium-lead-points">
          <span>✓ Talep güvenli şekilde kaydedildi</span>
          <span>✓ Partner ağı kontrol edilecek</span>
          <span>✓ En kısa sürede dönüş yapılacak</span>
        </div>

        <div class="premium-lead-actions">
          <button class="btn primary" id="close-success-lead-modal">Tamam</button>
        </div>
      </div>
    `;

    modal.querySelector('.lead-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('close-success-lead-modal')?.addEventListener('click', closeModal);
  }

  function renderError() {
    modal.innerHTML = `
      <div class="lead-modal-card premium-lead-modal">
        <button type="button" class="lead-modal-close" aria-label="Kapat">×</button>

        <p class="kicker">Bağlantı sorunu</p>
        <h3>Talebiniz gönderilemedi</h3>
        <p>Lütfen birkaç saniye sonra tekrar deneyin.</p>

        <div class="premium-lead-actions">
          <button class="btn primary" id="retry-lead-submit">Tekrar dene</button>
          <button class="btn secondary" id="close-error-lead-modal">Kapat</button>
        </div>
      </div>
    `;

    modal.querySelector('.lead-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('retry-lead-submit')?.addEventListener('click', renderLeadForm);
    document.getElementById('close-error-lead-modal')?.addEventListener('click', closeModal);
  }

  document.body.appendChild(modal);
  renderLeadForm();
}


async function getAiExplanation(results, formData = {}, refinement = '') {
  try {
    const prompt = [
      'Sen isteBul Auto karar analiz motorusun.',
      'SADECE araç önerisine dair Türkçe uzman değerlendirmesi üret.',
      'Asla soru sorma.',
      'Asla kullanıcıyla sohbet başlatma.',
      'Asla test mesajı üretme.',
      'Satış baskısı yapma.',
      'Kesin finansal vaat verme.',
      '3 kısa cümle yaz.',
      'İlk 3 sonuç: ' + JSON.stringify(
        (results || []).slice(0, 3).map(v => ({
          name: v.name,
          score: v.score,
          confidence: v.confidence,
          totalCost: v.costs?.total,
          reasons: v.reasons,
          risks: v.risks
        }))
      ),
      'Kullanıcı tercihleri: ' + JSON.stringify(formData),
      refinement ? 'Ek kullanıcı rafinesi: ' + refinement : '',
      'Görev: 3 sonucu listeleme. Puanları ve maliyetleri tekrar yazma.',
      'Bir seçeneği satmaya veya zorla öne çıkarmaya çalışma.',
      'Tarafsız otomotiv danışmanı gibi doğal Türkçe paragraf yaz.',
      'Asla markdown, tablo, başlık, liste, pipe karakteri üretme.',
      'Tek paragraf yaz.',
      'Karttaki verileri tekrar listeleme.',
      'Sadece karar yorumu üret.',
      'Kullanıcının en doğru kararı vermesine yardım et: kullanım tipi, bütçe ve öncelik trade-offlarını açıkla.',
      'En fazla 4 kısa cümle.'
    ].join('\\n');

    const res = await fetch('/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) return '';
    const data = await res.json();
    return String(data.result || '')
      .replace(/[#*_`|]/g, '')
      .replace(/^[-•]\s*/gm, '')
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 600);
  } catch {
    return '';
  }
}


const vehicleImages = {
  '2023 Toyota Corolla Cross Hybrid': '/assets/images/auto/toyota-corolla-cross-hybrid.svg',
  '2021 Volkswagen Golf 1.0 TSI': '/assets/images/auto/volkswagen-golf-tsi.svg',
  '2022 Honda Civic Eco': '/assets/images/auto/honda-civic-eco.svg',
  '2023 Renault Clio Icon': '/assets/images/auto/renault-clio-icon.svg',
  '2022 Hyundai Tucson 1.6 T-GDI': '/assets/images/auto/hyundai-tucson-tgdi.svg'
};

function getVehicleImage(name){
  if (vehicleImages[name]) return vehicleImages[name];

  if (name.includes('Toyota')) return '/assets/images/auto/toyota-corolla-cross-hybrid.svg';
  if (name.includes('Honda')) return '/assets/images/auto/honda-civic-eco.svg';
  if (name.includes('Hyundai')) return '/assets/images/auto/hyundai-tucson-tgdi.svg';
  if (name.includes('Renault')) return '/assets/images/auto/renault-clio-icon.svg';
  if (name.includes('Volkswagen')) return '/assets/images/auto/volkswagen-golf-tsi.svg';
  if (name.includes('Togg')) return '/assets/images/auto/togg-t10x.svg';
  if (name.includes('Tesla')) return '/assets/images/auto/tesla-model.svg';
  if (name.includes('BYD')) return '/assets/images/auto/byd-electric.svg';
  if (name.includes('Peugeot')) return '/assets/images/auto/peugeot-suv.svg';
  if (name.includes('Skoda')) return '/assets/images/auto/skoda-family.svg';
  if (name.includes('BMW')) return '/assets/images/auto/bmw-premium.svg';
  if (name.includes('Mercedes')) return '/assets/images/auto/mercedes-premium.svg';

  return '';
}


function getFilteredAutoResults(){
  let items = [...allResults];

  if (resultFilters.fuel !== 'all') {
    items = items.filter(vehicle => vehicle.fuel === resultFilters.fuel);
  }

  if (resultFilters.body !== 'all') {
    items = items.filter(vehicle => vehicle.body === resultFilters.body);
  }

  items.sort((a, b) => {
    if (resultFilters.sort === 'price_asc') return Number(a.price || 0) - Number(b.price || 0);
    if (resultFilters.sort === 'family') return Number(b.family || 0) - Number(a.family || 0);
    if (resultFilters.sort === 'city') return Number(b.city || 0) - Number(a.city || 0);
    if (resultFilters.sort === 'long') return Number(b.long || 0) - Number(a.long || 0);
    return Number(b.score || 0) - Number(a.score || 0);
  });

  return items;
}

function renderFilteredAutoResults(){
  const filtered = getFilteredAutoResults();
  lastResults = filtered;
  renderResults(filtered);
}



function renderOfferSkeleton(vehicleName) {
  return `
    <section class="dealer-offer-strip" data-offers-for="${escapeHtml(vehicleName)}">
      <div class="dealer-offer-header">
        <div>
          <strong>isteBul Verified Dealer Network</strong>
          <span>Bölgenizde uygun partner ve teklif seçenekleri kontrol ediliyor...</span>
        </div>
      </div>
    </section>
  `;
}

function renderDealerOffers(offers, vehicle, formData) {
  const city = String(formData.city || '').trim();

  if (!offers.length) {
    return `
      <div class="dealer-offer-header">
        <div>
          <strong>isteBul Verified Network</strong>
          <span>${city ? `${escapeHtml(city)} içinde` : 'Seçtiğiniz bölgede'} bu modele uygun doğrulanmış satıcı eşleşmesi hazırlanabilir.</span>
        </div>
        <button class="btn secondary auto-interest-btn" data-interest="dealer_match" data-vehicle="${escapeHtml(vehicle.name)}">
          Size özel teklif iste
        </button>
      </div>
      <div class="dealer-offer-list">
        <article class="dealer-offer-card dealer-offer-placeholder verified-network-card">
          <div class="verified-network-main">
            <span class="verified-kicker">PARTNER NETWORK</span>
            <strong>Ön doğrulanmış partner eşleşmesi</strong>
            <span>${city ? escapeHtml(city) : 'Seçilen bölge'} ${formData.district ? ` / ${escapeHtml(formData.district)}` : ''}</span>
            <small>Uygun bayi, teklif aralığı ve finansman ön değerlendirmesi talebiniz sonrası hazırlanır.</small>
          </div>
          <div class="verified-network-points">
            <span>Doğrulanmış bayi ağı</span>
            <span>Finansman ön değerlendirme</span>
            <span>Hızlı geri dönüş</span>
          </div>
          <div class="dealer-offer-price">
            <strong>Özel teklif</strong>
            <button class="btn primary auto-interest-btn" data-interest="dealer_match" data-vehicle="${escapeHtml(vehicle.name)}">
              Eşleşme iste
            </button>
          </div>
        </article>
      </div>
    `;
  }

  return `
    <div class="dealer-offer-header">
      <div>
        <strong>isteBul Verified Dealer Network</strong>
        <span>${offers.length} doğrulanmış teklif seçeneği bulundu${city ? ` • ${escapeHtml(city)}` : ''}</span>
      </div>
    </div>
    <div class="dealer-offer-list">
      ${offers.map((offer) => `
        <article class="dealer-offer-card">
          ${offer.image_url ? `<img src="${escapeHtml(offer.image_url)}" alt="${escapeHtml(offer.title)}" loading="lazy">` : ''}
          <div>
            <strong>${escapeHtml(offer.title || vehicle.name)}</strong>
            <span>${escapeHtml(offer.dealer_name || 'Satıcı')} • ${escapeHtml([offer.dealer_city, offer.dealer_district].filter(Boolean).join(' / '))}</span>
            <small>${offer.km ? `${formatter.format(offer.km)} km • ` : ''}${escapeHtml(offer.color || 'Renk bilgisi yok')}</small>
          </div>
          <div class="dealer-offer-price">
            <strong>${offer.price ? `${formatter.format(offer.price)} ₺` : 'Fiyat sorunuz'}</strong>
            ${offer.listing_url ? `<a href="${escapeHtml(offer.listing_url)}" target="_blank" rel="noopener">İlana git</a>` : ''}
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

async function hydrateDealerOffers(results, formData) {
  await Promise.all(results.map(async (vehicle) => {
    const container = document.querySelector(`[data-offers-for="${CSS.escape(vehicle.name)}"]`);
    if (!container) return;

    const offers = await getDealerOffers(vehicle, formData);
    container.innerHTML = renderDealerOffers(offers, vehicle, formData);
  }));
}

function buildEconomicVerdict(vehicle) {
  const total = Number(vehicle.costs?.total || 0);
  const depreciation = Number(vehicle.costs?.depreciation || 0);

  if (vehicle.score >= 90 && depreciation < total * 0.18) {
    return 'Ekonomik olarak güçlü karar. Kullanım uyumu ve toplam sahip olma maliyeti dengeli.';
  }

  if (depreciation > total * 0.22) {
    return 'Toplam maliyette değer kaybı etkisi yüksek olabilir. Sahiplik süresi önemli.';
  }

  if (vehicle.costs?.fuel > vehicle.costs?.maintenance) {
    return 'Operasyonel maliyet ağırlıklı bir profil. Kullanım yoğunluğunuz kritik.';
  }

  return 'Genel maliyet profili dengeli. Nihai karar için finansman ve teklif karşılaştırması önerilir.';
}

function renderResults(results) {
  const root = document.getElementById('auto-results');

  if (!Array.isArray(results) || !results.length) {
    root.innerHTML = `
      <article class="premium-result-card auto-empty-state">
        <span class="empty-state-icon" aria-hidden="true">iB</span>
        <p class="kicker">Sonuç bulunamadı</p>
        <h3>Bu kriterlerle güvenilir bir öneri oluşturamadık.</h3>
        <p>Aralığı biraz genişletin veya bütçe/yakıt tercihlerini güncelleyerek daha güçlü eşleşmeler görün.</p>
        <div class="empty-state-actions">
          <a class="btn primary" href="#auto-wizard">Kriterleri güncelle</a>
          <button class="btn secondary" type="button" data-reset-auto-filters>Filtreleri sıfırla</button>
        </div>
      </article>
    `;
    root.querySelector('[data-reset-auto-filters]')?.addEventListener('click', () => {
      resultFilters = { fuel: 'all', body: 'all', sort: 'score' };
      renderFilteredAutoResults();
    });
    return;
  }

  const formData = form ? readForm(form) : {};
  const pro = isProActive();
  const displayLimit = pro ? results.length : Math.min(FREE_LIMITS.maxAutoResultsPreview, results.length);
  const displayResults = results.slice(0, displayLimit);

  root.innerHTML = `${renderAutoUpgradeStrip()}
    <section class="auto-results-trust-banner" aria-label="Sonuç açıklaması">
      <div>
        <p class="kicker">Model önerisi</p>
        <h3>Bu sonuçlar canlı ilan değil, ihtiyaç profilinize göre hazırlanmış araç model önerileridir.</h3>
        <p>Size uygun gerçek araç seçenekleri için talep bırakabilir, uygun satıcılarla eşleşme desteği alabilirsiniz.</p>
      </div>
      <button type="button" class="btn primary auto-interest-btn" data-interest="vehicle_offer" data-vehicle="${escapeHtml(results[0]?.name || 'Araç önerisi')}">
        Uygun satıcı eşleşmesi iste
      </button>
    </section>

    <section class="auto-filter-toolbar" aria-label="Auto sonuç filtreleri">
      <div>
        <strong>${displayResults.length} / ${allResults.length || results.length} öneri gösteriliyor</strong>
        ${!pro && results.length > displayLimit ? '<span class="revenue-partner-strip"><strong>Pro</strong> ile +' + (results.length - displayLimit) + ' model daha</span>' : ''}
        <span>Sonuçları kullanım önceliğinize göre düzenleyin.</span>
      </div>

      <label>
        Yakıt
        <select data-auto-filter="fuel">
          <option value="all" ${resultFilters.fuel === 'all' ? 'selected' : ''}>Tümü</option>
          <option value="electric" ${resultFilters.fuel === 'electric' ? 'selected' : ''}>Elektrik</option>
          <option value="hybrid" ${resultFilters.fuel === 'hybrid' ? 'selected' : ''}>Hibrit</option>
          <option value="gasoline" ${resultFilters.fuel === 'gasoline' ? 'selected' : ''}>Benzin</option>
          <option value="diesel" ${resultFilters.fuel === 'diesel' ? 'selected' : ''}>Dizel</option>
        </select>
      </label>

      <label>
        Kasa
        <select data-auto-filter="body">
          <option value="all" ${resultFilters.body === 'all' ? 'selected' : ''}>Tümü</option>
          <option value="suv" ${resultFilters.body === 'suv' ? 'selected' : ''}>SUV</option>
          <option value="sedan" ${resultFilters.body === 'sedan' ? 'selected' : ''}>Sedan</option>
          <option value="hatchback" ${resultFilters.body === 'hatchback' ? 'selected' : ''}>Hatchback</option>
        </select>
      </label>

      <label>
        Sırala
        <select data-auto-filter="sort">
          <option value="score" ${resultFilters.sort === 'score' ? 'selected' : ''}>Karar skoruna göre</option>
          <option value="price_asc" ${resultFilters.sort === 'price_asc' ? 'selected' : ''}>En düşük fiyat</option>
          <option value="family" ${resultFilters.sort === 'family' ? 'selected' : ''}>Aile kullanımına göre</option>
          <option value="city" ${resultFilters.sort === 'city' ? 'selected' : ''}>Şehir kullanımına göre</option>
          <option value="long" ${resultFilters.sort === 'long' ? 'selected' : ''}>Uzun yola göre</option>
        </select>
      </label>
    </section>
  ` + displayResults.map((vehicle, index) => {
    const monthlyImpact = Math.round((Number(vehicle.costs.total || 0) / 12) / 100) * 100;
    const rankLabel = index === 0
      ? 'Genel uyum lideri'
      : index === 1
        ? 'Maliyet odaklı alternatif'
        : 'Alternatif senaryo';

    return `
    <article class="auto-market-card premium-result-card conversion-result-card">
      <div class="auto-market-media">
        <div class="auto-market-rank">${rankLabel}</div>
        <div class="auto-market-image">
          ${vehicle.image_url
            ? `<img src="${escapeHtml(vehicle.image_url)}" alt="${escapeHtml(vehicle.name)}" loading="lazy">`
            : `<div class="vehicle-placeholder"><span>${escapeHtml(vehicle.brand || vehicle.name.split(' ')[1] || 'Araç')}</span></div>`}
        </div>
      </div>

      <div class="auto-market-main">
        <div class="auto-market-title-row">
          <div>
            <h3>${escapeHtml(vehicle.name)}</h3>
            <p class="result-summary">
              ${vehicle.score >= 85
                ? 'Profiliniz için güçlü eşleşme. Toplam maliyet, kullanım uyumu ve finansman açısından öne çıkıyor.'
                : 'Profilinize uygun alternatif. Kullanım ve bütçe dengenize göre değerlendirildi.'}
            </p>
          </div>
          <div class="confidence">Analiz güveni: %${vehicle.confidence}</div>
        </div>

        <div class="auto-market-tags">
          <span>AI analiz</span>
          <span>Toplam maliyet</span>
          <span>Finansman etkisi</span>
        </div>

        <div class="auto-market-insights">
          <div class="analysis-box">
            <strong>Güçlü taraflar</strong>
            <ul>${vehicle.reasons.slice(0, 3).map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
          </div>

          <div class="risk-box">
            <strong>Dikkat noktaları</strong>
            <ul>${vehicle.risks.slice(0, 2).map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
          </div>
        </div>

        <div class="analysis-box">
          <strong>AI uzman yorumu</strong>
          <p>${escapeHtml(buildEconomicVerdict(vehicle))}</p>
        </div>
      </div>

      <aside class="auto-market-decision">
        <div class="auto-market-score">
          <strong>${vehicle.score}</strong>
          <span>/100 karar skoru</span>
        </div>

        <div class="monthly-impact">
          <span>Aylık bütçe etkisi</span>
          <strong>${formatter.format(monthlyImpact)} ₺</strong>
        </div>

        <div class="cost auto-market-cost">
          <p><strong>12 aylık tahmini maliyet</strong></p>
          <p>${formatter.format(vehicle.costs.total)} ₺</p>
          <small>
            Yakıt ${formatter.format(vehicle.costs.fuel)} ₺ •
            Sigorta ${formatter.format(vehicle.costs.insurance)} ₺ •
            Kasko ${formatter.format(vehicle.costs.kasko || 0)} ₺ •
            Bakım ${formatter.format(vehicle.costs.maintenance)} ₺ •
            Vergi ${formatter.format(vehicle.costs.tax || 0)} ₺ •
            Lastik ${formatter.format(vehicle.costs.tires || 0)} ₺ •
            Değer kaybı ${formatter.format(vehicle.costs.depreciation || 0)} ₺
          </small>
        </div>

        ${vehicle.score >= 85 ? `
          <div class="auto-hot-banner finance-comparison-widget">
            <span class="finance-kicker">FİNANSMAN EŞLEŞMESİ</span>
            <strong>Ön değerlendirme hazır</strong>
            <div class="finance-widget-grid">
              <span><b>%3.19+</b><small>aylık oran</small></span>
              <span><b>48 aya</b><small>vade opsiyonu</small></span>
              <span><b>5</b><small>partner kurum</small></span>
            </div>
            <button class="btn secondary finance-compare-trigger" data-vehicle="${escapeHtml(vehicle.name)}">
              Finansmanı karşılaştır
            </button>
          </div>
        ` : ''}
      </aside>

      ${renderOfferSkeleton(vehicle.name)}

      <div class="auto-market-actions">
        <button class="btn primary auto-interest-btn" data-interest="vehicle_offer" data-vehicle="${escapeHtml(vehicle.name)}">
          Teklif sürecini başlat
        </button>

        <button class="btn secondary auto-compare-btn" data-result-index="${index}" data-vehicle="${escapeHtml(vehicle.name)}">
          Karşılaştır
        </button>

        <button class="btn secondary auto-shortlist-btn" data-result-index="${index}" data-vehicle="${escapeHtml(vehicle.name)}">
          Shortlist'e ekle
        </button>

        <button class="btn secondary auto-whatsapp-btn" data-vehicle="${escapeHtml(vehicle.name)}">
          Uzmanla görüş
        </button>

        <button class="btn secondary finance-compare-trigger" data-vehicle="${escapeHtml(vehicle.name)}">
          Finansman etkisi
        </button>

        <p class="cta-microcopy">Ücretsiz ön değerlendirme • zorunlu satın alma yok</p>
      </div>
    </article>
  `}).join('') + `
    <section class="premium-ai-summary ai-explanation-box${pro ? '' : ' revenue-results-locked'}" data-ai-explanation>
      <h3>Karşılaştırmalı karar özeti</h3>
      <p>${pro ? 'Karar özeti hazırlanıyor...' : 'Pro ile gelişmiş AI karar özetini açın.'}</p>

      <div class="ai-refinement-tools">
        <div class="ai-refinement-chips">
          <button type="button" class="ai-chip" data-ai-refine="Daha ekonomik alternatifleri değerlendir.">
            Daha ekonomik
          </button>

          <button type="button" class="ai-chip" data-ai-refine="SUV yerine sedan odaklı değerlendirme yap.">
            Sedan odaklı
          </button>

          <button type="button" class="ai-chip" data-ai-refine="Hybrid seçenek önceliğiyle yeniden yorumla.">
            Hybrid odaklı
          </button>

          <button type="button" class="ai-chip" data-ai-refine="Aylık bütçe etkisini düşürmeye odaklan.">
            Daha düşük aylık bütçe
          </button>
        </div>

        <div class="ai-refinement-input">
          <input
            type="text"
            id="ai-refinement-input"
            placeholder="Kararı rafine edin (örn: 2 çocuklu aile için yeniden değerlendir)"
          />
          <button type="button" class="btn primary" id="ai-refinement-submit">
            Yorumu güncelle
          </button>
        </div>

        <p class="ai-trust-note">
          Bu değerlendirme tercihlerinize göre senaryo bazlı karar modelidir; canlı bayi fiyatı veya bağlayıcı finansman teklifi değildir.
        </p>
      </div>
    </section>
  `;

  root.querySelectorAll('[data-auto-filter]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const key = event.target.dataset.autoFilter;
      if (!key) return;
      resultFilters[key] = event.target.value;
      renderFilteredAutoResults();
    });
  });

  const aiBox = root.querySelector('[data-ai-explanation]');

  let aiSummaryBusy = false;

  const setAiBusy = (busy) => {
    aiSummaryBusy = busy;
    aiBox?.querySelectorAll('button').forEach((button) => {
      button.disabled = busy;
    });
  };

  const updateAiSummary = async (refinement = '', activeButton = null) => {
    if (!aiBox || !results[0] || aiSummaryBusy) return;

    const paragraph = aiBox.querySelector('p');
    aiBox.querySelectorAll('[data-ai-refine]').forEach((button) => {
      button.classList.toggle('is-active', button === activeButton);
    });

    setAiBusy(true);

    if (paragraph) {
      paragraph.textContent = refinement
        ? 'Karar özeti rafine ediliyor...'
        : 'Karar özeti hazırlanıyor...';
    }

    const text = await getAiExplanation(results, formData, refinement);

    setAiBusy(false);

    if (!text) {
      if (!refinement) aiBox.remove();
      else if (paragraph) paragraph.textContent = 'Yorum şu anda güncellenemedi. Mevcut karşılaştırmayı kullanarak devam edebilirsiniz.';
      return;
    }

    if (paragraph) paragraph.textContent = text;
  };

  hydrateDealerOffers(results, formData);
  updateAiSummary();

  aiBox?.querySelectorAll('[data-ai-refine]').forEach((button) => {
    button.addEventListener('click', () => {
      updateAiSummary(button.dataset.aiRefine || '', button);
    });
  });

  const refinementInput = aiBox?.querySelector('#ai-refinement-input');
  const refinementSubmit = aiBox?.querySelector('#ai-refinement-submit');

  const submitCustomRefinement = () => {
    const value = String(refinementInput?.value || '').trim().slice(0, 240);
    if (!value) return;
    updateAiSummary(value);
  };

  refinementSubmit?.addEventListener('click', submitCustomRefinement);

  refinementInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitCustomRefinement();
    }
  });
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

document.querySelectorAll('#gelir .btn.secondary').forEach((btn, index) => {
  const types = ['finance', 'insurance', 'report'];
  btn.dataset.interest = types[index];
  btn.classList.add('auto-interest-btn');
});


const wizard = document.getElementById('auto-wizard');

const wizardSteps = [
  {
    key: 'budget',
    title: 'Toplam araç bütçeniz nedir?',
    description: 'Satın alma ve finansman dengenizi doğru kurmak için yaklaşık bütçenizi seçin.',
    options: [
      { label: '500 bin TL altı', value: '500000', note: 'Ekonomik başlangıç seviyesi' },
      { label: '500 bin – 1 milyon TL', value: '900000', note: 'Ulaşılabilir güçlü seçenekler' },
      { label: '1 – 2 milyon TL', value: '1500000', note: 'Dengeli ve geniş pazar' },
      { label: '2 milyon TL+', value: '2500000', note: 'Premium seçenekler' },
      { label: 'Kendi bütçemi gireceğim', value: 'custom', note: 'Net bütçe ile daha hassas analiz' }
    ],
    custom: {
      type: 'text',
      placeholder: 'Örn. 1350000',
      min: 250000,
      max: 20000000,
      suffix: 'TL'
    }
  },
  {
    key: 'usage',
    title: 'Aracı en çok nasıl kullanacaksınız?',
    description: 'Karar analizi kullanım senaryonuza göre segment ve maliyet dengesini değerlendirir.',
    options: [
      { label: 'Aile', value: 'family', note: 'Geniş iç hacim ve güvenlik' },
      { label: 'Şehir içi', value: 'city', note: 'Yakıt ve park kolaylığı' },
      { label: 'Uzun yol', value: 'long', note: 'Konfor ve düşük tüketim' },
      { label: 'İş', value: 'business', note: 'Prestij ve kullanım verimliliği' }
    ]
  },
  {
    key: 'body',
    title: 'Hangi araç tipi size daha yakın?',
    description: 'Kararsızsanız SUV seçebilirsiniz; AI diğer sinyallerle denge kurar.',
    options: [
      { label: 'SUV', value: 'suv', note: 'Yüksek sürüş ve aile kullanımı' },
      { label: 'Sedan', value: 'sedan', note: 'Konfor ve uzun yol dengesi' },
      { label: 'Hatchback', value: 'hatchback', note: 'Şehir içi pratiklik' }
    ]
  },
  {
    key: 'fuel',
    title: 'Yakıt tercihiniz nedir?',
    description: 'Yakıt tercihi toplam sahip olma maliyetini ciddi şekilde etkiler.',
    options: [
      { label: 'Fark etmez', value: 'any', note: 'AI en dengeli seçeneği bulsun' },
      { label: 'Hibrit', value: 'hybrid', note: 'Şehir içi tasarruf odağı' },
      { label: 'Elektrikli', value: 'electric', note: 'Düşük kullanım maliyeti' },
      { label: 'Benzinli', value: 'gasoline', note: 'Geniş seçenek ve servis ağı' },
      { label: 'Dizel', value: 'diesel', note: 'Uzun yol ve yüksek kilometre' }
    ]
  },
  {
    key: 'km',
    title: 'Yılda yaklaşık kaç km yaparsınız?',
    description: 'Kilometre arttıkça yakıt, bakım ve değer kaybı daha kritik hale gelir.',
    options: [
      { label: '10.000 km altı', value: '8000', note: 'Düşük kullanım' },
      { label: '10.000 – 20.000 km', value: '15000', note: 'Ortalama kullanım' },
      { label: '20.000 – 35.000 km', value: '28000', note: 'Yoğun kullanım' },
      { label: '35.000 km+', value: '40000', note: 'Profesyonel / yüksek kullanım' },
      { label: 'Tam km gireceğim', value: 'custom', note: 'Net kilometre ile daha hassas maliyet' }
    ],
    custom: {
      type: 'text',
      placeholder: 'Örn. 22500',
      min: 1000,
      max: 100000,
      suffix: 'km'
    }
  },
  {
    key: 'location',
    title: 'Aracı hangi şehirde arıyorsunuz?',
    description: 'Gerçek teklif ve satıcı eşleşmesi için şehir bilgisi gereklidir. İlçe opsiyoneldir.',
    options: [
      { label: 'İzmir', value: 'İzmir', note: 'İzmir ve çevresindeki satıcılar' },
      { label: 'İstanbul', value: 'İstanbul', note: 'İstanbul Avrupa / Anadolu' },
      { label: 'Ankara', value: 'Ankara', note: 'Ankara ve çevresi' },
      { label: 'Antalya', value: 'Antalya', note: 'Antalya ve çevresi' },
      { label: 'Başka şehir', value: 'custom', note: 'Şehir adını kendim gireceğim' }
    ],
    custom: {
      type: 'text',
      placeholder: 'Örn. Bursa',
      min: 2,
      max: 40,
      suffix: 'il'
    },
    optionalDistrict: true
  },
  {
    key: 'loan',
    title: 'Finansman kullanacak mısınız?',
    description: 'Kredi tercihi aylık yük ve toplam maliyet analizini etkiler.',
    options: [
      { label: 'Evet', value: 'yes', note: 'Finansman etkisi dahil edilsin' },
      { label: 'Hayır', value: 'no', note: 'Peşin alım dengesiyle analiz edilsin' }
    ]
  }
];

const wizardState = {};
let wizardIndex = 0;

function syncWizardToForm() {
  Object.entries(wizardState).forEach(([key, value]) => {
    if (key.endsWith('_custom')) return;

    if (key === 'location') {
      const cityInput = form.elements.city;
      const districtInput = form.elements.district;
      const cityValue = value === 'custom' ? wizardState.location_custom : value;
      if (cityInput) cityInput.value = cityValue || '';
      if (districtInput) districtInput.value = wizardState.district || '';
      return;
    }

    const input = form.elements[key];
    if (!input) return;

    if (value === 'custom') {
      const customValue = wizardState[`${key}_custom`];
      if (customValue) input.value = customValue;
      return;
    }

    input.value = value;
  });
}

function renderWizard() {
  if (!wizard) return;

  const step = wizardSteps[wizardIndex];
  const progress = Math.round(((wizardIndex + 1) / wizardSteps.length) * 100);
  const selected = wizardState[step.key];
  const isCustom = selected === 'custom';
  const canProceed = Boolean(selected);
  const customValue = wizardState[`${step.key}_custom`] || '';

  wizard.innerHTML = `
    <div class="wizard-progress">
      <div class="wizard-progress-text">
        <span>Adım ${wizardIndex + 1}/${wizardSteps.length}</span>
        <span>%${progress} tamamlandı</span>
      </div>
      <div class="wizard-progress-bar">
        <div class="wizard-progress-fill" style="width:${progress}%"></div>
      </div>
    </div>

    <div class="wizard-question">
      <p class="kicker">Karar danışmanı</p>
      <h3>${escapeHtml(step.title)}</h3>
      <p>${escapeHtml(step.description)}</p>
    </div>

    <div class="wizard-options">
      ${step.options.map(option => `
        <button type="button" class="wizard-option ${selected === option.value ? 'is-selected' : ''}" data-wizard-value="${escapeHtml(option.value)}">
          ${escapeHtml(option.label)}
          <small>${escapeHtml(option.note)}</small>
        </button>
      `).join('')}
    </div>

    ${step.custom && isCustom ? `
      <label class="wizard-custom-input">
        <span>${step.key === 'budget' ? 'Net bütçenizi girin' : step.key === 'km' ? 'Yıllık net kilometrenizi girin' : 'Şehir adını girin'}</span>
        <div>
          <input
            type="${step.custom.type}"
            ${step.key === 'location' ? '' : 'inputmode="numeric" pattern="[0-9]*"'}
            ${step.key === 'location' ? `minlength="${step.custom.min}" maxlength="${step.custom.max}"` : `min="${step.custom.min}" max="${step.custom.max}"`}
            placeholder="${escapeHtml(step.custom.placeholder)}"
            value="${escapeHtml(customValue)}"
            data-wizard-custom
          >
          <strong>${escapeHtml(step.custom.suffix)}</strong>
        </div>
      </label>
    ` : ''}

    ${step.optionalDistrict ? `
      <label class="wizard-custom-input">
        <span>İlçe (opsiyonel)</span>
        <div>
          <input
            type="text"
            maxlength="60"
            placeholder="Örn. Bornova"
            value="${escapeHtml(wizardState.district || '')}"
            data-wizard-district
          >
          <strong>ilçe</strong>
        </div>
      </label>
    ` : ''}

    <div class="wizard-actions">
      <button type="button" class="btn secondary" data-wizard-back ${wizardIndex === 0 ? 'disabled' : ''}>Geri</button>
      <button type="button" class="btn primary" data-wizard-next ${canProceed ? '' : 'disabled'}>
        ${wizardIndex === wizardSteps.length - 1 ? 'Analizi başlat' : 'Devam et'}
      </button>
    </div>
  `;
}

function showWizardInlineError(message) {
  if (!wizard) return;
  let banner = wizard.querySelector('.wizard-inline-error');
  if (!banner) {
    banner = document.createElement('p');
    banner.className = 'wizard-inline-error';
    banner.setAttribute('role', 'alert');
    wizard.querySelector('.wizard-actions')?.before(banner);
  }
  banner.textContent = message;
  banner.hidden = false;
}

function clearWizardInlineError() {
  const banner = wizard?.querySelector('.wizard-inline-error');
  if (banner) banner.hidden = true;
}

function advanceWizard() {
  const step = wizardSteps[wizardIndex];
  clearWizardInlineError();

  if (!wizardState[step.key]) {
    showWizardInlineError('Lütfen devam etmeden önce bir seçenek seçin.');
    return;
  }

  if (wizardState[step.key] === 'custom') {
    const visibleCustomInput = wizard?.querySelector('[data-wizard-custom]');
    const rawCustomValue = String(
      visibleCustomInput?.value ||
      wizardState[`${step.key}_custom`] ||
      ''
    ).trim();

    if (step.key === 'location') {
      const cleanLocation = String(rawCustomValue || '').trim();
      if (cleanLocation.length < step.custom.min || cleanLocation.length > step.custom.max) {
        showWizardInlineError('Lütfen geçerli bir şehir adı girin.');
        return;
      }
      wizardState[`${step.key}_custom`] = cleanLocation;
    } else {
      const numericValue = Number(rawCustomValue);

      if (!rawCustomValue || Number.isNaN(numericValue)) {
        showWizardInlineError('Lütfen geçerli bir değer girin.');
        return;
      }

      if (step.custom) {
        if (numericValue < step.custom.min || numericValue > step.custom.max) {
          showWizardInlineError(`Lütfen ${step.custom.min} - ${step.custom.max} aralığında bir değer girin.`);
          return;
        }
      }

      wizardState[`${step.key}_custom`] = rawCustomValue;
    }
  }

  syncWizardToForm();

  if (wizardIndex < wizardSteps.length - 1) {
    wizardIndex += 1;
    renderWizard();
    trackAutoEvent('auto_wizard_step', {
      step: wizardIndex + 1,
      key: wizardSteps[wizardIndex].key
    });
    return;
  }

  form.requestSubmit();
}

if (wizard) {
  renderWizard();

  wizard.addEventListener('input', (event) => {
    const customInput = event.target.closest('[data-wizard-custom]');
    const districtInput = event.target.closest('[data-wizard-district]');

    const step = wizardSteps[wizardIndex];

    if (districtInput) {
      wizardState.district = String(districtInput.value || '').trim().slice(0, 60);
      syncWizardToForm();
      return;
    }

    if (!customInput) return;

    const rawValue = String(customInput.value || '');
    const cleanValue = step.key === 'location'
      ? rawValue.trim().slice(0, step.custom?.max || 40)
      : rawValue.replace(/\D/g, '');

    wizardState[`${step.key}_custom`] = cleanValue;
    customInput.value = cleanValue;
    syncWizardToForm();

    const nextButton = wizard.querySelector('[data-wizard-next]');
    if (nextButton) {
      nextButton.disabled = false;
    }
  });

  wizard.addEventListener('click', (event) => {
    const option = event.target.closest('.wizard-option');
    const back = event.target.closest('[data-wizard-back]');
    const next = event.target.closest('[data-wizard-next]');

    if (option) {
      const step = wizardSteps[wizardIndex];
      wizardState[step.key] = option.dataset.wizardValue;
      syncWizardToForm();
      renderWizard();

      if (!autoFormStarted) {
        autoFormStarted = true;
        trackAutoEvent('auto_form_started');
      }

      return;
    }

    if (back && wizardIndex > 0) {
      wizardIndex -= 1;
      renderWizard();
      return;
    }

    if (next) {
      if (next.disabled) return;
      advanceWizard();
    }
  });
}


setupAutoMobileNav();
initAutoEntitlements();
loadAutoRuntimeConfig();
if (localStorage.getItem('istebu_cookie_consent') === 'accepted') {
  analytics.init();
}
trackAutoEvent('auto_page_view');

document.addEventListener('click', (event) => {
  const checkoutLink = event.target.closest('[data-auto-checkout-intent]');
  if (!checkoutLink) return;
  try {
    sessionStorage.setItem('istebul_checkout_intent', JSON.stringify({ billing: 'monthly', useTrial: true }));
  } catch {
    // ignore
  }
});

const form = document.getElementById('auto-form');
let autoFormStarted = false;
let autoAnalysisRunning = false;
let autoAnalysisTimer = null;
let lastResults = [];
let allResults = [];
let resultFilters = {
  fuel: 'all',
  body: 'all',
  sort: 'score'
};

form.addEventListener('input', () => {
  if (!autoFormStarted) {
    autoFormStarted = true;
    trackAutoEvent('auto_form_started');
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (autoAnalysisRunning) return;
  autoAnalysisRunning = true;

  trackAutoEvent('auto_form_submitted');

  const formData = readForm(form);
  localStorage.setItem('istebul_auto_lead_payload', JSON.stringify(formData));
  const vehicleCatalog = await getVehicleCatalog();
  const results = recommendVehicles(formData, vehicleCatalog);
  lastResults = results;
  allResults = [...results];

  trackAutoEvent('auto_analysis_started', formData);

  renderLoading();

  if (autoAnalysisTimer) clearTimeout(autoAnalysisTimer);

  autoAnalysisTimer = setTimeout(() => {
    try {
      document.getElementById('analiz').scrollIntoView({ behavior: 'smooth' });
      trackAutoEvent('auto_results_rendered', { count: results.length });
      renderResults(results);

      try {
        if (window.app?.currentUser?.id && typeof window.app.saveDecisionHistory === 'function' && results.length) {
          window.app.saveDecisionHistory({
            id: `auto-${Date.now()}`,
            categoryId: 'auto',
            categoryName: 'Araç Karar Analizi',
            createdAt: new Date().toISOString(),
            rawAnswers: formData,
            answers: formData,
            summary: `${results[0].name} kullanım ve bütçe profilinize göre en güçlü araç eşleşmesi olarak öne çıktı.`,
            insight: 'isteBul Auto karar analizi',
            dataHealth: 'estimated',
            recommendations: results.map((vehicle) => ({
              name: vehicle.name,
              score: vehicle.score,
              price: vehicle.price || vehicle.costs?.purchase || 0,
              yearlyCost: vehicle.costs?.annual || 0,
              financeComparisons: [{
                monthlyPayment: Math.round((Number(vehicle.costs?.total || 0) / 12) || 0)
              }]
            }))
          });
        }
      } catch (_) {}

      trackUniqueAutoEvent('auto_results_view', formData, 'results');
    } finally {
      autoAnalysisRunning = false;
      autoAnalysisTimer = null;
    }
  }, 2200);
});


function readAutoStorage(key){
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAutoStorage(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function toAutoFavorite(vehicle){
  return {
    id: `auto-${vehicle.name}`,
    title: vehicle.name,
    location: 'isteBul Auto AI analizi',
    price: Number(vehicle.price || vehicle.costs?.purchase || 0),
    category: 'arac',
    external_url: '',
    score: vehicle.score,
    autoGenerated: true
  };
}

function toggleAutoFavoriteFallback(vehicle){
  const key = 'istebu_favorites';
  const items = readAutoStorage(key);
  const id = `auto-${vehicle.name}`;
  const exists = items.some(item => String(item.id) === id);

  if (exists) {
    writeAutoStorage(key, items.filter(item => String(item.id) !== id));
    alert('Araç shortlist listenizden çıkarıldı.');
    return false;
  }

  writeAutoStorage(key, [...items, toAutoFavorite(vehicle)]);
  alert('Araç shortlist listenize eklendi.');
  return true;
}


function getAutoFallbackImage(name){
  name = String(name || '');

  if (name.includes('Toyota')) return '/assets/images/auto/toyota-corolla-cross-hybrid.svg';
  if (name.includes('Honda')) return '/assets/images/auto/honda-civic-eco.svg';
  if (name.includes('Hyundai')) return '/assets/images/auto/hyundai-tucson-tgdi.svg';
  if (name.includes('Renault')) return '/assets/images/auto/renault-clio-icon.svg';
  if (name.includes('Volkswagen')) return '/assets/images/auto/volkswagen-golf-tsi.svg';
  if (name.includes('Togg')) return '/assets/images/auto/togg-t10x.svg';
  if (name.includes('Tesla')) return '/assets/images/auto/tesla-model.svg';
  if (name.includes('BYD')) return '/assets/images/auto/byd-electric.svg';
  if (name.includes('Peugeot')) return '/assets/images/auto/peugeot-suv.svg';
  if (name.includes('Skoda')) return '/assets/images/auto/skoda-family.svg';
  if (name.includes('BMW')) return '/assets/images/auto/bmw-premium.svg';
  if (name.includes('Mercedes')) return '/assets/images/auto/mercedes-premium.svg';

  return '';
}

function goToComparisonPage(){
  window.location.assign('/karsilastir');
}

function addAutoComparisonFallback(vehicle){
  const key = 'istebu_comparison_items';
  const items = readAutoStorage(key);
  const signature = `auto-${vehicle.name}`;

  if (items.some(item => item.signature === signature)) {
    goToComparisonPage();
    return;
  }

  if (items.length >= 4) {
    alert('Karşılaştırma listesine en fazla 4 seçenek eklenebilir.');
    return;
  }

  const score = Number(vehicle.score || 0);

  writeAutoStorage(key, [...items, {
    id: `auto-compare-${vehicle.name}`,
    signature,
    categoryId: 'arac',
    categoryName: 'Araç Karşılaştırma',
    sourceType: 'isteBul Auto',
    title: vehicle.name,
    image: getAutoFallbackImage(vehicle.name),
    score,
    riskLevel: score >= 85 ? 'Düşük risk' : score >= 70 ? 'Dengeli' : 'Kontrol gerekli',
    price: Number(vehicle.price || vehicle.costs?.purchase || 0),
    periodicCost: Number(vehicle.costs?.annual || 0),
    yearlyCost: Number(vehicle.costs?.annual || 0),
    monthlyPayment: Math.round((Number(vehicle.costs?.total || 0) / 12) || 0),
    tags: [vehicle.fuel || 'Araç', vehicle.segment || 'AI analiz'],
    comment: vehicle.reasons?.[0] || 'Araç karar analizi sonucu önerildi.',
    reasons: vehicle.reasons || [],
    risks: vehicle.risks || []
  }]);

  goToComparisonPage();
}

document.addEventListener('click', async (event) => {
  const compareBtn = event.target.closest('.auto-compare-btn');

  if (compareBtn) {
    const vehicleIndex = Number(compareBtn.dataset.resultIndex);
    const vehicleName = compareBtn.dataset.vehicle;
    const vehicle = lastResults[vehicleIndex] || lastResults.find(v => v.name === vehicleName);

    if (vehicle) {
      addAutoComparisonFallback(vehicle);
    }

    return;
  }

  const shortlistBtn = event.target.closest('.auto-shortlist-btn');

  if (shortlistBtn) {
    const vehicleIndex = Number(shortlistBtn.dataset.resultIndex);
    const vehicleName = shortlistBtn.dataset.vehicle;
    const vehicle = lastResults[vehicleIndex] || lastResults.find(v => v.name === vehicleName);

    if (vehicle) {
      const added = window.app?.toggleAutoFavorite
        ? window.app.toggleAutoFavorite(vehicle)
        : toggleAutoFavoriteFallback(vehicle);
      shortlistBtn.textContent = added ? "Shortlist'te" : "Shortlist'e ekle";
    }

    return;
  }

  const whatsappBtn = event.target.closest('.auto-whatsapp-btn');

  if (whatsappBtn) {
    const vehicle = whatsappBtn.dataset.vehicle || 'vehicle';
    const phone = autoRuntimeConfig.whatsappPhone;

    const formData = readForm(document.getElementById('auto-form'));

    const message = `Merhaba, isteBul Auto analizimde şu araç ilgimi çekti:

${vehicle}

Bütçem: ${formData.budget || '-'} TL
Kullanım: ${formData.usage || '-'}
Yakıt: ${formData.fuel || '-'}
Yıllık km: ${formData.km || '-'}
Kredi: ${formData.loan || '-'}

Destek almak istiyorum.`;

    if (!phone) {
      alert('WhatsApp numarası tanımlı değil.');
      return;
    }

    trackUniqueAutoEvent('auto_whatsapp_click', { vehicle }, vehicle);

    try {
      await callAutoIntake({
        type: 'event',
        event_name: 'auto_whatsapp_lead_intent',
        metadata: {
          ...formData,
          interest_type: 'whatsapp',
          vehicle,
          session_id: getSessionId()
        }
      });
    } catch {}

    window.open(
      'https://wa.me/' + phone + '?text=' + encodeURIComponent(message),
      '_blank'
    );
  }

  const financeCompareBtn = event.target.closest('.finance-compare-trigger');
  if (financeCompareBtn) {
    openFinanceCompareModal(financeCompareBtn.dataset.vehicle || '');
    return;
  }

  const interestBtn = event.target.closest('.auto-interest-btn');

  if (interestBtn) {
    const interest = interestBtn.dataset.interest || 'finance';
    const vehicle = interestBtn.dataset.vehicle || '';

    if (interest === 'premium_report' && !isProActive()) {
      trackAutoEvent('auto_premium_paywall_view', { interest_type: interest, vehicle });
      openAutoUpgradePaywall('premium_report');
      return;
    }

    if (interest === 'finance' || interest === 'finance_review') {
      trackAutoEvent('auto_finance_click', { interest_type: interest, vehicle });
      openFinanceCompareModal(vehicle);
      return;
    }

    const eventMap = {
      insurance: 'auto_insurance_click',
      vehicle_offer: 'auto_vehicle_offer_click',
      premium_report: 'auto_premium_report_click'
    };

    if (eventMap[interest]) {
      trackAutoEvent(eventMap[interest], { interest_type: interest, vehicle });
    }

    openLeadModal(interest, vehicle);
  }
});

document.addEventListener('click', (event) => {
  if (event.target.closest('.finance-prequal-btn')) {
    return;
  }

  const financeButton = event.target.closest('[data-interest="finance"], [data-interest="finance_review"], .finance-compare-trigger');
  if (!financeButton) return;

  event.preventDefault();
  event.stopPropagation();

  openFinanceCompareModal(financeButton.dataset.vehicle || '');
}, true);

// Expose finance comparison opener for delegated CTA handling and runtime diagnostics.
window.openFinanceCompareModal = openFinanceCompareModal;
