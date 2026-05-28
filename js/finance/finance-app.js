import {
  calculateMonthlyPayment,
  calculateTotalRepayment,
  calculateTotalInterest,
  calculateDebtToIncome,
  calculateSafeInstallment,
  calculatePaymentComfortScore,
  calculateCashFlowFitScore,
  calculateRiskLevel,
  calculateFinanceDecisionScore,
  buildFinanceScenarios,
  formatTry
} from './finance-calculator.js';
import { buildFinanceAiCommentary } from './finance-ai.js';

const PURPOSES = ['Araç kredisi', 'Konut kredisi', 'İhtiyaç kredisi', 'Eğitim finansmanı', 'Tatil finansmanı', 'Borç kapatma', 'İşletme finansmanı', 'Diğer'];
const PRIORITIES = ['Düşük risk', 'En düşük faiz', 'En düşük toplam maliyet', 'Düşük aylık taksit', 'Hızlı onay', 'Esnek ödeme', 'Erken kapama', 'Masrafsız kredi', 'Sabit taksit', 'Kısa vade'];
const TERM_OPTIONS = [6, 12, 24, 36, 48, 60];

const state = {
  step: 0,
  financePurpose: '',
  totalNeed: '',
  downPayment: '',
  loanAmount: '',
  termMonths: '36',
  manualTerm: '',
  monthlyRate: '',
  prefLowMonthly: false,
  prefLowTotal: false,
  prefEarlyClose: false,
  prefStability: false,
  monthlyIncome: '',
  existingDebt: '',
  housingExpense: '',
  fixedExpenses: '',
  householdSize: '',
  priorities: [],
  leadName: '',
  leadEmail: '',
  leadPhone: ''
};

function $(s, root = document) { return root.querySelector(s); }
function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function sessionId() {
  const key = 'ib_finance_session';
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = `fin_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `fin_${Date.now()}`;
  }
}

async function intake(type, payload = {}) {
  const base = window.__env?.SUPABASE_URL;
  const key = window.__env?.SUPABASE_ANON_KEY;
  if (!base || !key) return { ok: false };
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/functions/v1/finance-intake`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, session_id: sessionId(), ...payload })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false };
  }
}

function renderProgress() {
  const progress = $('#finance-progress');
  if (!progress) return;
  const labels = ['Amaç', 'Tutar', 'Vade', 'Gelir/Gider', 'Öncelikler'];
  progress.innerHTML = labels.map((label, i) => `<span class="finance-progress-item ${i <= state.step ? 'is-active' : ''}">${i + 1}. ${label}</span>`).join('');
}

function cards(options, field, selected) {
  return `<div class="finance-card-grid">${options.map((opt) => `<button type="button" class="finance-option-card ${selected === opt ? 'is-selected' : ''}" data-field="${field}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('')}</div>`;
}
function chips(options, selected, action) {
  return `<div class="finance-chip-grid">${options.map((opt) => `<button type="button" class="finance-chip ${selected.includes(opt) ? 'is-selected' : ''}" data-action="${action}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('')}</div>`;
}

