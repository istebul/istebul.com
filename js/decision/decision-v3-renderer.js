/**
 * Decision Engine V3 renderer — deterministic decision panel with optional memory block.
 */
import { escapeHtml } from '../core/security.js';

function esc(value) {
  return escapeHtml(String(value ?? ''));
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

      ${renderMemoryProfile(model.memory)}
    </div>
  `;
}

export { esc as escapeDecisionV3Html };
