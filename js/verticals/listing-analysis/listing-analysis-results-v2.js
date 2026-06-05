/**
 * AI İlan Analizi V1 — Results V2 UI.
 */
import { escapeHtml } from '../../core/security.js';
import { buildListingAiSummary, fetchListingExecutiveSummary } from './listing-analysis-ai-summary.js';
import { downloadListingAnalysisPdf } from './listing-analysis-pdf.js';

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(n);
}

function riskTone(level) {
  if (level === 'düşük') return 'success';
  if (level === 'orta') return 'warning';
  return 'danger';
}

function renderList(items = [], empty = '—') {
  if (!items.length) return `<li>${escapeHtml(empty)}</li>`;
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

/**
 * @param {HTMLElement} container
 * @param {object} params
 */
export async function mountListingAnalysisResultsV2(container, { result = {}, onPdfDownload } = {}) {
  if (!container || !result?.decisionScore) return;

  const ai = buildListingAiSummary(result);
  const totalCost =
    result.listingType === 'vehicle'
      ? formatMoney(result.totalCostEstimate?.firstYearTotal)
      : formatMoney(result.totalCostEstimate?.totalAcquisitionCost);

  container.innerHTML = `
    <div class="la-v2-root" data-listing-type="${escapeHtml(result.listingType)}">
      <article class="la-v2-panel">
        <header class="la-v2-hero">
          <p class="la-v2-kicker">AI İlan Analizi V1</p>
          <h2 class="la-v2-title">Karar Skoru: ${result.decisionScore}/100 — ${escapeHtml(result.scoreLabel || '')}</h2>
        </header>
        <div class="la-v2-kpis">
          <div class="la-v2-kpi"><span>Karar Skoru</span><strong>${result.decisionScore}</strong></div>
          <div class="la-v2-kpi"><span>Güven Skoru</span><strong>${result.confidenceScore}</strong></div>
          <div class="la-v2-kpi"><span>Fiyat Uygunluğu</span><strong>${result.priceFit}</strong></div>
          <div class="la-v2-kpi la-v2-kpi--${riskTone(result.riskLevel)}"><span>Risk</span><strong>${escapeHtml(result.riskLevel)}</strong></div>
        </div>
        <section class="la-v2-block">
          <h3>Toplam Maliyet Tahmini</h3>
          <p class="la-v2-cost">${totalCost}</p>
          <p class="la-v2-muted">${escapeHtml(result.totalCostEstimate?.note || '')}</p>
        </section>
        <div class="la-v2-columns">
          <section class="la-v2-block">
            <h3>Güçlü Yönler</h3>
            <ul class="la-v2-list">${renderList(result.strengths)}</ul>
          </section>
          <section class="la-v2-block">
            <h3>Zayıf Yönler</h3>
            <ul class="la-v2-list">${renderList(result.weaknesses)}</ul>
          </section>
        </div>
        <section class="la-v2-block la-v2-exec" id="la-v2-exec-summary">
          <h3>AI Executive Summary</h3>
          <p class="la-v2-summary">${escapeHtml(ai.summary)}</p>
        </section>
        <div class="la-v2-actions">
          <button type="button" class="la-v2-btn" id="la-v2-pdf-btn">PDF Rapor İndir</button>
        </div>
      </article>
    </div>`;

  const pdfBtn = container.querySelector('#la-v2-pdf-btn');
  let latestAi = ai;

  pdfBtn?.addEventListener('click', () => {
    const out = downloadListingAnalysisPdf({ result, aiSummary: latestAi });
    if (typeof onPdfDownload === 'function') onPdfDownload(out);
  });

  const execEl = container.querySelector('#la-v2-exec-summary .la-v2-summary');
  fetchListingExecutiveSummary(result, { skipProxy: false }).then((enhanced) => {
    latestAi = enhanced;
    if (execEl && enhanced.summary) {
      execEl.textContent = enhanced.summary;
    }
  });
}
