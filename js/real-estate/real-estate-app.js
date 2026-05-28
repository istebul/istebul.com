import {
  calculateDebtToIncome,
  calculateLocationFitScore,
  calculateOwnershipCost,
  calculateRiskLevel,
  calculateInvestmentPotential,
  calculateHousingDecisionScore,
  buildHousingScenarios,
  formatTry
} from './real-estate-calculator.js';
import { buildHousingAiCommentary } from './real-estate-ai.js';

const STEP_IDS = ['purpose', 'homeType', 'budget', 'location', 'risk', 'priorities'];
const PURPOSE_OPTIONS = ['Oturum için', 'Yatırım için', 'İlk ev', 'Aile evi', 'Kiraya verme', 'Yazlık', 'Öğrenci/eğitim lokasyonu', 'Diğer'];
const HOME_TYPE_OPTIONS = ['Daire', 'Villa', 'Müstakil ev', 'Rezidans', 'Site içi daire', 'Arsa / proje', 'Yeni bina', 'İkinci el'];
const LOCATION_PREFS = [
  ['iseYakinlik', 'İşe yakınlık'], ['okulaYakinlik', 'Okula yakınlık'], ['hastane', 'Hastane'], ['topluTasima', 'Toplu taşıma'],
  ['otopark', 'Otopark'], ['guvenlik', 'Güvenlik'], ['sosyalAlan', 'Sosyal alan'], ['sessizlik', 'Sessizlik'],
  ['merkeziLokasyon', 'Merkezi lokasyon'], ['dogayaYakinlik', 'Denize/doğaya yakınlık']
];
const PRIORITIES = ['Düşük risk', 'Düşük aidat', 'Yüksek yatırım potansiyeli', 'Aile yaşamı', 'Ulaşım kolaylığı', 'Deprem güvenliği', 'Yeni bina', 'Geniş metrekare', 'Merkezi konum', 'Sessiz yaşam', 'Kira getirisi', 'Düşük toplam maliyet'];

const state = {
  step: 0,
  purchasePurpose: '',
  homeType: '',
  totalBudget: '',
  downPayment: '',
  loanAmount: '',
  monthlyIncome: '',
  currentDebt: '',
  interestRate: '',
  termMonths: '',
  city: '',
  district: '',
  locationPreferences: [],
  buildingAge: '',
  floor: '',
  squareMeters: '',
  roomCount: '',
  dues: '',
  renovationCost: '',
  earthquakeRiskInput: '',
  deedStatus: '',
  transportCost: '',
  rentYield: '',
  priorities: []
};

