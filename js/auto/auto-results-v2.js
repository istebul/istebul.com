/**
 * Auto Decision Results V2 (Sprint 1)
 * - Mevcut Auto sonuç ekranını bozmaz; üstüne premium karar raporu paneli ekler.
 * - AI proxy varsa kullanır; yoksa deterministic Executive Summary üretir.
 * - innerHTML basılan her içerik escape edilir.
 */
import { escapeHtml } from '../core/security.js';
import {
  buildPdfReportData,
  buildRiskItem,
  clampScore,
  riskLevelToTone,
  safeTrackEvent
} from '../features/results/results-engine.js';
import { downloadDecisionReport } from '../features/results/pdf-report.js';
import {
  buildDecisionIntelligenceResult,
  fetchExecutiveSummaryV3,
  renderScoreFactorsHtml
} from '../features/results/decision-intelligence-engine.js';
import { mountResultsV3 } from '../features/results/results-v3-ui.js';

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

function computeConfidenceScore(formData = {}) {
  const fields = ['budget', 'usage', 'body', 'fuel', 'km', 'loan'];
  let present = 0;
  for (const key of fields) {
    const raw = String(formData[key] ?? '').trim();
    if (!raw) continue;
    if (key === 'budget' || key === 'km') {
      if (safeNumber(raw) > 0) present += 1;
    } else {
      present += 1;
    }
  }
  const pct = present / fields.length;
  const base = 58 + pct * 40;
  const penalty = (!safeNumber(formData.km) ? 6 : 0) + (String(formData.fuel || '') === 'any' ? 4 : 0);
  return clamp(Math.round(base - penalty), 30, 98);
}

function computeBudgetFit({ budget, vehiclePrice, totalCost }) {
  const b = Math.max(safeNumber(budget), 1);
  const price = Math.max(safeNumber(vehiclePrice), 0);
  const tco = Math.max(safeNumber(totalCost), 0);
  const ratio = price ? price / b : tco ? tco / b : 0.9;

  // 0.85–1.05 aralığı ideal; üzeri baskı.
  const fit = 100 - Math.max(0, (ratio - 0.9) * 140);
  return clamp(Math.round(fit), 20, 99);
}

function computeUsageFit(formData = {}, topResult = {}) {
  const usage = String(formData.usage || '').trim();
  const fuel = String(topResult.fuel || formData.fuel || '').trim();
  const km = safeNumber(formData.km);

  let score = 74;
  if (usage === 'city' && fuel === 'electric') score += 10;
  if (usage === 'long' && (fuel === 'diesel' || fuel === 'hybrid')) score += 7;
  if (usage === 'family' && String(topResult.body || formData.body || '') === 'suv') score += 4;
  if (km >= 28000 && fuel === 'electric') score -= 6; // şarj altyapısı / menzil hassasiyeti
  return clamp(Math.round(score), 35, 95);
}

function computeRiskLevel({ budget, totalCost, riskItems = [] }) {
  const b = Math.max(safeNumber(budget), 1);
  const tco = Math.max(safeNumber(totalCost), 0);
  const pressure = tco ? tco / b : 0.9;

  if (pressure > 1.05 || riskItems.length >= 3) return { label: 'Yüksek', score: 74 };
  if (pressure > 0.88 || riskItems.length >= 1) return { label: 'Orta', score: 48 };
  return { label: 'Düşük', score: 28 };
}

function computeDecisionScore({ budgetFit, usageFit, costFit, altFit, riskScore }) {
  const score = budgetFit * 0.26 + usageFit * 0.18 + costFit * 0.2 + altFit * 0.16 + (100 - riskScore) * 0.2;
  return clampScore(Math.round(score));
}

