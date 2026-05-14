import { recommendVehicles } from './auto-ai.js';

const formatter = new Intl.NumberFormat('tr-TR');

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

async function trackAutoEvent(eventName, metadata = {}) {
  const supabaseUrl = window.__env?.SUPABASE_URL;
  const supabaseKey = window.__env?.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return;

  const email = localStorage.getItem('istebul_auto_lead_email') || metadata.email || null;
  const phone = metadata.phone || null;

  try {
    await fetch(`${supabaseUrl}/rest/v1/auto_events`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        event_name: eventName,
        email,
        phone,
        metadata: {
          session_id: getSessionId(),
          ...metadata
        }
      })
    });
  } catch (error) {
    console.warn('Auto event tracking failed:', error);
  }
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
      <p>Bütçe, kullanım, toplam sahip olma maliyeti ve risk faktörleri değerlendiriliyor.</p>
    </div>
  `;
}


async function saveLead(email, phone, formData) {
  const supabaseUrl = window.__env?.SUPABASE_URL;
  const supabaseKey = window.__env?.SUPABASE_ANON_KEY;

  const payload = {
    email,
    phone,
    budget: Number(formData.budget || 0),
    usage: formData.usage,
    body: formData.body,
    fuel: formData.fuel,
    km: Number(formData.km || 0),
    loan: formData.loan,
    source: 'auto'
  };

  localStorage.setItem('istebul_auto_lead_email', email);
  localStorage.setItem('istebul_auto_lead_payload', JSON.stringify(payload));

  if (!supabaseUrl || !supabaseKey) {
    return;
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };

  const updateResponse = await fetch(
    `${supabaseUrl}/rest/v1/auto_leads?email=eq.${encodeURIComponent(email)}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload)
    }
  );

  if (!updateResponse.ok) {
    throw new Error(`Lead update failed: ${updateResponse.status}`);
  }

  const updatedRows = await updateResponse.json();

  if (Array.isArray(updatedRows) && updatedRows.length > 0) {
    return;
  }

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/auto_leads`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(payload)
  });

  if (!insertResponse.ok) {
    throw new Error(`Lead insert failed: ${insertResponse.status}`);
  }
}

async function updateLeadInterest(phone, interestType) {
  const supabaseUrl = window.__env?.SUPABASE_URL;
  const supabaseKey = window.__env?.SUPABASE_ANON_KEY;
  const email = localStorage.getItem('istebul_auto_lead_email');

  if (!supabaseUrl || !supabaseKey || !email) {
    return;
  }

  await fetch(`${supabaseUrl}/rest/v1/auto_leads?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phone,
      interest_type: interestType
    })
  });
}

function openLeadModal(type) {
  const existing = document.getElementById('lead-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'lead-modal';
  modal.className = 'lead-modal';

  modal.innerHTML = `
    <div class="lead-modal-card">
      <h3>Size uygun teklifleri paylaşalım</h3>
      <p>Telefon numaranızı bırakın, uygun seçenekler için sizinle iletişime geçelim.</p>

      <form id="phone-lead-form">
        <input name="phone" type="tel" placeholder="Telefon numaranız" required>
        <button class="btn primary" type="submit">Bilgi almak istiyorum</button>
      </form>

      <button class="btn secondary" id="close-lead-modal">Kapat</button>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('close-lead-modal').onclick = () => modal.remove();

  document.getElementById('phone-lead-form').addEventListener('submit', async event => {
    event.preventDefault();

    const phone = new FormData(event.currentTarget).get('phone');

    try {
      await updateLeadInterest(phone, type);
    } catch (e) {
      console.warn(e);
    }

    modal.innerHTML = `
      <div class="lead-modal-card">
        <h3>Teşekkürler</h3>
        <p>Ekibimiz sizinle iletişime geçecek.</p>
      </div>
    `;
  });
}


function trackUniqueAutoEvent(eventName, metadata = {}, key = '') {
  if (!shouldTrackUnique(eventName, key)) return;
  trackAutoEvent(eventName, metadata);
}

function renderResults(results) {
  const root = document.getElementById('auto-results');

  root.innerHTML = results.map(vehicle => `
    <article>
      <div class="top-row">
        <div class="score">${vehicle.score}/100</div>
        <div class="confidence">AI güven: %${vehicle.confidence}</div>
      </div>

      <h3>${vehicle.name}</h3>

      <div class="analysis-box">
        <strong>Neden önerildi?</strong>
        <ul>${vehicle.reasons.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>

      <div class="risk-box">
        <strong>Risk analizi</strong>
        <ul>${vehicle.risks.map(r => `<li>${r}</li>`).join('')}</ul>
      </div>

      <div class="tags">
        <span>${vehicle.body.toUpperCase()}</span>
        <span>${fuelLabel(vehicle.fuel)}</span>
        <span>2. el: ${vehicle.resale}/10</span>
      </div>

      <div class="cost">
        <p><strong>Tahmini yıllık maliyet:</strong><br>${formatter.format(vehicle.costs.total)} ₺</p>
        <p>Yakıt/enerji: ${formatter.format(vehicle.costs.fuel)} ₺</p>
      </div>

      <div class="cta-row">
        <button class="btn primary auto-whatsapp-btn" data-vehicle="${vehicle.name}">
          WhatsApp ile teklif al
        </button>
        <button class="btn secondary auto-interest-btn" data-interest="finance">
          Finansman seçenekleri
        </button>
      </div>
        <p>Sigorta: ${formatter.format(vehicle.costs.insurance)} ₺</p>
        <p>Bakım: ${formatter.format(vehicle.costs.maintenance)} ₺</p>
      </div>

      <button class="btn secondary finance-btn" type="button">Finansman seçeneklerini gör</button>
    </article>
  `).join('');

  document.querySelectorAll('.finance-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      trackAutoEvent('auto_finance_click');
      openLeadModal('finance');
    });
  });
}

document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('auto-form');

trackAutoEvent('auto_page_view');

form.addEventListener('submit', event => {
  event.preventDefault();

  const formData = readForm(form);
  const results = recommendVehicles(formData);

  trackAutoEvent('auto_quiz_submit', formData);

  renderLoading();

  setTimeout(() => {
    document.getElementById('analiz').scrollIntoView({ behavior: 'smooth' });
    trackUniqueAutoEvent('auto_results_view', readForm(form), 'results');
renderResults(results);
  }, 2200);
});

document.addEventListener('click', async (event) => {
  const whatsappBtn = event.target.closest('.auto-whatsapp-btn');
  if (whatsappBtn) {
    const vehicle = whatsappBtn.dataset.vehicle || 'vehicle';
    trackUniqueAutoEvent('auto_whatsapp_click', { vehicle }, vehicle);

    const msg = encodeURIComponent('isteBul Auto üzerinden teklif almak istiyorum: ' + vehicle);
    window.open('https://wa.me/905000000000?text=' + msg, '_blank');
  }

  const interestBtn = event.target.closest('.auto-interest-btn');
  if (interestBtn) {
    openLeadModal(interestBtn.dataset.interest || 'finance');
  }
});


