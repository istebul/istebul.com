/**
 * Results V3 UI — V2 panellerinin üstüne premium katman (mount only).
 */
import { escapeHtml } from '../../core/security.js';
import { safeTrackEvent } from './results-engine.js';
import { buildResultsV3Payload, extendPdfReportDataV3 } from '../../shared/results-v3-engine.js';

function formatTry(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(n);
}

function scoreTone(score) {
  if (score >= 78) return 'excellent';
  if (score >= 62) return 'good';
  if (score >= 48) return 'fair';
  return 'low';
}

/**
 * @param {HTMLElement} mountNode
 * @param {object} opts
 * @param {'auto'|'konut'|'tatil'|'finansman'} opts.category
 * @param {object} opts.model — V2 mount dönüş modeli
 * @param {Function} [opts.track]
 * @returns {object|null}
 */
export function mountResultsV3(mountNode, opts = {}) {
  if (!mountNode || !opts.model) return null;

  const category = opts.category || opts.model?.pdfReportData?.category || 'konut';
  const model = opts.model;
  const track = opts.track;

  mountNode.querySelector('.results-v3-root')?.remove();

  const totalCostInput = {
    amount:
      model.pdfReportData?.totalCost?.tco12Months ||
      model.pdfReportData?.totalCost?.tenYearTotal ||
      model.pdfReportData?.totalCost?.tripTotal ||
      model.pdfReportData?.totalCost?.totalRepayment ||
      model.pdfReportData?.totalCost?.amount,
    formatted: model.totalCostLabel || model.totalCostLabelRaw,
    isEstimate: model.pdfReportData?.totalCost?.isEstimate !== false,
    note: model.pdfReportData?.totalCost?.estimateNote
  };

  const v3 = buildResultsV3Payload({
    category,
    formData: opts.formData || model.formData,
    metrics: opts.metrics || model.metrics,
    extras: opts.extras || model.extras,
    intelligence: model.intelligence,
    decisionScore: model.decisionScore,
    confidenceScore: model.confidenceScore,
    riskAnalysis: model.intelligence?.riskAnalysis || model.pdfReportData?.riskAnalysis,
    alternatives: model.pdfReportData?.alternatives || model.alternatives,
    nextSteps: model.nextSteps,
    totalCost: totalCostInput,
    scenarioBaseAmount: totalCostInput.amount
  });

  if (model.pdfReportData) {
    model.pdfReportData = extendPdfReportDataV3(model.pdfReportData, v3);
  }

  const esc = escapeHtml;
  const s = v3.scores;
  const exec = v3.executiveSummary;

  const root = document.createElement('div');
  root.className = 'results-v3-root';
  root.setAttribute('data-results-v3-category', category);
  root.innerHTML = `
    <section class="results-v3-panel" aria-label="Karar özeti V3">
      <header class="results-v3-header">
        <div class="results-v3-header-copy">
          <p class="results-v3-kicker">AI Decision Intelligence</p>
          <h2 class="results-v3-title">Premium karar özeti</h2>
          <p class="results-v3-sub">${esc(v3.recommendationLabel || '')}</p>
        </div>
        <button type="button" class="results-v3-toggle" data-results-v3-toggle aria-expanded="true">
          Özeti daralt
        </button>
      </header>

      <div class="results-v3-body" data-results-v3-body>
        <div class="results-v3-score-grid" role="list" aria-label="Skorlar">
          <article class="results-v3-score-card results-v3-score-card--decision" role="listitem">
            <span>Karar skoru</span>
            <strong class="results-v3-score results-v3-score--${esc(scoreTone(s.decision))}">${s.decision}</strong>
            <small>/100</small>
          </article>
          <article class="results-v3-score-card" role="listitem">
            <span>Güven skoru</span>
            <strong class="results-v3-score">${s.confidence}</strong>
            <small>/100</small>
          </article>
          <article class="results-v3-score-card" role="listitem">
            <span>Risk skoru</span>
            <strong class="results-v3-score results-v3-score--risk">${s.risk}</strong>
            <small>/100</small>
          </article>
          <article class="results-v3-score-card" role="listitem">
            <span>Uygunluk skoru</span>
            <strong class="results-v3-score results-v3-score--${esc(scoreTone(s.suitability))}">${s.suitability}</strong>
            <small>/100</small>
          </article>
        </div>

        <article class="results-v3-glass results-v3-exec">
          <h3>AI Executive Summary</h3>
          <p class="results-v3-exec-overview">${esc(exec.overview)}</p>
          <div class="results-v3-exec-cols">
            <div>
              <h4>Güçlü yönler</h4>
              <ul>${exec.strengths.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            </div>
            <div>
              <h4>Riskler</h4>
              <ul>${exec.risks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            </div>
          </div>
          <p class="results-v3-exec-rec"><strong>Sonuç önerisi:</strong> ${esc(exec.recommendation)}</p>
        </article>

        <div class="results-v3-grid-2">
          <article class="results-v3-glass results-v3-cost">
            <h3>${esc(v3.totalCost.title)}</h3>
            <p class="results-v3-cost-horizon">${esc(v3.totalCost.horizon)}</p>
            <p class="results-v3-cost-value">${esc(v3.totalCost.formatted || formatTry(v3.totalCost.amount))}</p>
          </article>
          <article class="results-v3-glass results-v3-scenarios">
            <h3>Senaryo analizi</h3>
            <ul class="results-v3-scenario-list">
              ${v3.scenarios
                .map(
                  (sc) => `
                <li>
                  <span class="results-v3-scenario-label">${esc(sc.label)}</span>
                  <span class="results-v3-scenario-score">${sc.decisionScore}/100</span>
                  <span class="results-v3-scenario-cost">${esc(formatTry(sc.totalCost))}</span>
                  <p>${esc(sc.summary)}</p>
                </li>`
                )
                .join('')}
            </ul>
          </article>
        </div>

        <section class="results-v3-alts" aria-label="Alternatifler">
          <h3>Alternatifler</h3>
          <div class="results-v3-alt-grid">
            ${v3.alternatives
              .map(
                (alt) => `
              <article class="results-v3-alt-card">
                <h4>${esc(alt.title)}</h4>
                <p>${esc(alt.rationale)}</p>
              </article>`
              )
              .join('')}
          </div>
        </section>

        <article class="results-v3-glass results-v3-next">
          <h3>Sonraki adımlar</h3>
          <ol>${v3.nextSteps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>
        </article>
      </div>
    </section>`;

  mountNode.prepend(root);

  const toggle = root.querySelector('[data-results-v3-toggle]');
  const body = root.querySelector('[data-results-v3-body]');
  toggle?.addEventListener('click', () => {
    const open = body?.hidden === true;
    if (body) body.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? 'Özeti daralt' : 'Özeti genişlet';
  });

  safeTrackEvent(track, 'decision_result_v3_view', {
    category,
    decision: s.decision,
    suitability: s.suitability
  });

  return { v3, root };
}