function $(selector, root = document) {
  return root.querySelector(selector);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mountProgress() {
  const progress = $('#housing-progress');
  if (!progress) return;
  progress.innerHTML = STEP_IDS.map((id, idx) => `<span class="housing-progress-item ${idx <= state.step ? 'is-active' : ''}">${idx + 1}. ${escapeHtml(id)}</span>`).join('');
}

function cardButtons(options, field, selected) {
  return `<div class="housing-card-grid">${options.map((label) => `
    <button type="button" class="housing-option-card ${selected === label ? 'is-selected' : ''}" data-field="${field}" data-value="${escapeHtml(label)}">${escapeHtml(label)}</button>
  `).join('')}</div>`;
}

function chipButtons(options, selectedList, action) {
  return `<div class="housing-chip-grid">${options.map((item) => {
    const val = Array.isArray(item) ? item[0] : item;
    const label = Array.isArray(item) ? item[1] : item;
    return `<button type="button" class="housing-chip ${selectedList.includes(val) ? 'is-selected' : ''}" data-action="${action}" data-value="${escapeHtml(val)}">${escapeHtml(label)}</button>`;
  }).join('')}</div>`;
}

function budgetFields() {
  return `
    <div class="housing-form-grid">
      <label>Toplam konut bütçesi<input data-input="totalBudget" type="number" min="0" value="${escapeHtml(state.totalBudget)}"></label>
      <label>Peşinat<input data-input="downPayment" type="number" min="0" value="${escapeHtml(state.downPayment)}"></label>
      <label>Kredi tutarı<input data-input="loanAmount" type="number" min="0" value="${escapeHtml(state.loanAmount)}"></label>
      <label>Aylık net gelir<input data-input="monthlyIncome" type="number" min="0" value="${escapeHtml(state.monthlyIncome)}"></label>
      <label>Mevcut borç ödemeleri<input data-input="currentDebt" type="number" min="0" value="${escapeHtml(state.currentDebt)}"></label>
      <label>Tahmini faiz oranı (%)<input data-input="interestRate" type="number" min="0" step="0.01" value="${escapeHtml(state.interestRate)}"></label>
      <label>Vade (ay)<input data-input="termMonths" type="number" min="1" max="360" value="${escapeHtml(state.termMonths || '120')}"></label>
      <label>Para birimi<input value="TRY" disabled></label>
    </div>`;
}

function locationFields() {
  return `
    <div class="housing-form-grid">
      <label>Şehir<input data-input="city" value="${escapeHtml(state.city)}"></label>
      <label>İlçe/Semt<input data-input="district" value="${escapeHtml(state.district)}"></label>
    </div>
    ${chipButtons(LOCATION_PREFS, state.locationPreferences, 'toggle-location')}`;
}

function riskFields() {
  return `
    <div class="housing-form-grid">
      <label>Bina yaşı<input data-input="buildingAge" type="number" min="0" value="${escapeHtml(state.buildingAge)}"></label>
      <label>Kat<input data-input="floor" type="number" min="0" value="${escapeHtml(state.floor)}"></label>
      <label>Metrekare<input data-input="squareMeters" type="number" min="0" value="${escapeHtml(state.squareMeters)}"></label>
      <label>Oda sayısı<input data-input="roomCount" value="${escapeHtml(state.roomCount)}"></label>
      <label>Aidat (aylık)<input data-input="dues" type="number" min="0" value="${escapeHtml(state.dues)}"></label>
      <label>Tahmini tadilat masrafı<input data-input="renovationCost" type="number" min="0" value="${escapeHtml(state.renovationCost)}"></label>
      <label>Deprem/zemin riski (0-100)<input data-input="earthquakeRiskInput" type="number" min="0" max="100" value="${escapeHtml(state.earthquakeRiskInput)}"></label>
      <label>Tapu / iskan durumu<input data-input="deedStatus" value="${escapeHtml(state.deedStatus)}"></label>
      <label>Ulaşım maliyeti (aylık)<input data-input="transportCost" type="number" min="0" value="${escapeHtml(state.transportCost)}"></label>
      <label>Kira getirisi tahmini (aylık)<input data-input="rentYield" type="number" min="0" value="${escapeHtml(state.rentYield)}"></label>
    </div>`;
}

function renderStep() {
  const wizard = $('#housing-wizard');
  if (!wizard) return;

  const body = [
    { title: 'Adım 1 — Konut amacı', html: cardButtons(PURPOSE_OPTIONS, 'purchasePurpose', state.purchasePurpose) },
    { title: 'Adım 2 — Konut tipi', html: cardButtons(HOME_TYPE_OPTIONS, 'homeType', state.homeType) },
    { title: 'Adım 3 — Bütçe ve finansman', html: budgetFields() },
    { title: 'Adım 4 — Lokasyon beklentisi', html: locationFields() },
    { title: 'Adım 5 — Risk ve maliyet faktörleri', html: riskFields() },
    { title: 'Adım 6 — Öncelikler', html: chipButtons(PRIORITIES, state.priorities, 'toggle-priority') }
  ][state.step];

  wizard.innerHTML = `
    <section class="housing-step-card">
      <h2>${body.title}</h2>
      ${body.html}
      <p class="housing-validation" id="housing-validation"></p>
      <div class="housing-step-actions">
        ${state.step > 0 ? '<button type="button" class="btn-secondary" id="housing-prev">Geri</button>' : ''}
        <button type="button" class="btn-primary" id="housing-next">${state.step === STEP_IDS.length - 1 ? 'Analizi oluştur' : 'Devam et'}</button>
      </div>
    </section>
  `;

  bindWizardEvents();
  mountProgress();
}

function validateCurrentStep() {
  if (state.step === 0 && !state.purchasePurpose) return 'Konut amacı seçin.';
  if (state.step === 1 && !state.homeType) return 'Konut tipi seçin.';
  if (state.step === 2) {
    if (!Number(state.totalBudget)) return 'Toplam konut bütçesi zorunludur.';
    if (!Number(state.monthlyIncome)) return 'Aylık net gelir zorunludur.';
    if (!Number(state.loanAmount)) return 'Kredi tutarı zorunludur.';
  }
  if (state.step === 3 && (!state.city || !state.district)) return 'Şehir ve ilçe/semt alanlarını doldurun.';
  if (state.step === 5 && !state.priorities.length) return 'En az bir öncelik seçin.';
  return '';
}

function bindWizardEvents() {
  document.querySelectorAll('[data-field]').forEach((button) => {
    button.addEventListener('click', () => {
      state[button.dataset.field] = button.dataset.value || '';
      renderStep();
    });
  });
  document.querySelectorAll('[data-action="toggle-location"]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.value;
      if (!value) return;
      state.locationPreferences = state.locationPreferences.includes(value)
        ? state.locationPreferences.filter((item) => item !== value)
        : [...state.locationPreferences, value];
      renderStep();
    });
  });
  document.querySelectorAll('[data-action="toggle-priority"]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.value;
      if (!value) return;
      state.priorities = state.priorities.includes(value)
        ? state.priorities.filter((item) => item !== value)
        : [...state.priorities, value];
      renderStep();
    });
  });
  document.querySelectorAll('[data-input]').forEach((input) => {
    input.addEventListener('input', () => {
      state[input.dataset.input] = input.value;
    });
  });
  $('#housing-prev')?.addEventListener('click', () => {
    state.step = Math.max(state.step - 1, 0);
    renderStep();
  });
  $('#housing-next')?.addEventListener('click', async () => {
    const validation = validateCurrentStep();
    const validationNode = $('#housing-validation');
    if (validation) {
      if (validationNode) validationNode.textContent = validation;
      return;
    }
    if (state.step < STEP_IDS.length - 1) {
      state.step += 1;
      renderStep();
      return;
    }
    await renderResults();
  });
}

