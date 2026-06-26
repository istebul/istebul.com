import {
  calculateDebtToIncome,
  calculateLocationFitScore,
  calculateOwnershipCost,
  calculateRiskLevel,
  calculateInvestmentPotential,
  calculateHousingDecisionScore,
  calculateDownPaymentStrength,
  calculateHomeTypeFit,
  calculateFinancingClarity,
  calculateRiskDensity,
  getScoreBand,
  buildHousingScenarios,
  formatTry
} from './real-estate-calculator.js';
import { TURKEY_CITIES } from './turkey-cities.js';
import { saveDecisionHistory } from '../core/app-bridge.js';
import { buildDecisionHistoryEntry, mergeDecisionHistoryEntry } from '../ui/decision-history-entry.js';
import { STORAGE_KEYS, readStoredJson, userScopedKey, writeStoredJson } from '../core/storage-keys.js';
import {
  buildKonutDecisionHistoryPayload,
  KONUT_DECISION_HISTORY_MAX
} from './konut-decision-history-payload.js';
import { renderPremiumDecisionDashboard } from '../ui/components/premium-decision-dashboard.js';
import { mountKonutResultsV2, syncCanonicalDecisionScore } from '../features/konut/konut-results-v2.js';
import {
  mirrorLegacySiteEvent,
  trackAnalysisCompleted,
  trackLeadFormOpened
} from '../platform/site-analytics.js';
import { withTimeout } from '../core/async-utils.js';
import { setSubmitLoading } from '../runtime/enterprise-form-ux.js';
import {
  getKonutFlow,
  resetKonutFieldsOnPurposeChange,
  validateKonutStep,
  validateKonutAllSteps,
  applyKonutFinancingDefaults
} from '../konut/konut-flow.js';
import { CASH_BUFFER_OPTIONS } from '../konut/konut-wizard-profile.js';
import { adaptKonutCard } from '../features/decision-cards/adapters/konut-adapter.js';
import {
  isDecisionCategoryCardsEnabled,
  isDecisionCardsVertical,
  renderDecisionCategoryCardsGridHtml,
  syncDecisionCardsFlagToDocument
} from '../features/decision-cards/decision-category-card-renderer.js';
import { bootstrapKonutFromAssistantQuery } from './konut-assistant-bootstrap.js';

function stepLabelsForState() {
  return getKonutFlow(state.purchasePurpose).stepLabels;
}
const PURPOSE_OPTIONS = [
  'Satın almak istiyorum',
  'Kiralamak istiyorum',
  'Yatırım amaçlı düşünüyorum',
  'Henüz karar aşamasındayım'
];
const HOME_TYPE_OPTIONS = [
  'Daire',
  'Müstakil',
  'Villa',
  'Site içi',
  'Yeni bina',
  'Eski bina ama uygun fiyatlı'
];
const LOCATION_PREFS = [
  ['merkezeYakin', 'Merkeze yakınlık'],
  ['ulasim', 'Ulaşım beklentisi'],
  ['okul', 'Okul yakınlığı'],
  ['hastane', 'Hastane yakınlığı'],
  ['is', 'İş yakınlığı'],
  ['sessiz', 'Sessiz yaşam'],
  ['merkezi', 'Merkezi yaşam']
];
const RISK_PREFS = [
  'Deprem riski hassasiyeti',
  'Düşük aidat',
  'Uygun kat tercihi',
  'Tapu durumu hassasiyeti',
  'Kira getirisi beklentisi',
  'Değer artış potansiyeli'
];

const state = {
  step: 0,
  purchasePurpose: '',
  totalBudget: '',
  downPayment: '',
  cash_buffer_months: '',
  monthlyCapacity: '',
  useFinancing: '',
  termMonths: '120',
  interestRate: '42',
  extraCostTolerance: '',
  loanAmount: '',
  monthlyIncome: '',
  currentDebt: '',
  city: '',
  district: '',
  proximityCenter: '',
  locationPreferences: [],
  homeType: '',
  householdSize: '',
  duesExpectation: '',
  roomCount: '',
  squareMeters: '',
  buildingAge: '',
  floorPref: '',
  earthquakeRiskInput: '40',
  dues: '',
  deedStatus: '',
  rentYield: '',
  renovationCost: '',
  transportCost: '',
  riskPreferences: [],
  leadName: '',
  leadEmail: '',
  leadPhone: '',
  wantPartnerOffer: false,
  assistantPrefillHint: false
};

let lastResultPayload = null;
let resultsRendered = false;
let wizardCompleteFired = false;
let leadOpenFired = false;
let selectedHousingScenarioId = '';

const HOUSING_ANALYSIS_START_KEY = 'ib_housing_analysis_start';

function hasHomeAnalysisStartFired() {
  try {
    return sessionStorage.getItem(HOUSING_ANALYSIS_START_KEY) === '1';
  } catch {
    return false;
  }
}

function markHomeAnalysisStartFired() {
  try {
    sessionStorage.setItem(HOUSING_ANALYSIS_START_KEY, '1');
  } catch {
    /* ignore */
  }
}

function maybeFireHomeAnalysisStart(source = 'interaction') {
  if (hasHomeAnalysisStartFired()) return;
  markHomeAnalysisStartFired();
  trackEvent('home_analysis_start', { source });
}

function maybeFireHomeLeadOpen(source = 'interaction') {
  if (leadOpenFired) return;
  leadOpenFired = true;
  trackEvent('home_lead_open', { source });
  trackLeadFormOpened('konut', { source });
}

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

function formatLocationLabel() {
  const il = String(state.city || '').trim();
  const ilce = String(state.district || '').trim();
  if (il && ilce) return `${il} / ${ilce}`;
  return il || '—';
}

