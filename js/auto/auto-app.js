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

async function updateLeadInterest(phone, interestType, vehicle = '') {
  const email = localStorage.getItem('istebul_auto_lead_email');
  const storedPayload = safeJsonParse(localStorage.getItem('istebul_auto_lead_payload'), {});

  await callAutoIntake({
    type: 'lead',
    email: email || null,
    phone,
    formData: {
      ...storedPayload,
      phone,
      interest_type: interestType,
      vehicle
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
      <h3>Kişisel satın alma danışmanınız sizi arasın</h3>
      <p>AI analiz sonucunuza göre kredi, sigorta ve satın alma seçeneklerini sizin için netleştirelim.</p>
      <ul class="lead-modal-benefits">
        <li>✓ En uygun kredi seçenekleri</li>
        <li>✓ Size uygun finansman seçenekleri</li>
        <li>✓ Bayi fiyat avantajı</li>
      </ul>
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
        <button class="btn primary" type="submit">Kişisel teklifimi hazırlayın</button>
      </form>
      <button class="btn secondary" id="close-lead-modal">Kapat</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('close-lead-modal').onclick = () => modal.remove();

  document.getElementById('phone-lead-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const leadData = new FormData(event.currentTarget);
    const phone = leadData.get('phone');
    const selectedVehicle = leadData.get('vehicle') || vehicle;

    trackAutoEvent('auto_modal_submitted', { phone, interest_type: type, vehicle: selectedVehicle });
    trackAutoEvent('auto_lead_submit', { phone, interest_type: type, vehicle: selectedVehicle });

    try {
      await updateLeadInterest(phone, type, selectedVehicle);
    } catch {}

    modal.innerHTML = `
      <div class="lead-modal-card">
        <h3>Talebiniz alındı</h3>
        <p>Uzman ekibimiz analiz sonucunuza göre en uygun seçenekleri hazırlayıp kısa süre içinde dönüş yapacak.</p>
      </div>
    `;
  });
}

function renderResults(results) {
  const root = document.getElementById('auto-results');

  if (!Array.isArray(results) || !results.length) {
    root.innerHTML = '<article><h3>Sonuç bulunamadı</h3></article>';
    return;
  }

  root.innerHTML = results.map((vehicle, index) => `
    <article class="premium-result-card">
      <div class="top-row">
        <div class="score">${vehicle.score}/100</div>
        <div class="confidence">AI Karar Güveni: %${vehicle.confidence}</div>
      </div>

      <div class="result-rank">#${index + 1} öneri</div>

      <h3>${escapeHtml(vehicle.name)}</h3>

      <p class="result-summary">
        ${vehicle.score >= 85
          ? 'Profiliniz için güçlü eşleşme. Toplam maliyet, kullanım uyumu ve finansman açısından öne çıkıyor.'
          : 'Profilinize uygun güçlü alternatiflerden biri. Kullanım ve bütçe dengenize göre değerlendirildi.'}
      </p>

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
          🔥 Bugün profilinize uygun güçlü fırsat olabilir.
        </div>
      ` : ''}

      <div class="cta-row">
        <button class="btn primary auto-interest-btn" data-interest="vehicle_offer" data-vehicle="${escapeHtml(vehicle.name)}">
          Kişisel teklif al
        </button>

        <button class="btn secondary auto-interest-btn" data-interest="finance" data-vehicle="${escapeHtml(vehicle.name)}">
          Finansman planla
        </button>

        <button class="btn secondary auto-whatsapp-btn" data-vehicle="${escapeHtml(vehicle.name)}">
          Uzmana sor
        </button>
      </div>
    </article>
  `).join('');
}

document.getElementById('year').textContent = new Date().getFullYear();

document.querySelectorAll('#gelir .btn.secondary').forEach((btn, index) => {
  const types = ['finance', 'insurance', 'report'];
  btn.dataset.interest = types[index];
  btn.classList.add('auto-interest-btn');
});

trackAutoEvent('auto_page_view');

const form = document.getElementById('auto-form');
let autoFormStarted = false;

form.addEventListener('input', () => {
  if (!autoFormStarted) {
    autoFormStarted = true;
    trackAutoEvent('auto_form_started');
  }
});

form.addEventListener('submit', (event) => {
  trackAutoEvent('auto_form_submitted');
  event.preventDefault();

  const formData = readForm(form);
  const results = recommendVehicles(formData);

  trackAutoEvent('auto_analysis_started', formData);

  renderLoading();

  setTimeout(() => {
    document.getElementById('analiz').scrollIntoView({ behavior: 'smooth' });
    trackAutoEvent('auto_results_rendered', { count: results.length });
    renderResults(results);
    trackUniqueAutoEvent('auto_results_view', formData, 'results');
  }, 2200);
});

document.addEventListener('click', (event) => {
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
