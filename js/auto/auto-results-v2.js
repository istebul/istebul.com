/**
 * Auto Decision Results V2 — production-ready premium karar asistanı paneli.
 * Tek kaynak: recommendation.vehicle (topResult).
 */
import { escapeHtml } from '../core/security.js';
import {
  buildPdfReportData,
  formatScoreOutOf100,
  riskLevelToTone,
  safeTrackEvent
} from '../features/results/results-engine.js';
import { gatePdfDownload } from '../features/billing/pdf-access-v1.js';
import { getResultsPlanContext } from '../features/billing/paywall-v1.js';
import {
  buildInsightInputFromIntelligence,
  buildDecisionInsight,
  hydrateInsightBlocks,
  renderInsightBlocksHtml
} from '../features/ai/ai-insight-engine.js';
import {
  buildDecisionIntelligenceResult,
  fetchExecutiveSummaryV3,
  renderScoreFactorsHtml
} from '../features/results/decision-intelligence-engine.js';
import { hydrateResultsEconomicIndicators } from '../features/results/results-economic-indicators.js';
import {
  buildEvdsAiMarketSentence,
  buildEvdsRiskLayer,
  mountEvdsRiskLayer
} from '../features/results/results-evds-risk-layer.js';
import { fetchEvdsRatesForEngine } from '../features/evds/evds-market-engine.js';
import {
  renderVehicleImageHtml,
  resolveVehicleImageUrl
} from './vehicle-image.js';
import {
  buildRecommendationPayload,
  buildVehicleAlternatives,
  buildWhyRecommendedCards,
  scoreBandLabel
} from './auto-results-model.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatTryAmount(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function renderAutoPremiumHero(recommendation, esc) {
  const vehicle = recommendation.vehicle;
  const imageHtml = renderVehicleImageHtml(vehicle, esc, {
    className: 'auto-v2-hero__image',
    loading: 'eager',
    width: 960,
    height: 540
  });

  return `
    <header class="auto-v2-hero" id="ib-results-hero">
      <p class="auto-v2-hero__kicker">🏆 En Uygun Araç</p>
      <div class="auto-v2-hero__media">
        ${imageHtml}
      </div>
      <div class="auto-v2-hero__body">
        <h2 class="auto-v2-hero__title">${esc(vehicle.name)}</h2>
        <div class="auto-v2-hero__badges">
          <span class="auto-v2-hero__badge auto-v2-hero__badge--score">
            Karar Skoru: <strong>${esc(formatScoreOutOf100(recommendation.decisionScore))}</strong>
          </span>
          <span class="auto-v2-hero__badge auto-v2-hero__badge--confidence">
            Güven Seviyesi: <strong>${esc(recommendation.confidenceLabel)}</strong>
          </span>
        </div>
        <p class="auto-v2-hero__summary">${esc(String(recommendation.aiSummary || '').slice(0, 280))}</p>
      </div>
    </header>`;
}

function renderHeroMetrics(recommendation, esc) {
  return `
    <div class="auto-v2-hero-metrics" aria-label="Karar metrikleri">
      <article class="auto-v2-hero-metric">
        <span>Karar Skoru</span>
        <strong>${esc(formatScoreOutOf100(recommendation.decisionScore))}</strong>
      </article>
      <article class="auto-v2-hero-metric">
        <span>Yıllık Tahmini Yakıt Maliyeti</span>
        <strong>${esc(recommendation.annualFuelCost ? formatTryAmount(recommendation.annualFuelCost) : '—')}</strong>
      </article>
      <article class="auto-v2-hero-metric">
        <span>5 Yıllık Toplam Sahip Olma Maliyeti</span>
        <strong>${esc(recommendation.fiveYearOwnership ? formatTryAmount(recommendation.fiveYearOwnership) : '—')}</strong>
      </article>
      <article class="auto-v2-hero-metric">
        <span>Güven Seviyesi</span>
        <strong>${esc(recommendation.confidenceLabel)}</strong>
        <small>${esc(formatScoreOutOf100(recommendation.confidenceScore))}</small>
      </article>
    </div>`;
}