function buildMetrics() {
  const ownership = calculateOwnershipCost(state);
  const dti = calculateDebtToIncome(ownership.monthlyPayment + Number(state.currentDebt || 0), Number(state.monthlyIncome || 0));
  const locationFit = calculateLocationFitScore(state);
  const maintenanceRisk = Math.min(100, Number(state.buildingAge || 0) * 2 + Number(state.renovationCost || 0) / 40000 * 25);
  const earthquakeRiskScore = Math.min(100, Number(state.earthquakeRiskInput || 40));
  const locationRisk = Math.max(15, 100 - locationFit);
  const liquidityRisk = Math.min(100, Math.max(20, 70 - Number(state.squareMeters || 90) / 2));
  const lifeQuality = Math.min(100, locationFit * 0.5 + (state.priorities.includes('Aile yaşamı') ? 18 : 6) + (state.priorities.includes('Sessiz yaşam') ? 14 : 4));
  const costPressure = Math.min(100, ownership.monthlyPayment / Math.max(Number(state.monthlyIncome || 1), 1) * 100);
  const risk = calculateRiskLevel({ dti, earthquakeRiskScore, maintenanceRisk, locationRisk, liquidityRisk });
  const investmentPotential = calculateInvestmentPotential({ locationRisk, maintenanceRisk, locationFit, rentYield: Number(state.rentYield || 0) });
  const score = calculateHousingDecisionScore({ dti, locationFit, investmentPotential, risk, lifeQuality, costPressure });
  return { ownership, dti, locationFit, maintenanceRisk, earthquakeRiskScore, locationRisk, liquidityRisk, lifeQuality, costPressure, risk, investmentPotential, score };
}

