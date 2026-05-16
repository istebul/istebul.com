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
    <div class="ai-loading">
      <div class="spinner"></div>
      <h3>AI araç profilinizi analiz ediyor...</h3>
      <p>Analiz hazırlanıyor...</p>
    </div>
  `;
}

async function updateLeadInterest(phone, interestType) {
  const email = localStorage.getItem('istebul_auto_lead_email');
  const storedPayload = safeJsonParse(localStorage.getItem('istebul_auto_lead_payload'), {});

  await callAutoIntake({
    type: 'lead',
    email: email || null,
    phone,
    formData: {
      ...storedPayload,
      phone,
      interest_type: interestType
    }
  });
}

function openLeadModal(type) {
  trackAutoEvent('auto_modal_open', { interest_type: type });
  const existing = document.getElementById('lead-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'lead-modal';
  modal.className = 'lead-modal';

  modal.innerHTML = `
    <div class="lead-modal-card">
      <h3>Size özel teklif hazırlayalım</h3>
      <p>En uygun kredi, sigorta ve satın alma seçenekleri için numaranızı bırakın.</p>
      <form id="phone-lead-form">
        <input name="phone" type="tel" required placeholder="05xx xxx xx xx">
        <button class="btn primary" type="submit">Gönder</button>
      </form>
      <button class="btn secondary" id="close-lead-modal">Kapat</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('close-lead-modal').onclick = () => modal.remove();

  document.getElementById('phone-lead-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const phone = new FormData(event.currentTarget).get('phone');

    trackAutoEvent('auto_lead_submit', { phone, interest_type: type });

    try {
      await updateLeadInterest(phone, type);
    } catch {}

    modal.innerHTML = `
      <div class="lead-modal-card">
        <h3>Teşekkürler</h3>
        <p>Uzman ekibimiz kısa süre içinde dönüş yapacak.</p>
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

  root.innerHTML = results.map(vehicle => `
    <article>
      <div class="top-row">
        <div class="score">${vehicle.score}/100</div>
        <div class="confidence">AI güven: %${vehicle.confidence}</div>
      </div>

      <h3>${escapeHtml(vehicle.name)}</h3>

      <div class="analysis-box">
        <ul>${vehicle.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
      </div>

      <div class="risk-box">
        <ul>${vehicle.risks.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
      </div>

      <div class="cost">
        <p>${formatter.format(vehicle.costs.total)} ₺</p>
        <p>Yakıt: ${formatter.format(vehicle.costs.fuel)} ₺</p>
        <p>Sigorta: ${formatter.format(vehicle.costs.insurance)} ₺</p>
        <p>Bakım: ${formatter.format(vehicle.costs.maintenance)} ₺</p>
      </div>

      <div class="cta-row">
        <button class="btn primary auto-whatsapp-btn" data-vehicle="${escapeHtml(vehicle.name)}">
          WhatsApp
        </button>
        <button class="btn secondary auto-interest-btn" data-interest="finance">
          Finansman
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

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = readForm(form);
  const results = recommendVehicles(formData);

  trackAutoEvent('auto_analysis_started', formData);

  renderLoading();

  setTimeout(() => {
    document.getElementById('analiz').scrollIntoView({ behavior: 'smooth' });
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
    openLeadModal(interestBtn.dataset.interest || 'finance');
  }
});
