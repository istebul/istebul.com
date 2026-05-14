import { recommendVehicles } from './auto-ai.js';

const formatter = new Intl.NumberFormat('tr-TR');

function readForm(form) {
  return Object.fromEntries(new FormData(form).entries());
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


async function saveLead(email, formData) {
  const supabaseUrl = window.__env?.SUPABASE_URL;
  const supabaseKey = window.__env?.SUPABASE_ANON_KEY;

  const payload = {
    email,
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

  await fetch(`${supabaseUrl}/rest/v1/auto_leads`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(payload)
  });
}

function renderEmailGate(results) {
  const root = document.getElementById('auto-results');

  root.innerHTML = `
    <div class="email-gate">
      <p class="kicker">Analiz hazır</p>
      <h3>Size uygun araç önerilerini görmek için e-posta adresinizi girin.</h3>
      <p>Sonuçlarınız; uygunluk skoru, risk analizi ve tahmini yıllık maliyet ile birlikte gösterilecek.</p>

      <form id="lead-form" class="lead-form">
        <input name="email" type="email" placeholder="E-posta adresiniz" required>
        <button class="btn primary" type="submit">Sonuçları göster</button>
      </form>

      <small>Bilgilendirme amaçlıdır. Spam gönderilmez.</small>
    </div>
  `;

  document.getElementById('lead-form').addEventListener('submit', async event => {
    event.preventDefault();

    const email = new FormData(event.currentTarget).get('email');

    try {
      await saveLead(email, readForm(form));
    } catch (error) {
      console.warn('Lead kaydı yapılamadı:', error);
    }

    renderResults(results);
  });
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
        <p>Sigorta: ${formatter.format(vehicle.costs.insurance)} ₺</p>
        <p>Bakım: ${formatter.format(vehicle.costs.maintenance)} ₺</p>
      </div>

      <button class="btn secondary finance-btn" type="button">Finansman seçeneklerini gör</button>
    </article>
  `).join('');

  document.querySelectorAll('.finance-btn').forEach(btn => {
    btn.addEventListener('click', () => openLeadModal('finance'));
  });
}

document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('auto-form');

form.addEventListener('submit', event => {
  event.preventDefault();

  const results = recommendVehicles(readForm(form));

  renderLoading();

  setTimeout(() => {
    document.getElementById('analiz').scrollIntoView({ behavior: 'smooth' });
    renderEmailGate(results);
  }, 2200);
});