function stepBody() {
  if (state.step === 0) return cards(PURPOSES, 'financePurpose', state.financePurpose);
  if (state.step === 1) {
    return `<div class="finance-form-grid">
      <label>Toplam ihtiyaç tutarı<input data-input="totalNeed" type="number" min="0" value="${escapeHtml(state.totalNeed)}"></label>
      <label>Peşinat / birikim<input data-input="downPayment" type="number" min="0" value="${escapeHtml(state.downPayment)}"></label>
      <label>Talep edilen kredi tutarı<input data-input="loanAmount" type="number" min="0" value="${escapeHtml(state.loanAmount)}"></label>
      <label>Para birimi<input value="TRY" disabled></label>
    </div>`;
  }
  if (state.step === 2) {
    return `<div class="finance-form-grid">
      <label>Vade seçimi
        <select data-input="termMonths">${TERM_OPTIONS.map((m) => `<option value="${m}" ${String(m) === String(state.termMonths) ? 'selected' : ''}>${m} ay</option>`).join('')}</select>
      </label>
      <label>Manuel vade (ay)<input data-input="manualTerm" type="number" min="1" max="120" value="${escapeHtml(state.manualTerm)}"></label>
      <label>Tahmini aylık faiz oranı (%)<input data-input="monthlyRate" type="number" min="0" step="0.01" value="${escapeHtml(state.monthlyRate)}"></label>
    </div>
    <div class="finance-toggle-grid">
      <label><input type="checkbox" data-check="prefLowMonthly" ${state.prefLowMonthly ? 'checked' : ''}> Düşük aylık ödeme önceliği</label>
      <label><input type="checkbox" data-check="prefLowTotal" ${state.prefLowTotal ? 'checked' : ''}> Düşük toplam maliyet önceliği</label>
      <label><input type="checkbox" data-check="prefEarlyClose" ${state.prefEarlyClose ? 'checked' : ''}> Erken kapama esnekliği</label>
      <label><input type="checkbox" data-check="prefStability" ${state.prefStability ? 'checked' : ''}> Ödeme istikrarı</label>
    </div>`;
  }
  if (state.step === 3) {
    return `<div class="finance-form-grid">
      <label>Aylık net gelir<input data-input="monthlyIncome" type="number" min="0" value="${escapeHtml(state.monthlyIncome)}"></label>
      <label>Mevcut borç ödemeleri<input data-input="existingDebt" type="number" min="0" value="${escapeHtml(state.existingDebt)}"></label>
      <label>Kira / konut gideri<input data-input="housingExpense" type="number" min="0" value="${escapeHtml(state.housingExpense)}"></label>
      <label>Diğer sabit giderler<input data-input="fixedExpenses" type="number" min="0" value="${escapeHtml(state.fixedExpenses)}"></label>
      <label>Hane kişi sayısı<input data-input="householdSize" type="number" min="1" value="${escapeHtml(state.householdSize || '1')}"></label>
    </div>`;
  }
  return chips(PRIORITIES, state.priorities, 'toggle-priority');
}

function validate() {
  if (state.step === 0 && !state.financePurpose) return 'Finansman amacı seçin.';
  if (state.step === 1 && !Number(state.loanAmount)) return 'Talep edilen kredi tutarı zorunludur.';
  if (state.step === 2 && !Number(state.monthlyRate)) return 'Tahmini aylık faiz oranı zorunludur.';
  if (state.step === 3 && !Number(state.monthlyIncome)) return 'Aylık net gelir zorunludur.';
  if (state.step === 4 && !state.priorities.length) return 'En az bir öncelik seçin.';
  return '';
}

function bindStepEvents() {
  document.querySelectorAll('[data-field]').forEach((el) => el.addEventListener('click', () => {
    state[el.dataset.field] = el.dataset.value || '';
    renderStep();
  }));
  document.querySelectorAll('[data-action="toggle-priority"]').forEach((el) => el.addEventListener('click', () => {
    const value = el.dataset.value;
    if (!value) return;
    state.priorities = state.priorities.includes(value) ? state.priorities.filter((x) => x !== value) : [...state.priorities, value];
    renderStep();
  }));
  document.querySelectorAll('[data-input]').forEach((el) => el.addEventListener('input', () => { state[el.dataset.input] = el.value; }));
  document.querySelectorAll('[data-check]').forEach((el) => el.addEventListener('change', () => { state[el.dataset.check] = el.checked; }));
  $('#finance-prev')?.addEventListener('click', () => { state.step = Math.max(state.step - 1, 0); renderStep(); });
  $('#finance-next')?.addEventListener('click', async () => {
    const error = validate();
    const node = $('#finance-validation');
    if (error) {
      if (node) node.textContent = error;
      return;
    }
    if (state.step < 4) {
      await intake('event', { event_type: 'finance_step_completed', metadata: { step: state.step } });
      state.step += 1;
      renderStep();
      return;
    }
    await renderResults();
  });
}

function renderStep() {
  const wizard = $('#finance-wizard');
  if (!wizard) return;
  const title = [
    'Adım 1 — Finansman amacı',
    'Adım 2 — Tutar ve peşinat',
    'Adım 3 — Vade ve oran',
    'Adım 4 — Gelir-gider analizi',
    'Adım 5 — Öncelikler'
  ][state.step];
  wizard.innerHTML = `<section class="finance-step-card">
    <h2>${title}</h2>
    ${stepBody()}
    <p class="finance-validation" id="finance-validation"></p>
    <div class="finance-step-actions">
      ${state.step > 0 ? '<button type="button" class="btn-secondary" id="finance-prev">Geri</button>' : ''}
      <button type="button" class="btn-primary" id="finance-next">${state.step === 4 ? 'Analizi oluştur' : 'Devam et'}</button>
    </div>
  </section>`;
  bindStepEvents();
  renderProgress();
}

