/**
 * Decision Engine V3 renderer — deterministic decision panel with optional memory block.
 */
import { escapeHtml } from '../core/security.js';
import { simulateWhatIfControls } from './decision-v3-whatif.js';

function esc(value) {
  return escapeHtml(String(value ?? ''));
}

function formatDelta(value, suffix = '') {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '0';
  const sign = n > 0 ? '+' : '';
  return `${sign}${Math.round(n)}${suffix}`;
}

function formatCost(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₺${Math.round(n).toLocaleString('tr-TR')}`;
}

function renderScoreBar(label, score) {
  const safeScore = Math.min(100, Math.max(0, Number(score) || 0));
  return `
    <div class="decision-v3-profile-row">
      <div class="decision-v3-profile-label">${esc(label)}</div>
      <div class="decision-v3-profile-track" aria-hidden="true">
        <span style="width:${safeScore}%"></span>
      </div>
      <strong class="decision-v3-profile-value">${esc(String(safeScore))}</strong>
    </div>
  `;
}

function renderStaticWhatIfScenarios(scenarios = []) {
  const items = Array.isArray(scenarios) ? scenarios : [];
  if (!items.length) return '';

  return `
    <section class="decision-v3-section decision-v3-whatif decision-v3-whatif-static" data-decision-whatif-static>
      <div class="decision-v3-section-head">
        <h3>What If Senaryoları</h3>
        <p class="decision-v3-muted">Örnek senaryo notları (statik)</p>
      </div>
      <ul class="decision-v3-whatif-list">
        ${items
          .map(
            (item) =>
              `<li><strong>${esc(item.title)}</strong><span>${esc(item.description)}</span></li>`
          )
          .join('')}
      </ul>
    </section>
  `;
}

function renderInteractiveWhatIf() {
  return `
    <section class="decision-v3-section decision-v3-whatif decision-v3-whatif-interactive" data-decision-whatif>
      <div class="decision-v3-section-head">
        <h3>What If Senaryoları</h3>
        <p class="decision-v3-muted">Parametreleri değiştirip deterministik simülasyon çalıştırın</p>
      </div>

      <div class="decision-v3-whatif-controls">
        <label class="decision-v3-slider-field">
          <span>Bütçe değişimi <strong data-whatif-budget-label>0%</strong></span>
          <input type="range" min="-20" max="20" step="1" value="0" data-whatif-budget aria-label="Bütçe değişimi yüzdesi">
          <small>-20% / +20%</small>
        </label>

        <label class="decision-v3-slider-field">
          <span>Peşinat değişimi <strong data-whatif-downpayment-label>0%</strong></span>
          <input type="range" min="0" max="30" step="1" value="0" data-whatif-downpayment aria-label="Peşinat yüzdesi">
          <small>0% / +30%</small>
        </label>

        <label class="decision-v3-slider-field">
          <span>Vade değişimi <strong data-whatif-term-label>36 ay</strong></span>
          <input type="range" min="12" max="60" step="6" value="36" data-whatif-term aria-label="Vade ay sayısı">
          <small>12 / 60 ay</small>
        </label>

        <label class="decision-v3-select-field">
          <span>Risk toleransı</span>
          <select data-whatif-risk aria-label="Risk toleransı">
            <option value="düşük">Düşük</option>
            <option value="orta" selected>Orta</option>
            <option value="yüksek">Yüksek</option>
          </select>
        </label>

        <button type="button" class="decision-v3-whatif-run" data-whatif-run>Simülasyonu çalıştır</button>
      </div>

      <div class="decision-v3-whatif-result" data-whatif-result hidden>
        <div class="decision-v3-whatif-result-grid">
          <div class="decision-v3-whatif-metric">
            <span>Karar Skoru</span>
            <strong data-whatif-result-decision>—</strong>
          </div>
          <div class="decision-v3-whatif-metric">
            <span>Risk Skoru</span>
            <strong data-whatif-result-risk>—</strong>
          </div>
          <div class="decision-v3-whatif-metric">
            <span>Toplam Maliyet</span>
            <strong data-whatif-result-cost>—</strong>
          </div>
        </div>
        <p class="decision-v3-whatif-explanation" data-whatif-result-explanation></p>
      </div>
    </section>
  `;
}

function renderWhatIfSection(model = {}) {
  if (model.whatIfInput && typeof model.whatIfInput === 'object') {
    return renderInteractiveWhatIf();
  }
  return renderStaticWhatIfScenarios(model.whatIfScenarios);
}

function renderMemoryProfile(memory) {
  if (!memory || memory.version !== 'memory-lite-v1') return '';

  const profile = memory.profile || {};
  const insights = Array.isArray(memory.insights) ? memory.insights.slice(0, 3) : [];
  const trend = memory.trend || { direction: 'unknown', explanation: '' };

  return `
    <section class="decision-v3-section decision-v3-memory" data-decision-memory-lite>
      <div class="decision-v3-section-head">
        <h3>Karar Profiliniz</h3>
        <p class="decision-v3-muted">Son ${esc(String(memory.historyCount || 0))} analiz kaydına göre tahmini profil</p>
      </div>
      <div class="decision-v3-profile-grid">
        ${renderScoreBar('Risk Tercihi', profile.riskPreference)}
        ${renderScoreBar('Bütçe Disiplini', profile.budgetDiscipline)}
        ${renderScoreBar('Konfor Önceliği', profile.comfortPriority)}
        ${renderScoreBar('Yatırım Odağı', profile.investmentFocus)}
        ${renderScoreBar('Finansman Hassasiyeti', profile.financeSensitivity)}
      </div>
      <p class="decision-v3-trend">${esc(trend.explanation || '')}</p>
      ${
        insights.length
          ? `<ul class="decision-v3-insights">${insights.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`
          : ''
      }
      <p class="decision-v3-privacy-note">Bu profil yalnızca cihazınızdaki analiz geçmişinden tahmini olarak oluşturulur.</p>
    </section>
  `;
}

/**
 * @param {object} model
 * @returns {string}
 */
export function renderDecisionV3Panel(model = {}) {
  const nextSteps = Array.isArray(model.nextSteps) ? model.nextSteps : [];
  const warnings = Array.isArray(model.warnings) ? model.warnings : [];
  const scoreFactors = Array.isArray(model.scoreFactors) ? model.scoreFactors.slice(0, 6) : [];
  const riskAnalysis = Array.isArray(model.riskAnalysis) ? model.riskAnalysis.slice(0, 4) : [];

  return `
    <div class="decision-v3-root" data-decision-v3-root data-vertical="${esc(model.vertical)}">
      <section class="decision-v3-section decision-v3-hero">
        <div class="decision-v3-hero-copy">
          <p class="decision-v3-kicker">${esc(model.recommendationLabel)}</p>
          <h2>${esc(model.title)}</h2>
          <p>${esc(model.executiveSummary)}</p>
        </div>
        <div class="decision-v3-score-card" aria-label="Karar skoru">
          <span class="decision-v3-score-value">${esc(String(model.decisionScore))}</span>
          <span class="decision-v3-score-meta">${esc(model.scoreLabel)} · ${esc(String(model.confidenceScore))}/100 güven</span>
          <span class="decision-v3-risk-pill">${esc(model.overallRisk)} risk</span>
        </div>
      </section>

      ${
        scoreFactors.length
          ? `<section class="decision-v3-section">
              <h3>Skor Faktörleri</h3>
              <ul class="decision-v3-factor-list">
                ${scoreFactors
                  .map(
                    (factor) =>
                      `<li><strong>${esc(factor.label)}</strong> ${esc(factor.impact || '')} · ${esc(factor.reason || '')}</li>`
                  )
                  .join('')}
              </ul>
            </section>`
          : ''
      }

      ${
        riskAnalysis.length
          ? `<section class="decision-v3-section">
              <h3>Risk Özeti</h3>
              <ul class="decision-v3-risk-list">
                ${riskAnalysis
                  .map(
                    (risk) =>
                      `<li><strong>${esc(risk.label || risk.key)}</strong> · ${esc(risk.level)} · ${esc(risk.detail || risk.reason || '')}</li>`
                  )
                  .join('')}
              </ul>
            </section>`
          : ''
      }

      ${
        warnings.length
          ? `<section class="decision-v3-section">
              <h3>Dikkat</h3>
              <ul class="decision-v3-warning-list">${warnings.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
            </section>`
          : ''
      }

      <section class="decision-v3-section decision-v3-action-plan">
        <h3>Aksiyon Planı</h3>
        <ol class="decision-v3-action-list">
          ${nextSteps.length ? nextSteps.map((step) => `<li>${esc(step)}</li>`).join('') : '<li>Sonraki adımlar hazırlanıyor.</li>'}
        </ol>
      </section>

      ${renderWhatIfSection(model)}
      ${renderMemoryProfile(model.memory)}
    </div>
  `;
}

function updateWhatIfResultCard(root, result) {
  const card = root.querySelector('[data-whatif-result]');
  if (!card || !result) return;

  const decisionEl = card.querySelector('[data-whatif-result-decision]');
  const riskEl = card.querySelector('[data-whatif-result-risk]');
  const costEl = card.querySelector('[data-whatif-result-cost]');
  const explanationEl = card.querySelector('[data-whatif-result-explanation]');

  if (decisionEl) {
    decisionEl.textContent = `${formatDelta(result.delta.decisionScore)} (${result.before.decisionScore} → ${result.after.decisionScore})`;
  }
  if (riskEl) {
    riskEl.textContent = `${formatDelta(result.delta.riskScore)} (${result.before.riskScore} → ${result.after.riskScore})`;
  }
  if (costEl) {
    const costDelta = Number.isFinite(result.delta.totalCost)
      ? `${formatDelta(result.delta.totalCost, ' ₺')} (${formatCost(result.before.totalCost)} → ${formatCost(result.after.totalCost)})`
      : `${formatCost(result.before.totalCost)} → ${formatCost(result.after.totalCost)}`;
    costEl.textContent = costDelta;
  }
  if (explanationEl) {
    explanationEl.textContent = result.explanation || '';
  }

  card.hidden = false;
}

function replaceWithStaticWhatIf(root, scenarios = []) {
  const section = root.querySelector('[data-decision-whatif]');
  if (!section) return;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderStaticWhatIfScenarios(scenarios);
  const fallback = wrapper.firstElementChild;
  if (fallback) section.replaceWith(fallback);
}

/**
 * @param {HTMLElement|DocumentFragment} root
 * @param {object} model
 */
export function bindDecisionV3WhatIfSimulator(root, model = {}) {
  try {
    if (!root || !model.whatIfInput) return;

    const section = root.querySelector('[data-decision-whatif]');
    if (!section) return;

    const budgetInput = section.querySelector('[data-whatif-budget]');
    const downPaymentInput = section.querySelector('[data-whatif-downpayment]');
    const termInput = section.querySelector('[data-whatif-term]');
    const riskInput = section.querySelector('[data-whatif-risk]');
    const runButton = section.querySelector('[data-whatif-run]');

    const budgetLabel = section.querySelector('[data-whatif-budget-label]');
    const downPaymentLabel = section.querySelector('[data-whatif-downpayment-label]');
    const termLabel = section.querySelector('[data-whatif-term-label]');

    const syncLabels = () => {
      if (budgetLabel && budgetInput) {
        const value = Number(budgetInput.value) || 0;
        budgetLabel.textContent = `${value > 0 ? '+' : ''}${value}%`;
      }
      if (downPaymentLabel && downPaymentInput) {
        downPaymentLabel.textContent = `${Number(downPaymentInput.value) || 0}%`;
      }
      if (termLabel && termInput) {
        termLabel.textContent = `${Number(termInput.value) || 36} ay`;
      }
    };

    [budgetInput, downPaymentInput, termInput].forEach((input) => {
      input?.addEventListener('input', syncLabels);
    });
    syncLabels();

    runButton?.addEventListener('click', () => {
      try {
        const result = simulateWhatIfControls(model.whatIfInput, {
          budgetPercent: Number(budgetInput?.value) || 0,
          downPaymentPercent: Number(downPaymentInput?.value) || 0,
          termMonths: Number(termInput?.value) || 36,
          riskTolerance: riskInput?.value || 'orta'
        });

        if (!result) {
          replaceWithStaticWhatIf(root, model.whatIfScenarios);
          return;
        }

        updateWhatIfResultCard(section, result);
      } catch {
        replaceWithStaticWhatIf(root, model.whatIfScenarios);
      }
    });
  } catch {
    replaceWithStaticWhatIf(root, model.whatIfScenarios);
  }
}

export function ensureDecisionV3Styles() {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return;

  const existing = document.querySelector('link[data-decision-v3-styles]');
  if (existing) return;

  if (typeof document.createElement !== 'function') return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/css/decision-engine-v3.css';
  link.setAttribute('data-decision-v3-styles', '1');
  document.head?.appendChild(link);
}

export { esc as escapeDecisionV3Html };
