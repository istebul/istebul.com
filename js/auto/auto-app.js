import { recommendVehicles } from './auto-ai.js';

const formatter = new Intl.NumberFormat('tr-TR');

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

async function callAutoIntake(payload) {
  const supabaseUrl = window.__env?.SUPABASE_URL;
  const supabaseKey = window.__env?.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  const response = await fetch(`${supabaseUrl}/functions/v1/auto-intake`, {
    method: 'POST',
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
}

async function trackAutoEvent(eventName, metadata = {}) {
  try {
    await callAutoIntake({
      type: 'event',
      event_name: eventName,
      email: localStorage.getItem('istebul_auto_lead_email') || metadata.email || null,
      phone: metadata.phone || null,
      metadata: {
        session_id: getSessionId(),
        ...metadata
      }
    });
  } catch {}
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
      <p class="kicker">AI karar motoru çalışıyor</p>
      <h3>Araç profiliniz ve toplam maliyet etkisi analiz ediliyor...</h3>
      <p class="loading-copy">Bütçe, kullanım, yakıt tercihi, yıllık kilometre ve finansman durumunuz birlikte değerlendiriliyor.</p>
      <ul class="ai-loading-steps">
        <li>✓ İhtiyaç profiliniz oluşturuluyor</li>
        <li>✓ Uygun araç segmentleri taranıyor</li>
        <li>✓ Toplam sahip olma maliyeti hesaplanıyor</li>
        <li>✓ Finansman ve kullanım riski modelleniyor</li>
        <li>✓ Size en uygun 3 seçenek hazırlanıyor</li>
      </ul>
    </div>
  `;
}

async function updateLeadInterest(phone, interestType, vehicle = '', options = {}) {
  const email = localStorage.getItem('istebul_auto_lead_email');
  const storedPayload = safeJsonParse(localStorage.getItem('istebul_auto_lead_payload'), {});

  await callAutoIntake({
    type: 'lead',
    email: email || null,
    phone,
    turnstile_token: options.turnstileToken || '',
    formData: {
      ...storedPayload,
      phone,
      interest_type: interestType,
      vehicle
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

    try {
      window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        size: 'invisible',
        callback: (token) => {
          container.remove();
          resolve(token || '');
        },
        'error-callback': () => {
          container.remove();
          resolve('');
        },
        'timeout-callback': () => {
          container.remove();
          resolve('');
        }
      });

      window.turnstile.execute(container);
    } catch {
      container.remove();
      resolve('');
    }
  });
}

function openLeadModal(type, vehicle = '') {
  trackAutoEvent('auto_modal_open', { interest_type: type, vehicle });
  const existing = document.getElementById('lead-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'lead-modal';
  modal.className = 'lead-modal';

  modal.innerHTML = `
    <div class="lead-modal-card">
      <div class="lead-modal-trust">
        <p class="kicker">Uzman değerlendirme</p>
        <h3>Size uygun seçenekleri birlikte değerlendirelim.</h3>
        <p>Analiz sonucunuza göre finansman, sigorta ve satın alma seçeneklerini daha net değerlendirmeniz için uzman ekibimiz sizinle iletişime geçebilir.</p>

        <div class="lead-trust-points">
          <span>✓ En kısa sürede geri dönüş</span>
          <span>✓ Bilgileriniz güvenle işlenir</span>
          <span>✓ Kredi, sigorta ve bayi yönlendirmesi</span>
        </div>
      </div>

      <form id="phone-lead-form">
        <input name="vehicle" type="hidden" value="${escapeHtml(vehicle)}">
        <input name="name" type="text" placeholder="Adınız (opsiyonel)">
        <input name="phone" type="tel" required placeholder="05xx xxx xx xx">
        <select name="best_time">
          <option value="">En iyi aranma zamanı</option>
          <option value="morning">Sabah</option>
          <option value="afternoon">Öğleden sonra</option>
          <option value="evening">Akşam</option>
        </select>
        <button class="btn primary" type="submit">Uzman değerlendirmesi iste</button>
      </form>
      <button class="btn secondary" id="close-lead-modal">Kapat</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('close-lead-modal').onclick = () => modal.remove();

  let leadSubmitting = false;

  document.getElementById('phone-lead-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    if (leadSubmitting) return;
    leadSubmitting = true;

    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Güvenli şekilde kaydediliyor...';
    }

    const leadData = new FormData(event.currentTarget);
    const phone = leadData.get('phone');
    const selectedVehicle = leadData.get('vehicle') || vehicle;
    const turnstileToken = await getTurnstileToken();

    trackAutoEvent('auto_modal_submitted', { phone, interest_type: type, vehicle: selectedVehicle });
    trackAutoEvent('auto_lead_submit', { phone, interest_type: type, vehicle: selectedVehicle });

    try {
      await updateLeadInterest(phone, type, selectedVehicle, { turnstileToken });
    } catch {}

    modal.innerHTML = `
      <div class="lead-modal-card">
        <h3>Uzman değerlendirme talebiniz alındı</h3>
        <p>Uzman ekibimiz analiz sonucunuza göre uygun seçenekleri değerlendirip sizinle iletişime geçecek.</p>
      </div>
    `;
  });
}