function sessionId() {
  const key = 'ib_housing_session';
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = `home_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `home_${Date.now()}`;
  }
}

async function intake(type, payload = {}) {
  const base = window.__env?.SUPABASE_URL;
  const key = window.__env?.SUPABASE_ANON_KEY;
  if (!base || !key) return { ok: false };
  try {
    const res = await withTimeout(
      fetch(`${base.replace(/\/$/, '')}/functions/v1/housing-intake`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, session_id: sessionId(), ...payload })
      }),
      8000,
      null
    );
    if (!res) return { ok: false, timeout: true };
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (error) {
    console.warn('housing-intake-failed', { type, message: String(error?.message || error) });
    return { ok: false };
  }
}

function trackEvent(eventType, metadata = {}) {
  mirrorLegacySiteEvent(eventType, { category: 'konut', ...metadata });
  void intake('event', { event_type: eventType, metadata: { session_id: sessionId(), ...metadata } });
}

function mountProgress() {
  const progress = $('#housing-progress');
  if (!progress) return;
  progress.innerHTML = stepLabelsForState().map((label, idx) => `
    <span class="housing-progress-item ${idx <= state.step ? 'is-active' : ''}">${idx + 1}. ${escapeHtml(label)}</span>
  `).join('');
}

function cardButtons(options, field, selected) {
  return `<div class="housing-card-grid">${options.map((label) => `
    <button type="button" class="housing-option-card ${selected === label ? 'is-selected' : ''}" data-field="${field}" data-value="${escapeHtml(label)}">${escapeHtml(label)}</button>
  `).join('')}</div>`;
}

function cardButtonsFromPairs(pairs, field, selected) {
  return `<div class="housing-card-grid">${pairs.map(([value, label]) => `
    <button type="button" class="housing-option-card ${selected === value ? 'is-selected' : ''}" data-field="${field}" data-value="${escapeHtml(value)}">${escapeHtml(label)}</button>
  `).join('')}</div>`;
}

function chipButtons(options, selectedList, action) {
  return `<div class="housing-chip-grid">${options.map((item) => {
    const val = Array.isArray(item) ? item[0] : item;
    const label = Array.isArray(item) ? item[1] : item;
    const active = selectedList.includes(val) || selectedList.includes(label);
    return `<button type="button" class="housing-chip ${active ? 'is-selected' : ''}" data-action="${action}" data-value="${escapeHtml(val)}">${escapeHtml(label)}</button>`;
  }).join('')}</div>`;
}

function budgetFields() {
  return `
    <div class="housing-form-grid housing-form-grid--budget">
      <label>Toplam bütçe<input data-input="totalBudget" type="number" min="0" inputmode="numeric" value="${escapeHtml(state.totalBudget)}"></label>
      <label>Peşinat<input data-input="downPayment" type="number" min="0" inputmode="numeric" value="${escapeHtml(state.downPayment)}"></label>
      <div class="housing-form-span">
        <p class="housing-field-hint">Peşinat sonrası kaç aylık güvenlik payınız kalıyor?</p>
        ${cardButtonsFromPairs(CASH_BUFFER_OPTIONS, 'cash_buffer_months', state.cash_buffer_months)}
      </div>
      <label>Aylık ödeyebileceğiniz maksimum tutar<input data-input="monthlyCapacity" type="number" min="0" inputmode="numeric" value="${escapeHtml(state.monthlyCapacity)}"></label>
      <label>Aylık net gelir<input data-input="monthlyIncome" type="number" min="0" inputmode="numeric" value="${escapeHtml(state.monthlyIncome)}"></label>
      <label>Mevcut borç ödemeleri<input data-input="currentDebt" type="number" min="0" inputmode="numeric" value="${escapeHtml(state.currentDebt)}"></label>
      <label>Aidat beklentisi (aylık)<input data-input="duesExpectation" type="number" min="0" inputmode="numeric" value="${escapeHtml(state.duesExpectation)}" placeholder="Örn: 2500"></label>
      <label>Kredi kullanacak mısınız?
        <select data-input="useFinancing">
          <option value="">Seçin</option>
          <option value="evet" ${state.useFinancing === 'evet' ? 'selected' : ''}>Evet</option>
          <option value="hayir" ${state.useFinancing === 'hayir' ? 'selected' : ''}>Hayır</option>
        </select>
      </label>
      <label>Kredi tutarı<input data-input="loanAmount" type="number" min="0" value="${escapeHtml(state.loanAmount)}"></label>
      <label>Vade (ay)<input data-input="termMonths" type="number" min="1" max="360" value="${escapeHtml(state.termMonths)}"></label>
      <label>Tahmini faiz oranı (%)<input data-input="interestRate" type="number" min="0" step="0.01" value="${escapeHtml(state.interestRate)}"></label>
      <label>Ek masraf toleransı<input data-input="extraCostTolerance" type="number" min="0" value="${escapeHtml(state.extraCostTolerance)}" placeholder="Tapu, ekspertiz, taşınma"></label>
    </div>`;
}

function locationFields() {
  const cityOptions = TURKEY_CITIES.map((name) => `
    <option value="${escapeHtml(name)}" ${state.city === name ? 'selected' : ''}>${escapeHtml(name)}</option>
  `).join('');
  return `
    <div class="housing-form-grid">
      <label>İl <span class="housing-required">*</span>
        <select data-input="city" required>
          <option value="">İl seçin</option>
          ${cityOptions}
        </select>
      </label>
      <label>İlçe <span class="housing-optional">(opsiyonel)</span>
        <input data-input="district" value="${escapeHtml(state.district)}" placeholder="Örn. Karşıyaka">
      </label>
      <label>Merkeze yakınlık beklentisi<input data-input="proximityCenter" value="${escapeHtml(state.proximityCenter)}" placeholder="Örn. 15 dk içinde"></label>
    </div>
    <p class="housing-field-hint">Yaşam ve ulaşım tercihlerinizi seçin (opsiyonel):</p>
    ${chipButtons(LOCATION_PREFS, state.locationPreferences, 'toggle-location')}`;
}

function homeTypeFields() {
  return `
    ${cardButtons(getKonutFlow(state.purchasePurpose).homeTypes, 'homeType', state.homeType)}
    <div class="housing-form-grid">
      <label>Hane büyüklüğü<input data-input="householdSize" type="number" min="1" max="12" inputmode="numeric" value="${escapeHtml(state.householdSize)}" placeholder="Örn: 4"></label>
      <label>Oda sayısı<input data-input="roomCount" value="${escapeHtml(state.roomCount)}" placeholder="2+1, 3+1"></label>
      <label>Metrekare beklentisi<input data-input="squareMeters" type="number" min="0" inputmode="numeric" value="${escapeHtml(state.squareMeters)}"></label>
    </div>`;
}

function riskFields() {
  return `
    <div class="housing-form-grid">
      <label>Bina yaşı<input data-input="buildingAge" type="number" min="0" value="${escapeHtml(state.buildingAge)}"></label>
      <label>Kat tercihi<input data-input="floorPref" value="${escapeHtml(state.floorPref)}" placeholder="Örn. 2-5 arası"></label>
      <label>Aidat (aylık)<input data-input="dues" type="number" min="0" value="${escapeHtml(state.dues)}"></label>
      <label>Deprem/zemin riski (0-100)<input data-input="earthquakeRiskInput" type="number" min="0" max="100" value="${escapeHtml(state.earthquakeRiskInput)}"></label>
      <label>Tapu durumu<input data-input="deedStatus" value="${escapeHtml(state.deedStatus)}" placeholder="Kat mülkiyeti, tapu temiz"></label>
      <label>Kira getirisi beklentisi (aylık)<input data-input="rentYield" type="number" min="0" value="${escapeHtml(state.rentYield)}"></label>
      <label>Tadilat tahmini<input data-input="renovationCost" type="number" min="0" value="${escapeHtml(state.renovationCost)}"></label>
      <label>Ulaşım maliyeti (aylık)<input data-input="transportCost" type="number" min="0" value="${escapeHtml(state.transportCost)}"></label>
    </div>
    <p class="housing-field-hint">Risk ve tercih öncelikleri (opsiyonel, en fazla 6):</p>
    ${chipButtons(getKonutFlow(state.purchasePurpose).riskPrefs, state.riskPreferences, 'toggle-risk')}`;
}

function validateStep(stepIndex) {
  return validateKonutStep(state, stepIndex);
}

function validateAllSteps() {
  return validateKonutAllSteps(state);
}

function buildMetrics() {
  const ownership = calculateOwnershipCost(state);
  const monthlyDebt = ownership.monthlyPayment + Number(state.currentDebt || 0);
  const dti = calculateDebtToIncome(monthlyDebt, Number(state.monthlyIncome || 0));
  const locationFit = calculateLocationFitScore(state);
  const maintenanceRisk = Math.min(100, Number(state.buildingAge || 0) * 2 + Number(state.renovationCost || 0) / 40000 * 25);
  const earthquakeRiskScore = Math.min(100, Number(state.earthquakeRiskInput || 40));
  const locationRisk = Math.max(15, 100 - locationFit);
  const liquidityRisk = Math.min(100, Math.max(20, 70 - Number(state.squareMeters || 90) / 2));
  const lifeQuality = Math.min(100, locationFit * 0.55 + (state.riskPreferences.length ? 12 : 4) + (state.locationPreferences.length ? 8 : 0));
  const costPressure = Math.min(100, ownership.monthlyPayment / Math.max(Number(state.monthlyIncome || 1), 1) * 100);
  const capacity = Number(state.monthlyCapacity || 0);
  const budgetFit = capacity > 0
    ? Math.round(Math.max(20, 100 - Math.max(0, ownership.monthlyPayment - capacity) / capacity * 100))
    : Math.round(100 - costPressure);
  const downPaymentStrength = calculateDownPaymentStrength(state.totalBudget, state.downPayment);
  const homeTypeFit = calculateHomeTypeFit(state.homeType);
  const financingClarity = calculateFinancingClarity(state.useFinancing, state.loanAmount);
  const riskDensity = calculateRiskDensity(state.riskPreferences, earthquakeRiskScore);
  const risk = calculateRiskLevel({ dti, earthquakeRiskScore, maintenanceRisk, locationRisk, liquidityRisk });
  const investmentPotential = calculateInvestmentPotential({
    locationRisk,
    maintenanceRisk,
    locationFit,
    rentYield: Number(state.rentYield || 0)
  });
  const score = calculateHousingDecisionScore({
    dti,
    locationFit,
    investmentPotential,
    risk,
    lifeQuality,
    costPressure,
    budgetFit,
    downPaymentStrength,
    homeTypeFit,
    financingClarity,
    riskDensity
  });
  const scoreBand = getScoreBand(score);
  const creditLoadScore = Math.round(100 - Math.min(dti, 100));
  const metrics = {
    ownership,
    dti,
    locationFit,
    maintenanceRisk,
    earthquakeRiskScore,
    locationRisk,
    liquidityRisk,
    lifeQuality,
    costPressure,
    budgetFit,
    downPaymentStrength,
    homeTypeFit,
    financingClarity,
    riskDensity,
    risk,
    investmentPotential,
    score,
    scoreBand,
    creditLoadScore,
    creditLoadLabel: dti > 45 ? 'Yüksek baskı' : dti > 32 ? 'Orta baskı' : 'Kontrollü'
  };
  syncCanonicalDecisionScore(state, metrics, getScoreBand);
  return metrics;
}

function buildProfileSummary() {
  const financingLabel = state.useFinancing === 'evet'
    ? `Kredi (${formatTry(Number(state.loanAmount || 0))})`
    : state.useFinancing === 'hayir'
      ? 'Nakit ağırlıklı'
      : 'Henüz net değil';
  return [
    ['Amaç', state.purchasePurpose || '—'],
    ['Lokasyon', formatLocationLabel()],
    ['Konut tipi', state.homeType || '—'],
    ['Hane büyüklüğü', state.householdSize ? `${state.householdSize} kişi` : '—'],
    ['Bütçe', Number(state.totalBudget) ? formatTry(state.totalBudget) : '—'],
    ['Aidat beklentisi', Number(state.duesExpectation) ? formatTry(state.duesExpectation) : '—'],
    ['Finansman', financingLabel]
  ];
}

function buildAttentionItems(metrics) {
  const items = [];
  if (metrics.dti > 40) items.push('Aylık ödeme yükü gelirinize göre yüksek görünüyor; vade veya peşinat senaryosu gözden geçirin.');
  if (metrics.earthquakeRiskScore > 55) items.push('Deprem/zemin riski hassasiyetinize göre ek teknik kontrol önerilir.');
  if (Number(state.dues || 0) > 5000) items.push('Aidat seviyesi bütçe planınızı zorlayabilir.');
  if (Number(state.duesExpectation || 0) > 4000 && Number(state.duesExpectation || 0) > Number(state.monthlyCapacity || 0) * 0.15) {
    items.push('Aidat beklentiniz aylık kapasitenize göre yüksek görünüyor.');
  }
  if (!state.deedStatus.trim()) items.push('Tapu ve iskan durumu için resmi evrak kontrolü yapılmalıdır.');
  if (metrics.riskDensity > 50) items.push('Birden fazla risk faktörü işaretlendi; alternatif lokasyon ve konut tipi senaryoları önerilir.');
  if (!items.length) items.push('Mevcut girdiler dengeli görünüyor; yine de ekspertiz ve hukuki kontrol önerilir.');
  return items;
}

function buildNextStep(metrics) {
  const loc = formatLocationLabel();
  if (state.purchasePurpose === 'Kiralamak istiyorum') {
    return `${loc} için kira sözleşmesi ve toplam yaşam maliyetini karşılaştırmalı listeleyin.`;
  }
  if (state.purchasePurpose === 'Yatırım amaçlı düşünüyorum') {
    return `${loc} bölgesinde kira getirisi ve değer artış senaryolarını 3 alternatif konutla kıyaslayın.`;
  }
  if (metrics.dti > 40) {
    return 'Önce peşinatı artırarak kredi tutarını düşürmeyi simüle edin; ardından aynı ilde 2–3 alternatif için ekspertiz planlayın.';
  }
  return `${loc} içinde benzer bütçeli 2–3 konut için ekspertiz randevusu ve tapu ön kontrolü planlayın.`;
}

function updateSidePanel(mode = 'wizard') {
  const panel = document.getElementById('housing-live-preview');
  if (!panel) return;

  if (mode === 'results' && lastResultPayload) {
    const { metrics, ai } = lastResultPayload;
    panel.innerHTML = `
      <h3>Konut karar asistanınız</h3>
      <p class="housing-preview-score"><strong>${metrics.score}</strong><span>/100</span></p>
      <p class="housing-score-band housing-score-band--${escapeHtml(metrics.scoreBand.tone)}">${escapeHtml(metrics.scoreBand.label)}</p>
      <ul>
        <li><strong>Lokasyon:</strong> ${escapeHtml(formatLocationLabel())}</li>
        <li><strong>Toplam maliyet:</strong> ${formatTry(metrics.ownership.realTotal)}</li>
        <li><strong>Aylık yük:</strong> ${formatTry(metrics.ownership.monthlyPayment)}</li>
        <li><strong>Risk:</strong> ${escapeHtml(metrics.risk.label)}</li>
      </ul>
      <p class="housing-preview-ai"><strong>AI özeti:</strong> ${escapeHtml(ai.text.slice(0, 160))}${ai.text.length > 160 ? '…' : ''}</p>
      <p class="housing-preview-note">Tahmini analiz — bağlayıcı teklif değildir.</p>`;
    return;
  }

  if (state.step < 2) {
    panel.innerHTML = `
      <h3>Konut karar asistanınız</h3>
      <p>Adımları tamamladıkça bütçe, lokasyon ve risk önizlemesi burada güncellenir.</p>
      <ul>
        <li><strong>Amaç:</strong> ${escapeHtml(state.purchasePurpose || 'Henüz net değil')}</li>
        <li><strong>İl:</strong> ${escapeHtml(state.city || 'Henüz net değil')}</li>
      </ul>`;
    return;
  }

  try {
    const metrics = buildMetrics();
    panel.innerHTML = `
      <h3>Konut karar asistanınız</h3>
      <p class="housing-preview-score"><strong>${metrics.score}</strong><span>/100</span> önizleme skoru</p>
      <ul>
        <li><strong>Lokasyon:</strong> ${escapeHtml(formatLocationLabel())}</li>
        <li><strong>Bütçe uyumu:</strong> ${metrics.budgetFit}/100</li>
        <li><strong>Aylık yük:</strong> ${formatTry(metrics.ownership.monthlyPayment)}</li>
        <li><strong>Risk:</strong> ${escapeHtml(metrics.risk.label)}</li>
      </ul>
      <p class="housing-preview-note">Önizleme tahminidir; nihai teklif değildir.</p>`;
  } catch {
    panel.innerHTML = `<h3>Konut karar asistanınız</h3><p>Önizleme için gerekli alanları tamamlayın.</p>`;
  }
}

function renderStep() {
  const wizard = $('#housing-wizard');
  if (!wizard) return;

  const flow = getKonutFlow(state.purchasePurpose);
  const steps = [
    { title: 'Adım 1 — Karar amacı', html: cardButtons(PURPOSE_OPTIONS, 'purchasePurpose', state.purchasePurpose) },
    {
      title: flow.budgetTitle,
      html: `<p class="housing-field-hint">${escapeHtml(flow.budgetHint)}</p>${budgetFields()}`
    },
    { title: 'Adım 3 — Lokasyon tercihi', html: locationFields() },
    {
      title:
        flow.stepLabels[3] === 'Konut tipi'
          ? 'Adım 4 — Konut tipi'
          : `Adım 4 — ${flow.stepLabels[3]}`,
      html: homeTypeFields()
    },
    {
      title:
        flow.stepLabels[4] === 'Riskler'
          ? 'Adım 5 — Riskler ve öncelikler'
          : `Adım 5 — ${flow.stepLabels[4]}`,
      html: riskFields()
    }
  ];
  const body = steps[state.step];
  const isLast = state.step === steps.length - 1;

  wizard.innerHTML = `
    <section class="housing-step-card">
      ${state.assistantPrefillHint ? '<p class="housing-assistant-prefill-hint" data-housing-assistant-prefill>Karar Asistanı profilinizden bazı bilgiler önceden dolduruldu. Detaylı analiz için kalan adımları tamamlayın.</p>' : ''}
      <h2>${body.title}</h2>
      ${body.html}
      <p class="housing-validation" id="housing-validation" role="alert"></p>
      <div class="housing-step-actions">
        ${state.step > 0 ? '<button type="button" class="btn-secondary" id="housing-prev">Geri</button>' : ''}
        <button type="button" class="btn-primary" id="housing-next">${isLast ? 'Sonuçları gör' : 'Devam et'}</button>
      </div>
    </section>
  `;

  bindWizardEvents();
  mountProgress();
  updateSidePanel('wizard');
}

function bindWizardEvents() {
  document.querySelectorAll('[data-field]').forEach((button) => {
    button.addEventListener('click', () => {
      maybeFireHomeAnalysisStart('field_select');
      const field = button.dataset.field;
      const previousValue = state[field];
      state[field] = button.dataset.value || '';
      if (field === 'purchasePurpose') {
        resetKonutFieldsOnPurposeChange(state, previousValue, state.purchasePurpose);
      }
      renderStep();
    });
  });
  document.querySelectorAll('[data-action="toggle-location"]').forEach((button) => {
    button.addEventListener('click', () => {
      maybeFireHomeAnalysisStart('chip_select');
      const value = button.dataset.value;
      if (!value) return;
      state.locationPreferences = state.locationPreferences.includes(value)
        ? state.locationPreferences.filter((item) => item !== value)
        : [...state.locationPreferences, value];
      renderStep();
    });
  });
  document.querySelectorAll('[data-action="toggle-risk"]').forEach((button) => {
    button.addEventListener('click', () => {
      maybeFireHomeAnalysisStart('chip_select');
      const value = button.dataset.value;
      if (!value) return;
      if (state.riskPreferences.includes(value)) {
        state.riskPreferences = state.riskPreferences.filter((item) => item !== value);
      } else if (state.riskPreferences.length < 6) {
        state.riskPreferences = [...state.riskPreferences, value];
      }
      renderStep();
    });
  });
  document.querySelectorAll('[data-input]').forEach((input) => {
    const handler = () => {
      maybeFireHomeAnalysisStart('form_input');
      state[input.dataset.input] = input.type === 'checkbox' ? input.checked : input.value;
      updateSidePanel('wizard');
    };
    input.addEventListener('input', handler);
    input.addEventListener('change', handler);
  });
  $('#housing-prev')?.addEventListener('click', () => {
    state.step = Math.max(state.step - 1, 0);
    renderStep();
  });
  $('#housing-next')?.addEventListener('click', () => void handleNext());
}

async function handleNext() {
  maybeFireHomeAnalysisStart('next_click');
  const validationNode = $('#housing-validation');
  const nextBtn = $('#housing-next');
  const fail = (message, step = state.step) => {
    if (validationNode) validationNode.textContent = message;
    if (step !== state.step) {
      state.step = step;
      renderStep();
      if (validationNode) validationNode.textContent = message;
    }
    validationNode?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const currentError = validateStep(state.step);
  if (currentError) {
    fail(currentError);
    return;
  }

  const flow = getKonutFlow(state.purchasePurpose);
  if (state.step === 1) applyKonutFinancingDefaults(state, flow);

  const labels = stepLabelsForState();
  const advancingToResults = state.step >= labels.length - 1;

  setSubmitLoading(nextBtn, true, { busyLabel: 'Hazırlanıyor…' });

  try {
    if (state.step < labels.length - 1) {
      if (validationNode) validationNode.textContent = '';
      trackEvent('home_analysis_step_completed', { step: state.step + 1, label: labels[state.step] });
      state.step += 1;
      renderStep();
      return;
    }

    const allError = validateAllSteps();
    if (allError) {
      fail(allError.message, allError.step);
      return;
    }

    if (validationNode) validationNode.textContent = '';
    trackEvent('home_analysis_step_completed', { step: stepLabelsForState().length, label: 'Sonuçlar' });
    await renderResults();
  } catch (error) {
    console.warn('housing-wizard-results-failed', error);
    if (advancingToResults) {
      fail(
        'Sonuçlar hazırlanırken bir sorun oluştu. Zorunlu alanları kontrol edip tekrar deneyin.',
        labels.length - 1
      );
    }
  } finally {
    setSubmitLoading(nextBtn, false);
  }
}

async function getAuthUserId() {
  try {
    const base = window.__env?.SUPABASE_URL;
    const key = window.__env?.SUPABASE_ANON_KEY;
    if (!base || !key) return null;
    const { getSupabaseClient } = await import('../core/supabase.js');
    const client = getSupabaseClient();
    if (!client) return null;
    const { data } = await withTimeout(client.auth.getUser(), 4000, { data: { user: null } });
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

function persistKonutDecisionHistory(payload, userId) {
  const historyOptions = { maxEntries: KONUT_DECISION_HISTORY_MAX };

  if (saveDecisionHistory(payload, historyOptions)) {
    return payload;
  }

  if (!userId) return payload;

  const record = buildDecisionHistoryEntry(payload, { source: 'konut' });
  if (!record) return payload;

  const key = userScopedKey(STORAGE_KEYS.DECISION_HISTORY, userId);
  const history = readStoredJson(key, []);
  writeStoredJson(key, mergeDecisionHistoryEntry(history, record, KONUT_DECISION_HISTORY_MAX));
  return payload;
}

function saveReportLocally(metrics, aiText) {
  const payload = buildKonutDecisionHistoryPayload(metrics, aiText, state);
  void getAuthUserId().then((userId) => {
    if (!userId) return;
    persistKonutDecisionHistory(payload, userId);
  });
  try {
    const guestKey = 'ib_housing_saved_reports';
    const guest = JSON.parse(localStorage.getItem(guestKey) || '[]');
    guest.unshift(payload);
    localStorage.setItem(guestKey, JSON.stringify(guest.slice(0, 20)));
  } catch {}
  trackEvent('home_report_save', { score: metrics.score });
  return payload;
}

async function submitLead(metrics, aiText) {
  const hasContact = Boolean(state.leadName || state.leadEmail || state.leadPhone);
  if (!hasContact && !state.wantPartnerOffer) return;
  const loc = formatLocationLabel();
  await intake('lead', {
    formData: {
      full_name: state.leadName,
      email: state.leadEmail,
      phone: state.leadPhone,
      housing_purpose: state.purchasePurpose,
      housing_type: state.homeType,
      total_budget: Number(state.totalBudget || 0),
      down_payment: Number(state.downPayment || 0),
      loan_amount: Number(state.loanAmount || 0),
      monthly_income: Number(state.monthlyIncome || 0),
      monthly_capacity: Number(state.monthlyCapacity || 0),
      financing_needed: state.useFinancing === 'evet',
      term_months: Number(state.termMonths || 0),
      location_text: loc,
      priorities: [...state.locationPreferences, ...state.riskPreferences].join(', '),
      decision_score: metrics.score,
      risk_level: metrics.risk.label,
      ai_summary: aiText,
      notes: state.wantPartnerOffer ? 'partner_offer_requested' : ''
    }
  });
  trackEvent('home_lead_submit', { score: metrics.score, partner: state.wantPartnerOffer });
}

function renderContactBlock() {
  return `
    <section class="housing-result-contact">
      <h3>İletişim ve lead (opsiyonel)</h3>
      <p class="housing-field-hint">İletişim bilgisi vermeden de analiz sonucunu kullanabilirsiniz.</p>
      <div class="housing-form-grid">
        <label>Ad Soyad<input data-result-input="leadName" value="${escapeHtml(state.leadName)}"></label>
        <label>E-posta<input data-result-input="leadEmail" type="email" value="${escapeHtml(state.leadEmail)}"></label>
        <label>Telefon<input data-result-input="leadPhone" type="tel" value="${escapeHtml(state.leadPhone)}"></label>
      </div>
      <label class="housing-check-row">
        <input type="checkbox" id="housing-partner-offer-result" ${state.wantPartnerOffer ? 'checked' : ''}>
        Uzman/partner teklifi almak istiyorum
      </label>
      <button type="button" class="btn-secondary" id="housing-submit-lead">İletişim bilgilerimi gönder</button>
      <p class="housing-validation" id="housing-lead-validation"></p>
    </section>`;
}

const HOUSING_RESULTS_EMPTY_HTML = `
  <div class="housing-results-empty-state">
    <h2>Sonuçlar</h2>
    <p>Analizi tamamladığınızda konut skoru, maliyet tahmini ve senaryolar burada listelenir.</p>
  </div>`;

function shouldUseKonutDecisionCategoryCards() {
  return isDecisionCategoryCardsEnabled() && isDecisionCardsVertical('konut');
}

function buildKonutDecisionCategoryCardViewModels(scenarios, metrics) {
  return scenarios.map((scenario) =>
    adaptKonutCard({ scenario, state, metrics })
  );
}

function renderKonutDecisionCategoryCardsHtml(scenarios, metrics, selectedId = '') {
  if (!shouldUseKonutDecisionCategoryCards()) {
    syncDecisionCardsFlagToDocument(false);
    return '';
  }

  syncDecisionCardsFlagToDocument(true);
  return renderDecisionCategoryCardsGridHtml(
    buildKonutDecisionCategoryCardViewModels(scenarios, metrics),
    {
      selectedId,
      ariaLabel: 'Konut senaryoları'
    }
  );
}

function highlightKonutDecisionCard(root, scenarioId) {
  if (!root) return;
  selectedHousingScenarioId = String(scenarioId || '');
  root.querySelectorAll('.ib-decision-category-card[data-option]').forEach((card) => {
    const active = card.dataset.option === selectedHousingScenarioId;
    card.classList.toggle('is-selected', active);
    card.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function scrollKonutResultsInsight() {
  const insightRoot = document.querySelector('#housing-results [data-konut-v2-insight-root]');
  (insightRoot || document.querySelector('#housing-results .konut-v2-root'))?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

function scrollKonutAlternativesSection() {
  document
    .querySelector('#housing-results .konut-v2-alts')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bindKonutDecisionCardEvents(root) {
  if (!root || !shouldUseKonutDecisionCategoryCards()) return;

  root.querySelectorAll('.ib-decision-card-select').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      highlightKonutDecisionCard(root, button.dataset.option);
      scrollKonutResultsInsight();
    });
  });

  root.querySelectorAll('.ib-decision-card-secondary[data-action="compare"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      scrollKonutAlternativesSection();
    });
  });

  root.querySelectorAll('.ib-decision-category-card[data-option]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      highlightKonutDecisionCard(root, card.dataset.option);
      scrollKonutResultsInsight();
    });
  });
}

async function renderResults() {
  const results = $('#housing-results');
  const wizard = $('#housing-wizard');
  const flow = $('#housing-flow');
  if (!results) return;

  try {
    const metrics = buildMetrics();
    const scenarios = buildHousingScenarios({ score: metrics.score });
    const priorities = [...state.locationPreferences, ...state.riskPreferences];
    const ai = {
      text: `Konut karar skorunuz ${metrics.score}/100 (${metrics.scoreBand.label}). Aylık ödeme tahmini ${formatTry(metrics.ownership.monthlyPayment)}; ayrıntılı V2 raporu ve AI özeti aşağıdadır.`,
      source: 'engine'
    };
    const attention = buildAttentionItems(metrics);
    const nextStep = buildNextStep(metrics);
    const userId = await getAuthUserId();
    const profileRows = buildProfileSummary();

    lastResultPayload = { metrics, ai, scenarios, attention, nextStep };
    resultsRendered = true;

    if (!wizardCompleteFired) {
      wizardCompleteFired = true;
      trackEvent('home_wizard_complete', { score: metrics.score, risk: metrics.risk.label });
      trackAnalysisCompleted('konut', { score: metrics.score, risk: metrics.risk.label });
    }
    void trackEvent('home_results_view', { score: metrics.score, risk: metrics.risk.label });

    if (wizard) wizard.hidden = true;
    results.hidden = false;
    results.classList.add('is-visible');
    flow?.classList.add('has-results');

    results.innerHTML = `
      ${renderPremiumDecisionDashboard({
        category: 'konut',
        kicker: 'Konut karar sonucu',
        title: `Konut karar skoru ${metrics.score}/100`,
        scoreBand: metrics.scoreBand.label,
        decisionScore: metrics.score,
        totalCostLabel: formatTry(metrics.ownership.realTotal),
        totalCostHint: `Aylık ~${formatTry(metrics.ownership.monthlyPayment)}`,
        riskLabel: metrics.risk.label,
        riskDetail: metrics.creditLoadLabel,
        advantages: [
          `Lokasyon uygunluğu ${metrics.locationFit}/100`,
          `Bütçe uyumu ${metrics.budgetFit}/100`,
          `Peşinat gücü ${metrics.downPaymentStrength}/100`
        ],
        cautions: attention,
        aiSummary: ai.text,
        nextStep: nextStep
      })}

      <section class="housing-result-grid housing-result-grid--profile">
        <article class="result-card result-card--profile">
          <h3>Profil özeti</h3>
          <dl class="housing-profile-dl">
            ${profileRows.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}
          </dl>
        </article>
      </section>

      <section class="housing-result-grid housing-result-grid--scores">
        ${[
          ['Bütçe uyumu', metrics.budgetFit],
          ['Aylık yük baskısı', Math.round(100 - metrics.costPressure)],
          ['Finansman/kredi yükü', metrics.creditLoadScore],
          ['Lokasyon uygunluğu', metrics.locationFit],
          ['Yaşam uygunluğu', Math.round(metrics.lifeQuality)],
          ['Yatırım potansiyeli', metrics.investmentPotential],
          ['Peşinat gücü', metrics.downPaymentStrength],
          ['Risk yoğunluğu', Math.round(100 - metrics.riskDensity)]
        ].map(([label, value]) => `<article class="result-card result-card--metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}/100</strong></article>`).join('')}
      </section>

      <section class="housing-result-grid housing-result-grid--dual">
        <article class="result-card">
          <h3>Toplam maliyet tahmini</h3>
          <ul class="result-list">
            <li><span>Konut fiyatı</span><strong>${formatTry(metrics.ownership.homePrice)}</strong></li>
            <li><span>Peşinat</span><strong>${formatTry(metrics.ownership.downPayment)}</strong></li>
            <li><span>Tahmini aylık ödeme</span><strong>${formatTry(metrics.ownership.monthlyPayment)}</strong></li>
            <li><span>Toplam geri ödeme</span><strong>${formatTry(metrics.ownership.totalRepayment)}</strong></li>
            <li><span>Tapu/ekspertiz/masraf</span><strong>${formatTry(metrics.ownership.titleFees)}</strong></li>
            <li><span>Gerçek toplam maliyet</span><strong>${formatTry(metrics.ownership.realTotal)}</strong></li>
          </ul>
        </article>
        <article class="result-card">
          <h3>Aylık yük ve finansman</h3>
          <p>Tahmini aylık taksit: <strong>${formatTry(metrics.ownership.monthlyPayment)}</strong></p>
          <p>Ödeme kapasitesi: <strong>${formatTry(Number(state.monthlyCapacity || 0))}</strong></p>
          <p>Borç/gelir etkisi: <strong>%${Math.round(metrics.dti)}</strong> (${escapeHtml(metrics.creditLoadLabel)})</p>
          <p>Risk seviyesi: <strong>${escapeHtml(metrics.risk.label)}</strong></p>
        </article>
      </section>

      <section class="housing-result-actions">
        <button type="button" class="btn-primary" id="housing-save-report">${userId ? 'Raporu kaydet' : 'Raporu kaydetmek için giriş yapın'}</button>
        <button type="button" class="btn-secondary" id="housing-restart">Tekrar analiz et</button>
        <button type="button" class="btn-secondary" id="housing-partner-cta">Uzman/partner teklifi almak istiyorum</button>
      </section>

      ${renderContactBlock()}

      <p class="result-disclaimer">Bu analiz bilgilendirme amaçlıdır; nihai karar öncesinde tapu, ekspertiz, kredi ve hukuki kontroller yapılmalıdır.</p>
      ${!userId ? '<p class="housing-login-hint"><a href="/profil/?returnTo=/konut/">Giriş yapın</a> — raporunuzu profilinizde saklayın.</p>' : ''}

      <section class="housing-result-grid">
        <article class="result-card">
          <h3>Alternatif senaryolar</h3>
          <div class="scenario-grid">${scenarios.slice(0, 4).map((scenario) => `
            <div class="scenario-card">
              <h4>${escapeHtml(scenario.title)}</h4>
              <p>${escapeHtml(scenario.monthlyEffect)} · ${escapeHtml(scenario.riskEffect)}</p>
            </div>`).join('')}</div>
        </article>
      </section>
    `;

    bindResultsEvents(metrics, ai, userId);
    updateSidePanel('results');

    void mountKonutResultsV2({
      mountNode: results,
      state,
      metrics,
      scenarios,
      attention,
      userId,
      track: (eventName, meta) => trackEvent(eventName, meta),
      onRestart: handleHousingRestart,
      onPartnerCta: (feedbackEl) => handleHousingPartnerCta(metrics, ai.text, feedbackEl)
    });

    if (shouldUseKonutDecisionCategoryCards()) {
      const cardScenarios = scenarios.slice(0, 4);
      results.insertAdjacentHTML(
        'beforeend',
        renderKonutDecisionCategoryCardsHtml(cardScenarios, metrics, selectedHousingScenarioId)
      );
      bindKonutDecisionCardEvents(results);
    } else {
      syncDecisionCardsFlagToDocument(false);
    }

    requestAnimationFrame(() => {
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  } catch (error) {
    console.warn('housing-results-failed', error);
    results.hidden = false;
    results.classList.add('is-visible');
    results.innerHTML = `
      <article class="result-card">
        <h3>Sonuç oluşturulamadı</h3>
        <p>Lütfen zorunlu alanları kontrol edip tekrar deneyin. İl seçimi ve bütçe bilgileri eksiksiz olmalıdır.</p>
        <button type="button" class="btn-primary" id="housing-retry-results">Forma dön</button>
      </article>`;
    $('#housing-retry-results')?.addEventListener('click', () => {
      results.hidden = false;
      results.innerHTML = HOUSING_RESULTS_EMPTY_HTML;
      if (wizard) wizard.hidden = false;
      state.step = stepLabelsForState().length - 1;
      renderStep();
    });
  }
}

function handleHousingRestart() {
  const results = $('#housing-results');
  const wizard = $('#housing-wizard');
  const flow = $('#housing-flow');
  state.step = 0;
  resultsRendered = false;
  lastResultPayload = null;
  wizardCompleteFired = false;
  leadOpenFired = false;
  selectedHousingScenarioId = '';
  syncDecisionCardsFlagToDocument(false);
  if (wizard) wizard.hidden = false;
  if (results) {
    results.hidden = false;
    results.classList.remove('is-visible');
    results.innerHTML = HOUSING_RESULTS_EMPTY_HTML;
  }
  flow?.classList.remove('has-results');
  renderStep();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleHousingSaveReport(metrics, aiText, userId, feedbackEl) {
  if (!userId) {
    window.location.href = '/profil/?returnTo=/konut/';
    return;
  }
  saveReportLocally(metrics, aiText);
  const message = 'Rapor profilinize kaydedildi.';
  if (feedbackEl) {
    feedbackEl.hidden = false;
    feedbackEl.textContent = message;
    feedbackEl.className = 'konut-v2-action-feedback housing-save-ok';
    return;
  }
  const msg = document.createElement('p');
  msg.className = 'housing-save-ok';
  msg.textContent = message;
  $('#housing-save-report')?.insertAdjacentElement('afterend', msg);
}

async function handleHousingPartnerCta(metrics, aiText, feedbackEl) {
  maybeFireHomeLeadOpen('partner_cta');
  state.wantPartnerOffer = true;
  await submitLead(metrics, aiText);
  const message = 'Partner talebiniz alındı. Ekibimiz sizinle iletişime geçecektir.';
  if (feedbackEl) {
    feedbackEl.hidden = false;
    feedbackEl.textContent = message;
    feedbackEl.className = 'konut-v2-action-feedback housing-save-ok';
    return;
  }
  const msg = document.createElement('p');
  msg.className = 'housing-save-ok';
  msg.textContent = message;
  $('#housing-partner-cta')?.insertAdjacentElement('afterend', msg);
}

function bindResultsEvents(metrics, ai, userId) {
  const results = $('#housing-results');

  results?.querySelectorAll('[data-result-input]').forEach((input) => {
    input.addEventListener('input', () => {
      maybeFireHomeLeadOpen('lead_form');
      state[input.dataset.resultInput] = input.value;
    });
    input.addEventListener('focus', () => {
      maybeFireHomeLeadOpen('lead_form');
    });
  });
  $('#housing-partner-offer-result')?.addEventListener('change', (e) => {
    state.wantPartnerOffer = e.target.checked;
  });

  $('#housing-save-report')?.addEventListener('click', () => {
    handleHousingSaveReport(metrics, ai.text, userId);
  });

  $('#housing-restart')?.addEventListener('click', handleHousingRestart);

  $('#housing-partner-cta')?.addEventListener('click', async () => {
    await handleHousingPartnerCta(metrics, ai.text);
  });

  $('#housing-submit-lead')?.addEventListener('click', async () => {
    const leadValidation = $('#housing-lead-validation');
    if (!state.leadName && !state.leadEmail && !state.leadPhone && !state.wantPartnerOffer) {
      if (leadValidation) leadValidation.textContent = 'En az bir iletişim alanı doldurun veya partner kutusunu işaretleyin.';
      return;
    }
    if (leadValidation) leadValidation.textContent = '';
    await submitLead(metrics, ai.text);
    if (leadValidation) leadValidation.textContent = 'Bilgileriniz alındı. Teşekkürler.';
  });
}

function bindHeroCtas() {
  $('#housing-hero-cta')?.addEventListener('click', () => {
    maybeFireHomeAnalysisStart('hero_cta');
    $('#housing-flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#housing-hero-secondary')?.addEventListener('click', () => {
    maybeFireHomeAnalysisStart('hero_secondary');
    $('#housing-flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

async function init() {
  bootstrapKonutFromAssistantQuery(state, new URLSearchParams(window.location.search));
  bindHeroCtas();
  renderStep();
  await intake('event', { event_type: 'housing_page_view', metadata: {} });
}

init();