function calculateMetrics() {
  const months = Number(state.manualTerm || state.termMonths || 36);
  const monthlyRate = Number(state.monthlyRate || 0) / 100;
  const principal = Number(state.loanAmount || 0);
  const monthlyPayment = calculateMonthlyPayment(principal, monthlyRate, months);
  const totalRepayment = calculateTotalRepayment(monthlyPayment, months);
  const totalInterest = calculateTotalInterest(totalRepayment, principal);
  const fileCosts = principal * 0.015;
  const insuranceCosts = principal * 0.012;
  const realTotal = totalRepayment + fileCosts + insuranceCosts;
  const fixedExpenses = Number(state.fixedExpenses || 0) + Number(state.housingExpense || 0);
  const dti = calculateDebtToIncome(monthlyPayment, Number(state.monthlyIncome || 0), Number(state.existingDebt || 0));
  const safeInstallment = calculateSafeInstallment(Number(state.monthlyIncome || 0), fixedExpenses, Number(state.existingDebt || 0));
  const paymentComfort = calculatePaymentComfortScore({ monthlyPayment, safeInstallment, dti });
  const cashFlowFit = calculateCashFlowFitScore({
    income: Number(state.monthlyIncome || 0),
    fixedExpenses,
    existingDebt: Number(state.existingDebt || 0),
    monthlyPayment
  });
  const totalCostEfficiency = Math.max(20, Math.round(100 - (realTotal - principal) / Math.max(principal || 1, 1) * 100));
  const risk = calculateRiskLevel({ dti, cashFlowFit, paymentComfort, priorities: state.priorities });
  const decisionScore = calculateFinanceDecisionScore({
    paymentComfort,
    cashFlowFit,
    totalCostEfficiency,
    riskScore: risk.score
  });
  return { months, monthlyRate, principal, monthlyPayment, totalRepayment, totalInterest, fileCosts, insuranceCosts, realTotal, dti, safeInstallment, paymentComfort, cashFlowFit, totalCostEfficiency, risk, decisionScore };
}

async function submitLead(metrics, aiText) {
  const hasContact = Boolean(state.leadName || state.leadEmail || state.leadPhone);
  if (!hasContact) return;
  await intake('lead', {
    formData: {
      full_name: state.leadName,
      email: state.leadEmail,
      phone: state.leadPhone,
      finance_purpose: state.financePurpose,
      requested_amount: Number(state.totalNeed || 0),
      down_payment: Number(state.downPayment || 0),
      loan_amount: Number(state.loanAmount || 0),
      term_months: metrics.months,
      monthly_rate: Number(state.monthlyRate || 0),
      monthly_income: Number(state.monthlyIncome || 0),
      existing_debt: Number(state.existingDebt || 0),
      fixed_expenses: Number(state.fixedExpenses || 0) + Number(state.housingExpense || 0),
      priorities: state.priorities.join(', '),
      decision_score: metrics.decisionScore,
      risk_level: metrics.risk.label,
      ai_summary: aiText
    }
  });
}