function buildAlternatives(results = []) {
  return results.slice(1, 4).map((r, idx) => ({
    title: r?.name || `Alternatif ${idx + 1}`,
    score: safeNumber(r?.score),
    reason: String((r?.reasons || [])[0] || '').trim()
  }));
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

function buildDeterministicExecutiveSummary(ctx) {
  const usageLabel = {
    family: 'aile',
    city: 'şehir içi',
    long: 'uzun yol',
    business: 'iş'
  }[ctx.usage] || 'karma';

  const tone = ctx.riskLevel === 'Yüksek' ? 'daha riskli' : ctx.riskLevel === 'Orta' ? 'dengeli ancak dikkat gerektiren' : 'mantıklı';
  const why1 = `Kullanım amacınız (${usageLabel}), bütçe aralığınız ve toplam maliyet beklentiniz birlikte değerlendirildiğinde bu tercih ${tone} görünmektedir.`;
  const why2 = `Karar skorunuz ${ctx.decisionScore}/100 ve güven skorunuz ${ctx.confidenceScore}/100; risk seviyesi ${ctx.riskLevel} olarak işaretlendi.`;
  const why3 = ctx.strengths?.length
    ? `Güçlü yönler tarafında öne çıkan nokta: ${ctx.strengths[0]}.`
    : 'Toplam sahip olma maliyeti ve kullanım uyumu, bu kararın ana belirleyicileridir.';
  const why4 = ctx.cautions?.length
    ? `Dikkat edilmesi gereken başlık: ${ctx.cautions[0]}.`
    : 'Bakım, sigorta ve ikinci el değer kaybı gibi kalemler nihai kararı etkileyebilir.';
  const why5 = 'Son adımda, teklif/finansman senaryosunu gerçek oranlarla doğrulayıp alternatifleri yan yana karşılaştırmanız önerilir.';
  return [why1, why2, why3, why4, why5].join(' ');
}

async function buildAiExecutiveSummary(ctx) {
  const fallback = buildDeterministicExecutiveSummary(ctx);
  const prompt = [
    'Profesyonel otomotiv karar danismani gibi Turkce 4-6 cumle yaz.',
    'Kesin tavsiye verme; tahmini analiz dili kullan.',
    'Soruya cevap ver: Bu arac karari neden mantikli veya neden riskli?',
    `Kullanim: ${ctx.usage}`,
    `Butce: ${ctx.budgetLabel}`,
    `Toplam maliyet: ${ctx.totalCostLabel}`,
    `Karar skoru: ${ctx.decisionScore}/100`,
    `Guven skoru: ${ctx.confidenceScore}/100`,
    `Risk: ${ctx.riskLevel}`,
    `Guclu: ${(ctx.strengths || []).slice(0, 2).join('; ')}`,
    `Dikkat: ${(ctx.cautions || []).slice(0, 2).join('; ')}`
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context: { category: 'auto-decision-results-v2' } }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return { text: fallback, source: 'fallback' };
    const data = await res.json().catch(() => ({}));
    const text = String(data?.text || data?.output || '').trim();
    if (!text) return { text: fallback, source: 'fallback' };
    return { text: text.slice(0, 900), source: 'ai' };
  } catch {
    clearTimeout(timeout);
    return { text: fallback, source: 'fallback' };
  }
}