function renderWhyRecommendedSection(cards, esc) {
  return `
    <section class="auto-v2-why" aria-label="Neden önerildi">
      <h3>Neden önerildi?</h3>
      <div class="auto-v2-why-grid">
        ${cards.map((card) => `
          <article class="auto-v2-why-card">
            <span class="auto-v2-why-card__icon" aria-hidden="true">${esc(card.icon)}</span>
            <div class="auto-v2-why-card__head">
              <h4>${esc(card.title)}</h4>
              <span class="auto-v2-why-card__score">${esc(scoreBandLabel(card.score))}</span>
            </div>
            <p>${esc(card.text)}</p>
          </article>
        `).join('')}
      </div>
    </section>`;
}

function renderAlternativesSection(alternatives, esc) {
  if (!alternatives.length) return '';

  return `
    <section class="auto-v2-alts" aria-label="Alternatif araçlar">
      <h3>Alternatif Araçlar</h3>
      <div class="auto-v2-alt-grid">
        ${alternatives.map((alt, idx) => {
          const v = alt.vehicle;
          const imageHtml = renderVehicleImageHtml(v, esc, {
            className: 'auto-v2-alt-card__image',
            width: 480,
            height: 270
          });
          return `
            <article class="auto-v2-alt-card">
              <div class="auto-v2-alt-card__media">${imageHtml}</div>
              <div class="auto-v2-alt-card__body">
                <span class="auto-v2-alt-card__rank">#${idx + 2}</span>
                <h4>${esc(v.name)}</h4>
                <span class="auto-v2-alt-meta">${esc(formatScoreOutOf100(alt.score))}</span>
                <div class="auto-v2-alt-pros">
                  <strong>Artıları</strong>
                  <ul>${alt.pros.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
                </div>
                <p class="auto-v2-alt-why"><strong>Neden ikinci sırada?</strong> ${esc(alt.whySecond)}</p>
              </div>
            </article>`;
        }).join('')}
      </div>
    </section>`;
}

function renderAutoResultsV2Html(model) {
  const esc = escapeHtml;
  const rec = model.recommendation;

  return `
    <section class="auto-v2-panel" aria-label="Auto karar raporu özeti">
      ${renderAutoPremiumHero(rec, esc)}
      ${renderHeroMetrics(rec, esc)}

      <div class="ib-results-economic-mount auto-v2-evds-mount ib-results-economic--home" data-results-economic-mount hidden></div>

      <div id="ib-results-detail"></div>

      ${renderWhyRecommendedSection(model.whyRecommended, esc)}

      ${
        model.scoreFactors?.length
          ? `<details class="auto-v2-factors-details">
        <summary>Skor faktörleri (açıklanabilir analiz)</summary>
        ${renderScoreFactorsHtml(model.scoreFactors, 'auto-v2')}
      </details>`
          : ''
      }

      <div class="auto-v2-grid">
        <article class="auto-v2-block auto-v2-block--pros">
          <h3>Güçlü Yönler</h3>
          <ul>${model.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </article>
        <article class="auto-v2-block auto-v2-block--cautions">
          <h3>Dikkat Edilecekler</h3>
          <ul>${model.cautions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </article>
      </div>

      ${renderAlternativesSection(model.alternatives, esc)}

      <article class="auto-v2-block auto-v2-block--exec" data-auto-v2-insight-root>
        <h3>AI karar yorumu</h3>
        ${renderInsightBlocksHtml(model.insight, esc, {
          planTier: model.planTier,
          insightInput: model.insightInput
        })}
        <p class="auto-v2-exec-hint" data-auto-v2-source>${esc(model.summarySourceLabel)}</p>
      </article>

      <article class="auto-v2-block auto-v2-block--next">
        <h3>Sonraki Adımlar</h3>
        <ol>${model.nextSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </article>

      <div class="auto-v2-actions">
        <button type="button" class="btn secondary auto-v2-print" data-auto-v2-print>
          Araç karar raporunu indir
        </button>
      </div>
    </section>
  `;
}

function buildNextSteps({ riskLevel, budgetFit }) {
  const steps = [];
  if (riskLevel === 'Yüksek') {
    steps.push('Bütçe baskısını azaltmak için bir alt segment veya daha düşük maliyetli alternatifleri öne alın.');
  } else if (budgetFit < 65) {
    steps.push('Bütçenize daha yakın fiyat bandında 2–3 alternatif modelle kıyaslayın.');
  } else {
    steps.push('En güçlü 2–3 seçeneği teklif/finansman ile doğrulayın ve toplam maliyeti güncelleyin.');
  }
  steps.push('Ekspertiz, garanti kapsamı ve bakım geçmişini kontrol edin; sigorta tekliflerini karşılaştırın.');
  steps.push('Kredi kullanacaksanız toplam faiz yükünü farklı vade senaryolarıyla test edin.');
  return steps.slice(0, 3);
}

function computeBudgetFit({ budget, vehiclePrice, totalCost }) {
  const b = Math.max(safeNumber(budget), 1);
  const price = Math.max(safeNumber(vehiclePrice), 0);
  const tco = Math.max(safeNumber(totalCost), 0);
  const ratio = price ? price / b : tco ? tco / b : 0.9;
  const fit = 100 - Math.max(0, (ratio - 0.9) * 140);
  return clamp(Math.round(fit), 20, 99);
}

function computeRiskLevel({ budget, totalCost, riskItems = [] }) {
  const b = Math.max(safeNumber(budget), 1);
  const tco = Math.max(safeNumber(totalCost), 0);
  const pressure = tco ? tco / b : 0.9;

  if (pressure > 1.05 || riskItems.length >= 3) return { label: 'Yüksek', score: 74 };
  if (pressure > 0.88 || riskItems.length >= 1) return { label: 'Orta', score: 48 };
  return { label: 'Düşük', score: 28 };
}

export async function mountAutoResultsV2({ mountNode, topResult, results, formData, track }) {
  if (!mountNode || !topResult) return null;

  const existing = mountNode.querySelector('.auto-v2-root');
  if (existing) existing.remove();

  const budget = safeNumber(formData?.budget);
  const totalCost = safeNumber(topResult?.costs?.ownership?.totals?.months12 || topResult?.costs?.total);
  const vehiclePrice = safeNumber(topResult?.price);

  const budgetFit = computeBudgetFit({ budget, vehiclePrice, totalCost });
  const strengths = (topResult?.reasons || []).slice(0, 4).filter(Boolean);
  const cautions = (topResult?.risks || []).slice(0, 4).filter(Boolean);
  if (!strengths.length) strengths.push('Kriterlerinize göre güçlü segment uyumu');
  if (!cautions.length) cautions.push('Kesin fiyat teklifi değildir; toplam maliyet değişebilir');

  const risk = computeRiskLevel({ budget, totalCost, riskItems: cautions });

  const evdsSnapshot = await fetchEvdsRatesForEngine();
  const evdsRates = evdsSnapshot?.rates || null;
  const evdsRiskLayer = buildEvdsRiskLayer('auto', evdsRates);

  const intel = buildDecisionIntelligenceResult(
    'auto',
    formData,
    { topResult, budget, totalCost },
    { topResult, results, budget, totalCost, cautions }
  );

  const recommendation = buildRecommendationPayload(topResult, formData, results, intel);
  const whyRecommended = buildWhyRecommendedCards(recommendation, formData);
  const alternatives = buildVehicleAlternatives(results, topResult, formData);

  const { planTier } = getResultsPlanContext();

  const insightInput = buildInsightInputFromIntelligence('auto', intel.context || {}, intel, {
    planTier,
    strengths,
    weaknesses: cautions,
    marketAssessment: buildEvdsAiMarketSentence(evdsRiskLayer),
    costs: { budget, tco12: totalCost, vehiclePrice }
  });

  const model = {
    recommendation,
    whyRecommended,
    decisionScore: intel.decisionScore,
    confidenceScore: intel.confidenceScore,
    riskLevel: intel.overallRisk || risk.label,
    riskTone: riskLevelToTone(intel.overallRisk || risk.label),
    scoreFactors: intel.scoreFactors,
    warnings: intel.warnings,
    recommendationLevel: intel.recommendationLevel,
    recommendationLabel: intel.recommendationLabel,
    intelligence: intel,
    totalCostLabel: totalCost ? formatTryAmount(totalCost) : '—',
    costHint: totalCost && budget ? `Bütçe ${formatTryAmount(budget)} · 12 ay TCO` : '12 ay TCO (tahmini)',
    strengths,
    cautions,
    alternatives,
    executiveSummary: intel.executiveSummary,
    insight: buildDecisionInsight(insightInput),
    insightInput,
    planTier,
    summarySourceLabel: 'Kaynak: hazırlanıyor',
    nextSteps: intel.nextSteps.length ? intel.nextSteps : buildNextSteps({ riskLevel: risk.label, budgetFit }),
    usage: String(formData?.usage || ''),
    budgetLabel: budget ? formatTryAmount(budget) : '—',
    evdsRiskLayer
  };

  model.pdfReportData = buildPdfReportData({
    category: 'auto',
    planTier,
    decisionScore: intel.decisionScore,
    confidenceScore: model.confidenceScore,
    overallRisk: model.riskLevel,
    strengths: model.strengths,
    cautions: model.cautions,
    alternatives: alternatives.map((a) => ({
      title: a.vehicle.name,
      description: a.whySecond,
      meta: formatScoreOutOf100(a.score)
    })),
    riskAnalysis: intel.riskAnalysis,
    scoreFactors: intel.scoreFactors,
    totalCost: {
      isEstimate: true,
      estimateNote: 'Tahmini TCO — kesin fiyat taahhüdü değildir.',
      tco12Months: totalCost || null,
      vehiclePrice: vehiclePrice || null
    },
    nextSteps: model.nextSteps,
    executiveSummary: model.executiveSummary,
    profile: {
      usage: model.usage,
      budgetLabel: model.budgetLabel
    }
  });

  const root = document.createElement('div');
  root.className = 'auto-v2-root';
  root.innerHTML = renderAutoResultsV2Html(model);
  mountNode.prepend(root);
  await hydrateResultsEconomicIndicators(root, 'auto');
  mountEvdsRiskLayer(root, model.evdsRiskLayer);

  safeTrackEvent(track, 'decision_result_v2_view', {
    score: intel.decisionScore,
    confidence: model.confidenceScore,
    risk: model.riskLevel,
    vehicle: recommendation.vehicle.name
  });

  root.querySelector('[data-auto-v2-print]')?.addEventListener('click', () => {
    safeTrackEvent(track, 'decision_report_print_click', { score: intel.decisionScore });
    gatePdfDownload(model.pdfReportData);
  });

  const summary = await fetchExecutiveSummaryV3('auto', intel.context || {}, intel, {
    planTier,
    strengths,
    weaknesses: cautions,
    marketAssessment: buildEvdsAiMarketSentence(evdsRiskLayer),
    costs: { budget, tco12: totalCost, vehiclePrice }
  });

  if (summary.text) {
    recommendation.aiSummary = summary.text;
    const summaryEl = root.querySelector('.auto-v2-hero__summary');
    if (summaryEl) summaryEl.textContent = String(summary.text).slice(0, 280);
  }

  if (summary.insight) {
    model.insight = summary.insight;
    hydrateInsightBlocks(root.querySelector('[data-auto-v2-insight-root]'), summary.insight);
  }
  const sourceEl = root.querySelector('[data-auto-v2-source]');
  if (sourceEl) {
    sourceEl.textContent =
      summary.source === 'ai' ? 'Kaynak: AI destekli yorum' : 'Kaynak: Kural tabanlı karar yorumu';
  }
  model.executiveSummary = summary.text;
  model.summarySourceLabel = sourceEl?.textContent || '';
  model.pdfReportData.executiveSummary = summary.text;
  if (summary.insight) {
    model.pdfReportData.insightBlocks = summary.insight;
  }

  return model;
}

export {
  buildRecommendationPayload,
  buildVehicleAlternatives,
  buildWhyRecommendedCards,
  resolveVehicleImageUrl
};