async function renderResults() {
  const metrics = calculateMetrics();
  const ai = await buildFinanceAiCommentary({
    financePurpose: state.financePurpose,
    termMonths: metrics.months,
    monthlyPayment: metrics.monthlyPayment,
    totalRepayment: metrics.totalRepayment,
    dti: metrics.dti,
    safeInstallment: metrics.safeInstallment,
    priorities: state.priorities,
    risk: metrics.risk
  });
  await intake('event', { event_type: 'finance_results_view', metadata: { score: metrics.decisionScore, risk: metrics.risk.label } });
  const scenarios = buildFinanceScenarios({ score: metrics.decisionScore });
  const results = $('#finance-results');
  if (!results) return;
  results.hidden = false;
  results.innerHTML = `
    <section class="finance-result-grid finance-result-grid--scores">
      ${[
        ['Genel Uygunluk', metrics.decisionScore],
        ['Ödeme Konforu', metrics.paymentComfort],
        ['Toplam Maliyet Verimliliği', metrics.totalCostEfficiency],
        ['Risk Seviyesi', 100 - metrics.risk.score],
        ['Nakit Akışı Uyumu', metrics.cashFlowFit]
      ].map((row) => `<article class="result-card"><span>${escapeHtml(row[0])}</span><strong>${escapeHtml(String(row[1]))}/100</strong></article>`).join('')}
    </section>
    <section class="finance-result-grid finance-result-grid--dual">
      <article class="result-card">
        <h3>AI Yorumu (${ai.source === 'ai' ? 'AI' : 'Fallback'})</h3>
        <p>${escapeHtml(ai.text)}</p>
      </article>
      <article class="result-card">
        <h3>Toplam maliyet paneli (Tahmini analiz)</h3>
        <ul class="result-list">
          <li><span>Kredi tutarı</span><strong>${formatTry(metrics.principal)}</strong></li>
          <li><span>Tahmini aylık taksit</span><strong>${formatTry(metrics.monthlyPayment)}</strong></li>
          <li><span>Toplam geri ödeme</span><strong>${formatTry(metrics.totalRepayment)}</strong></li>
          <li><span>Toplam faiz yükü</span><strong>${formatTry(metrics.totalInterest)}</strong></li>
          <li><span>Dosya/masraf tahmini</span><strong>${formatTry(metrics.fileCosts)}</strong></li>
          <li><span>Sigorta/ek maliyet</span><strong>${formatTry(metrics.insuranceCosts)}</strong></li>
          <li><span>Gerçek toplam maliyet</span><strong>${formatTry(metrics.realTotal)}</strong></li>
          <li><span>Borç/gelir oranı</span><strong>%${Math.round(metrics.dti)}</strong></li>
        </ul>
      </article>
    </section>
    <section class="finance-result-grid">
      <article class="result-card">
        <h3>Alternatif senaryolar</h3>
        <div class="scenario-grid">${scenarios.map((sc) => `<div class="scenario-card">
          <h4>${escapeHtml(sc.title)}</h4>
          <ul>
            <li>Aylık ödeme etkisi: ${escapeHtml(sc.monthlyEffect)}</li>
            <li>Toplam maliyet etkisi: ${escapeHtml(sc.totalEffect)}</li>
            <li>Risk etkisi: ${escapeHtml(sc.riskEffect)}</li>
            <li>Uygunluk skoru: ${escapeHtml(String(sc.score))}/100</li>
          </ul>
        </div>`).join('')}</div>
      </article>
    </section>
    <section class="result-card finance-lead-card">
      <h3>İsterseniz geri dönüş alabilirsiniz</h3>
      <div class="finance-form-grid">
        <label>Ad soyad<input id="finance-lead-name" value="${escapeHtml(state.leadName)}"></label>
        <label>E-posta<input id="finance-lead-email" value="${escapeHtml(state.leadEmail)}"></label>
        <label>Telefon<input id="finance-lead-phone" value="${escapeHtml(state.leadPhone)}"></label>
      </div>
      <div class="finance-step-actions">
        <button type="button" class="btn-primary" id="finance-save-lead">Analizimi kaydet</button>
      </div>
      <p class="result-disclaimer">Bu karar simülasyonu gerçek başvuru öncesi ön değerlendirme içindir; kesin finansal tavsiye değildir.</p>
    </section>`;
  $('#finance-save-lead')?.addEventListener('click', async () => {
    state.leadName = $('#finance-lead-name')?.value?.trim() || '';
    state.leadEmail = $('#finance-lead-email')?.value?.trim() || '';
    state.leadPhone = $('#finance-lead-phone')?.value?.trim() || '';
    await submitLead(metrics, ai.text);
    const msg = document.createElement('p');
    msg.className = 'result-disclaimer';
    msg.textContent = 'Lead kaydı tahmini analiz çıktısıyla alındı.';
    $('#finance-save-lead')?.insertAdjacentElement('afterend', msg);
  });
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bindHero() {
  ['#finance-hero-cta', '#finance-hero-secondary'].forEach((id) => {
    $(id)?.addEventListener('click', () => $('#finance-flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  });
}

async function init() {
  bindHero();
  renderStep();
  await intake('event', { event_type: 'finance_page_view', metadata: {} });
}

init();
