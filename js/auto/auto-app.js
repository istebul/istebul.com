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

  document.getElementById('lead-form').addEventListener('submit', event => {
    event.preventDefault();

    const email = new FormData(event.currentTarget).get('email');
    localStorage.setItem('istebul_auto_lead_email', email);

    renderResults(results);
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

      <button class="btn secondary" type="button">Finansman seçeneklerini gör</button>
    </article>
  `).join('');
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