function renderAutoResultsV2Html(model) {
  const esc = escapeHtml;
  return `
    <section class="auto-v2-panel" aria-label="Decision Results V2 premium rapor">
      <header class="auto-v2-hero">
        <p class="auto-v2-kicker">Decision Results V2 · Premium AI Karar Raporu</p>
        <h2 class="auto-v2-title">Auto karar raporu</h2>
        ${model.recommendationLabel ? `<p class="auto-v2-rec-level">${esc(model.recommendationLabel)}</p>` : ''}
      </header>

      ${renderScoreFactorsHtml(model.scoreFactors, 'auto-v2')}

      <div class="auto-v2-kpis">
        <article class="auto-v2-kpi auto-v2-kpi--score">
          <span>Karar Skoru</span>
          <strong>${esc(String(model.decisionScore))}<small>/100</small></strong>
          <div class="auto-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.decisionScore))}%"></span></div>
        </article>
        <article class="auto-v2-kpi auto-v2-kpi--confidence">
          <span>Güven Skoru</span>
          <strong>${esc(String(model.confidenceScore))}<small>/100</small></strong>
          <div class="auto-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.confidenceScore))}%"></span></div>
        </article>
        <article class="auto-v2-kpi auto-v2-kpi--risk">
          <span>Risk Seviyesi</span>
          <strong><span class="auto-v2-risk auto-v2-risk--${esc(model.riskTone)}">${esc(model.riskLevel)}</span></strong>
        </article>
        <article class="auto-v2-kpi auto-v2-kpi--cost">
          <span>Toplam Maliyet Özeti</span>
          <strong>${esc(model.totalCostLabel)}</strong>
          <small>${esc(model.costHint)}</small>
        </article>
      </div>

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

      <section class="auto-v2-alts" aria-label="3 Alternatif Öneri">
        <h3>3 Alternatif Öneri</h3>
        <div class="auto-v2-alt-grid">
          ${model.alternatives.map((a) => `
            <article class="auto-v2-alt-card">
              <h4>${esc(a.title)}</h4>
              <p>${esc(a.reason || 'Alternatif senaryo: skor/maliyet dengesi için değerlendirin.')}</p>
              <span class="auto-v2-alt-meta">${esc(String(a.score || '—'))}/100</span>
            </article>
          `).join('')}
        </div>
      </section>

      <article class="auto-v2-block auto-v2-block--exec">
        <h3>AI Executive Summary</h3>
        <p class="auto-v2-exec" data-auto-v2-exec>${esc(model.executiveSummary || 'Executive Summary hazırlanıyor…')}</p>
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

export async function mountAutoResultsV2({ mountNode, topResult, results, formData, track }) {
  if (!mountNode || !topResult) return null;

  // Idempotent mount
  const existing = mountNode.querySelector('.auto-v2-root');
  if (existing) existing.remove();

  const budget = safeNumber(formData?.budget);
  const totalCost = safeNumber(topResult?.costs?.ownership?.totals?.months12 || topResult?.costs?.total);
  const vehiclePrice = safeNumber(topResult?.price);

  const budgetFit = computeBudgetFit({ budget, vehiclePrice, totalCost });
  const usageFit = computeUsageFit(formData, topResult);
  const costFit = clamp(Math.round(100 - Math.max(0, (totalCost - budget) / Math.max(budget, 1) * 90)), 20, 99);
  const alternatives = buildAlternatives(results);
  const altFit = alternatives.length
    ? clamp(Math.round(alternatives.reduce((sum, a) => sum + (safeNumber(a.score) || 60), 0) / alternatives.length), 30, 98)
    : 62;

  const strengths = (topResult?.reasons || []).slice(0, 4).filter(Boolean);
  const cautions = (topResult?.risks || []).slice(0, 4).filter(Boolean);
  if (!strengths.length) strengths.push('Kriterlerinize göre güçlü segment uyumu');
  if (!cautions.length) cautions.push('Kesin fiyat teklifi değildir; toplam maliyet değişebilir');

  const risk = computeRiskLevel({ budget, totalCost, riskItems: cautions });

  const intel = buildDecisionIntelligenceResult(
    'auto',
    formData,
    { topResult, budget, totalCost },
    { topResult, results, budget, totalCost, cautions }
  );
  const decisionScore = intel.decisionScore;
  const confidenceScore = intel.confidenceScore;

  const altCards =
    intel.alternatives.length ?
      intel.alternatives.map((a) => ({ title: a.title, score: 0, reason: a.description }))
    : alternatives.length ?
      alternatives
    : [{ title: 'Alternatif bulunamadı', score: 0, reason: '' }];

  const model = {
    decisionScore,
    confidenceScore: confidenceScore || computeConfidenceScore(formData),
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
    alternatives: altCards,
    executiveSummary: intel.executiveSummary,
    summarySourceLabel: 'Kaynak: hazırlanıyor',
    nextSteps: intel.nextSteps.length ? intel.nextSteps : buildNextSteps({ riskLevel: risk.label, budgetFit }),
    usage: String(formData?.usage || ''),
    budgetLabel: budget ? formatTryAmount(budget) : '—',
    totalCostLabelRaw: totalCost ? formatTryAmount(totalCost) : '—'
  };

  model.pdfReportData = buildPdfReportData({
    category: 'auto',
    decisionScore,
    confidenceScore: model.confidenceScore,
    overallRisk: model.riskLevel,
    strengths: model.strengths,
    cautions: model.cautions,
    alternatives: altCards.map((a) => ({
      title: a.title,
      description: a.reason || '',
      meta: a.score ? `${a.score}/100` : ''
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

  safeTrackEvent(track, 'decision_result_v2_view', {
    score: decisionScore,
    confidence: model.confidenceScore,
    risk: model.riskLevel
  });

  root.querySelector('[data-auto-v2-print]')?.addEventListener('click', () => {
    safeTrackEvent(track, 'decision_report_print_click', { score: decisionScore });
    downloadDecisionReport(model.pdfReportData);
  });

  // Executive Summary (AI proxy + fallback)
  const summary = await fetchExecutiveSummaryV3('auto', intel.context || {}, intel);

  const execEl = root.querySelector('[data-auto-v2-exec]');
  if (execEl) execEl.textContent = summary.text;
  const sourceEl = root.querySelector('[data-auto-v2-source]');
  if (sourceEl) sourceEl.textContent = `Kaynak: ${summary.source === 'ai' ? 'AI destekli' : 'Deterministic fallback'}`;
  model.executiveSummary = summary.text;
  model.summarySourceLabel = sourceEl?.textContent || '';
  model.pdfReportData.executiveSummary = summary.text;

  mountResultsV3(mountNode, {
    category: 'auto',
    model,
    formData,
    track
  });

  return model;
}