async function renderResults() {
  const metrics = buildMetrics();
  const scenarios = buildHousingScenarios({ score: metrics.score });
  const ai = await buildHousingAiCommentary({
    ...state,
    score: metrics.score,
    risk: metrics.risk,
    ownership: metrics.ownership
  });

  const results = $('#housing-results');
  if (!results) return;
  results.hidden = false;
  results.innerHTML = `
    <section class="housing-result-grid housing-result-grid--scores">
      ${[
        ['Genel Uygunluk', metrics.score],
        ['Ödeme Konforu', Math.round(100 - metrics.dti)],
        ['Lokasyon Uyumu', metrics.locationFit],
        ['Toplam Maliyet Verimliliği', Math.round(100 - metrics.costPressure)],
        ['Risk Seviyesi', 100 - metrics.risk.score],
        ['Yatırım Potansiyeli', metrics.investmentPotential],
        ['Yaşam Kalitesi', Math.round(metrics.lifeQuality)]
      ].map(([label, value]) => `<article class="result-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}/100</strong></article>`).join('')}
    </section>
    <section class="housing-result-grid housing-result-grid--dual">
      <article class="result-card">
        <h3>AI Yorumu (${ai.source === 'ai' ? 'AI' : 'Fallback'})</h3>
        <p>${escapeHtml(ai.text)}</p>
      </article>
      <article class="result-card">
        <h3>Toplam sahip olma maliyeti (Tahmini analiz)</h3>
        <ul class="result-list">
          <li><span>Konut fiyatı</span><strong>${formatTry(metrics.ownership.homePrice)}</strong></li>
          <li><span>Peşinat</span><strong>${formatTry(metrics.ownership.downPayment)}</strong></li>
          <li><span>Kredi tutarı</span><strong>${formatTry(metrics.ownership.principal)}</strong></li>
          <li><span>Tahmini aylık taksit</span><strong>${formatTry(metrics.ownership.monthlyPayment)}</strong></li>
          <li><span>Toplam geri ödeme</span><strong>${formatTry(metrics.ownership.totalRepayment)}</strong></li>
          <li><span>Toplam faiz yükü</span><strong>${formatTry(metrics.ownership.totalInterest)}</strong></li>
          <li><span>Tapu/ekspertiz/masraf tahmini</span><strong>${formatTry(metrics.ownership.titleFees)}</strong></li>
          <li><span>Aidat yıllık maliyet</span><strong>${formatTry(metrics.ownership.annualDues)}</strong></li>
          <li><span>Tadilat tahmini</span><strong>${formatTry(metrics.ownership.renovation)}</strong></li>
          <li><span>Ulaşım maliyeti (10 yıl)</span><strong>${formatTry(metrics.ownership.transportation)}</strong></li>
          <li><span>Gerçek toplam sahip olma maliyeti</span><strong>${formatTry(metrics.ownership.realTotal)}</strong></li>
        </ul>
      </article>
    </section>
    <section class="housing-result-grid housing-result-grid--dual">
      <article class="result-card">
        <h3>Risk paneli</h3>
        <ul class="result-list">
          <li><span>Kredi yükü riski</span><strong>${metrics.dti > 50 ? 'Yüksek' : metrics.dti > 35 ? 'Orta' : 'Düşük'}</strong></li>
          <li><span>Deprem/zemin riski</span><strong>${metrics.earthquakeRiskScore > 65 ? 'Yüksek' : metrics.earthquakeRiskScore > 40 ? 'Orta' : 'Düşük'}</strong></li>
          <li><span>Aidat riski</span><strong>${Number(state.dues || 0) > 4500 ? 'Yüksek' : 'Düşük-Orta'}</strong></li>
          <li><span>Likidite/satılabilirlik riski</span><strong>${metrics.liquidityRisk > 60 ? 'Orta-Yüksek' : 'Düşük-Orta'}</strong></li>
          <li><span>Lokasyon riski</span><strong>${metrics.locationRisk > 60 ? 'Yüksek' : 'Düşük-Orta'}</strong></li>
          <li><span>Bakım/tadilat riski</span><strong>${metrics.maintenanceRisk > 55 ? 'Orta-Yüksek' : 'Düşük-Orta'}</strong></li>
        </ul>
      </article>
      <article class="result-card">
        <h3>Bunları da değerlendirebilirsiniz</h3>
        <div class="scenario-grid">
          ${scenarios.map((scenario) => `
            <div class="scenario-card">
              <h4>${escapeHtml(scenario.title)}</h4>
              <ul>
                <li>Aylık ödeme etkisi: ${escapeHtml(scenario.monthlyEffect)}</li>
                <li>Toplam maliyet etkisi: ${escapeHtml(scenario.totalEffect)}</li>
                <li>Risk etkisi: ${escapeHtml(scenario.riskEffect)}</li>
                <li>Yaşam kalitesi etkisi: ${escapeHtml(scenario.lifeEffect)}</li>
                <li>Uygunluk skoru: ${escapeHtml(String(scenario.score))}/100</li>
              </ul>
            </div>
          `).join('')}
        </div>
      </article>
    </section>
    <p class="result-disclaimer">Bu konut karar simülasyonu bir ön değerlendirme ekranıdır. Gerçek başvuru, ekspertiz, tapu ve bankacılık süreçleri öncesinde profesyonel doğrulama gereklidir.</p>
  `;
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bindHeroCtas() {
  ['#housing-hero-cta', '#housing-hero-secondary'].forEach((selector) => {
    $(selector)?.addEventListener('click', () => {
      $('#housing-flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function init() {
  bindHeroCtas();
  renderStep();
}

init();