async function getAiExplanation(results, formData = {}) {
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
      'Görev: seçenekleri karşılaştırmalı yorumla, tekrar bilgi listeleme yapma.'
    ].join('\\n');

    const res = await fetch('/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) return '';
    const data = await res.json();
    return String(data.result || '').trim().slice(0, 900);
  } catch {
    return '';
  }
}

function renderResults(results) {
  const root = document.getElementById('auto-results');

  if (!Array.isArray(results) || !results.length) {
    root.innerHTML = '<article class="premium-result-card"><h3>Uygun sonuç bulunamadı</h3><p>Seçimlerinizi değiştirerek yeniden analiz başlatabilirsiniz.</p></article>';
    return;
  }

  const formData = form ? readForm(form) : {};

  root.innerHTML = results.map((vehicle, index) => {
    const monthlyImpact = Math.round((Number(vehicle.costs.total || 0) / 12) / 100) * 100;
    const rankLabel = index === 0 ? 'En güçlü eşleşme' : `${index + 1}. güçlü alternatif`;

    return `
    <article class="premium-result-card conversion-result-card">
      <div class="result-rank premium-rank">${rankLabel}</div>

      <div class="top-row">
        <div>
          <div class="score">${vehicle.score}/100</div>
          <small class="score-label">Karar skoru</small>
        </div>
        <div class="confidence">Analiz güveni: %${vehicle.confidence}</div>
      </div>

      <h3>${escapeHtml(vehicle.name)}</h3>

      <p class="result-summary">
        ${vehicle.score >= 85
          ? 'Profiliniz için en güçlü eşleşmelerden biri. Toplam maliyet, kullanım uyumu ve finansman açısından öne çıkıyor.'
          : 'Profilinize uygun güçlü alternatiflerden biri. Kullanım ve bütçe dengenize göre değerlendirildi.'}
      </p>

      <div class="monthly-impact">
        <span>Tahmini aylık bütçe etkisi</span>
        <strong>${formatter.format(monthlyImpact)} ₺</strong>
      </div>

      <div class="analysis-box">
        <strong>Neden önerildi?</strong>
        <ul>${vehicle.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
      </div>

      <div class="risk-box">
        <strong>Dikkat edilmesi gerekenler</strong>
        <ul>${vehicle.risks.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
      </div>

      <div class="cost">
        <p><strong>12 aylık tahmini maliyet:</strong> ${formatter.format(vehicle.costs.total)} ₺</p>
        <p>Yakıt: ${formatter.format(vehicle.costs.fuel)} ₺</p>
        <p>Sigorta: ${formatter.format(vehicle.costs.insurance)} ₺</p>
        <p>Bakım: ${formatter.format(vehicle.costs.maintenance)} ₺</p>
      </div>

      ${vehicle.score >= 85 ? `
        <div class="auto-hot-banner">
          🔥 Bu profil için güncel teklif ve finansman seçeneklerini değerlendirmek faydalı olabilir.
        </div>
      ` : ''}

      <div class="cta-row result-cta-row">
        <button class="btn primary auto-interest-btn" data-interest="vehicle_offer" data-vehicle="${escapeHtml(vehicle.name)}">
          Teklif seçeneklerini gör
        </button>

        <button class="btn secondary auto-interest-btn" data-interest="finance" data-vehicle="${escapeHtml(vehicle.name)}">
          Finansmanı değerlendir
        </button>

        <button class="btn secondary auto-whatsapp-btn" data-vehicle="${escapeHtml(vehicle.name)}">
          WhatsApp ile sor
        </button>
      </div>

      <p class="cta-microcopy">Ücretsiz ön değerlendirme • zorunlu satın alma yok • bilgileriniz güvenle işlenir</p>
    </article>
  `}).join('') + `
    <section class="premium-ai-summary ai-explanation-box" data-ai-explanation>
      <h3>Nihai uzman değerlendirmesi</h3>
      <p>Karşılaştırmalı analiz hazırlanıyor...</p>
    </section>
  `;

  const aiBox = root.querySelector('[data-ai-explanation]');
  if (aiBox && results[0]) {
    getAiExplanation(results, formData).then((text) => {
      if (!text) {
        aiBox.remove();
        return;
      }

      const paragraph = aiBox.querySelector('p');
      if (paragraph) paragraph.textContent = text;
    });
  }
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
    description: 'AI karar motoru kullanım senaryonuza göre segment ve maliyet dengesini ayarlar.',
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
        <span>${step.key === 'budget' ? 'Net bütçenizi girin' : 'Yıllık net kilometrenizi girin'}</span>
        <div>
          <input
            type="${step.custom.type}"
            inputmode="numeric"
            pattern="[0-9]*"
            min="${step.custom.min}"
            max="${step.custom.max}"
            placeholder="${escapeHtml(step.custom.placeholder)}"
            value="${escapeHtml(customValue)}"
            data-wizard-custom
          >
          <strong>${escapeHtml(step.custom.suffix)}</strong>
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

function advanceWizard() {
  const step = wizardSteps[wizardIndex];

  if (!wizardState[step.key]) {
    alert('Lütfen devam etmeden önce bir seçenek seçin.');
    return;
  }

  if (wizardState[step.key] === 'custom') {
    const visibleCustomInput = wizard?.querySelector('[data-wizard-custom]');
    const rawCustomValue = String(
      visibleCustomInput?.value ||
      wizardState[`${step.key}_custom`] ||
      ''
    ).replace(/\D/g, '');

    const numericValue = Number(rawCustomValue);

    if (!rawCustomValue || Number.isNaN(numericValue)) {
      alert('Lütfen geçerli bir değer girin.');
      return;
    }

    if (step.custom) {
      if (numericValue < step.custom.min || numericValue > step.custom.max) {
        alert(`Lütfen ${step.custom.min} - ${step.custom.max} aralığında bir değer girin.`);
        return;
      }
    }

    wizardState[`${step.key}_custom`] = rawCustomValue;
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
    if (!customInput) return;

    const step = wizardSteps[wizardIndex];
    const cleanValue = String(customInput.value || '').replace(/\D/g, '');
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


trackAutoEvent('auto_page_view');

const form = document.getElementById('auto-form');
let autoFormStarted = false;
let autoAnalysisRunning = false;
let autoAnalysisTimer = null;

form.addEventListener('input', () => {
  if (!autoFormStarted) {
    autoFormStarted = true;
    trackAutoEvent('auto_form_started');
  }
});

form.addEventListener('submit', (event) => {
  event.preventDefault();

  if (autoAnalysisRunning) return;
  autoAnalysisRunning = true;

  trackAutoEvent('auto_form_submitted');

  const formData = readForm(form);
  const results = recommendVehicles(formData);

  trackAutoEvent('auto_analysis_started', formData);

  renderLoading();

  if (autoAnalysisTimer) clearTimeout(autoAnalysisTimer);

  autoAnalysisTimer = setTimeout(() => {
    try {
      document.getElementById('analiz').scrollIntoView({ behavior: 'smooth' });
      trackAutoEvent('auto_results_rendered', { count: results.length });
      renderResults(results);
      trackUniqueAutoEvent('auto_results_view', formData, 'results');
    } finally {
      autoAnalysisRunning = false;
      autoAnalysisTimer = null;
    }
  }, 2200);
});

document.addEventListener('click', async (event) => {
  const whatsappBtn = event.target.closest('.auto-whatsapp-btn');

  if (whatsappBtn) {
    const vehicle = whatsappBtn.dataset.vehicle || 'vehicle';
    const phone = '905456786420';

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

  const interestBtn = event.target.closest('.auto-interest-btn');

  if (interestBtn) {
    const interest = interestBtn.dataset.interest || 'finance';
    const vehicle = interestBtn.dataset.vehicle || '';

    const eventMap = {
      finance: 'auto_finance_click',
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
