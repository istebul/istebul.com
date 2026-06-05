/**
 * Sigorta Decision Results V2 — Auto/Finansman V2 premium dil.
 */
import { escapeHtml } from '../../core/security.js';
import { SIGORTA_INTEREST_CTAS } from '../../sigorta/sigorta-config.js';
import { withTimeout } from '../../core/async-utils.js';
import {
  buildEngineResult,
  buildCoverageComparisonMatrix,
  optionLabel,
  resolvePrimarySigortaResult,
  resolveScoreLabel,
  syncCanonicalSigortaScores
} from './sigorta-engine.js';
import { buildSigortaAiSummary, fetchSigortaExecutiveSummary } from './sigorta-ai-summary.js';
import { buildSigortaPdfPayload } from './sigorta-pdf.js';
import { riskLevelToTone, safeTrackEvent } from '../results/results-engine.js';
import { gatePdfDownload } from '../billing/pdf-access-v1.js';
import { getResultsPlanContext } from '../billing/paywall-v1.js';
import {
  buildDecisionInsight,
  buildInsightInputFromIntelligence,
  hydrateInsightBlocks,
  renderInsightBlocksHtml
} from '../ai/ai-insight-engine.js';
import {
  trackSigortaInterest,
  trackSigortaPdfDownload,
  trackSigortaResultsView,
  saveSigortaLead
} from '../../sigorta/sigorta-intake.js';

const SIGORTA_SUMMARY_TIMEOUT_MS = 10000;

function formatTryAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(n);
}

export function buildSigortaResultsV2Payload({
  state = {},
  results = [],
  selectedOption = '',
  userId = null
}) {
  const engine = buildEngineResult(state);
  syncCanonicalSigortaScores(state, results, selectedOption);
  const ai = buildSigortaAiSummary(engine, state);
  const { planTier } = getResultsPlanContext();
  const primary = resolvePrimarySigortaResult(results, selectedOption) || results[0];
  const premiumBand = primary?.metrics?.premiumBand;

  const pdfReportData = buildSigortaPdfPayload({
    state,
    planTier,
    engine,
    results,
    selectedOption
  });
  const coverageMatrix = buildCoverageComparisonMatrix(state);

  const insightInput = buildInsightInputFromIntelligence('sigorta', state, engine, {
    planTier,
    strengths: engine.strengths,
    weaknesses: engine.weaknesses,
    costs: { premiumBand: premiumBand || null }
  });
  const insight = buildDecisionInsight(insightInput);

  return {
    decisionScore: engine.decisionScore,
    protectionScore: engine.protectionScore,
    coverageScore: engine.coverageScore,
    costEfficiencyScore: engine.costEfficiencyScore,
    scoreLabel: engine.scoreLabel,
    confidenceScore: engine.confidenceScore,
    overallRisk: engine.overallRisk,
    riskTone: riskLevelToTone(engine.overallRisk),
    riskAnalysis: engine.riskAnalysis,
    strengths: engine.strengths,
    weaknesses: engine.weaknesses,
    alternatives: engine.alternatives,
    nextSteps: engine.nextSteps,
    executiveSummary: ai.summary,
    aiBullets: ai.bullets,
    pdfReportData,
    planTier,
    premiumLabel: premiumBand ? formatTryAmount(premiumBand) : '—',
    coverageMatrix,
    engine,
    ai,
    insightInput,
    insight,
    state,
    results,
    selectedOption: primary?.id || selectedOption || '',
    userId
  };
}

/**
 * V2 sonuç aksiyon çubuğu (legacy vacation-final-cta / selection-bar karşılığı).
 */
export function renderSigortaActionsBarHtml({ userId = null, esc = escapeHtml } = {}) {
  const loginHint = userId
    ? ''
    : `<p class="sigorta-v2-login-hint"><a href="/profil/?returnTo=/sigorta/">Giriş yapın</a> — raporunuzu profilinizde saklayın.</p>`;

  return `
    <div class="sigorta-v2-actions" aria-label="Sonuç aksiyonları">
      <button type="button" class="btn secondary sigorta-v2-pdf" data-sigorta-v2-pdf>
        PDF indir
      </button>
      <button type="button" class="btn secondary sigorta-v2-restart" data-sigorta-v2-restart>
        Tekrar analiz
      </button>
      <button type="button" class="btn secondary sigorta-v2-quote" data-sigorta-v2-quote>
        Teklif iste
      </button>
      ${loginHint}
      <div class="sigorta-v2-lead-panel" data-sigorta-v2-lead-panel hidden>
        <p class="sigorta-v2-lead-hint" data-sigorta-v2-lead-hint></p>
        <div class="sigorta-v2-interest-grid sigorta-v2-interest-grid--panel">
          ${SIGORTA_INTEREST_CTAS.map(
            (cta) => `
          <button type="button" class="btn btn-outline sigorta-v2-interest-btn" data-sigorta-interest="${esc(cta.interestType)}">
            <strong>${esc(cta.label)}</strong>
            <span>${esc(cta.description)}</span>
          </button>`
          ).join('')}
        </div>
        <div class="sigorta-v2-lead-form" hidden data-sigorta-lead-form>
          <div class="form-row">
            <input type="text" data-sigorta-lead-name placeholder="Ad soyad" autocomplete="name" required>
            <input type="tel" data-sigorta-lead-phone placeholder="Telefon" autocomplete="tel">
            <input type="email" data-sigorta-lead-email placeholder="E-posta" autocomplete="email" required>
          </div>
          <label class="sigorta-lead-consent">
            <input type="checkbox" data-sigorta-lead-privacy value="accepted">
            <span>
              <a href="/kvkk.html" target="_blank" rel="noopener">KVKK</a> ve
              <a href="/gizlilik.html" target="_blank" rel="noopener">gizlilik</a> metnini okudum; iletişim için onay veriyorum.
            </span>
          </label>
          <button type="button" class="btn btn-primary" data-sigorta-lead-submit>Talebi gönder</button>
          <p class="sigorta-v2-lead-status" data-sigorta-lead-status aria-live="polite"></p>
        </div>
      </div>
      <p class="sigorta-v2-action-feedback" data-sigorta-v2-action-feedback hidden></p>
      <p class="sigorta-v2-pdf-hint" data-sigorta-v2-pdf-hint hidden></p>
    </div>`;
}

function renderSigortaResultsV2Html(model) {
  const esc = escapeHtml;

  return `
    <section class="sigorta-v2-panel" aria-label="Sigorta Decision Results V2">
      <header class="sigorta-v2-hero">
        <p class="sigorta-v2-kicker">AI destekli sigorta karar analizi</p>
        <h2 class="sigorta-v2-title">Sigorta karar raporu</h2>
        <p class="sigorta-v2-band">${esc(model.scoreLabel)} · ${esc(String(model.decisionScore))}/100</p>
      </header>

      <div class="sigorta-v2-kpis">
        <article class="sigorta-v2-kpi sigorta-v2-kpi--decision">
          <span>Karar skoru</span>
          <strong>${esc(String(model.decisionScore))}<small>/100</small></strong>
          <div class="sigorta-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.decisionScore))}%"></span></div>
        </article>
        <article class="sigorta-v2-kpi">
          <span>Koruma skoru</span>
          <strong>${esc(String(model.protectionScore))}<small>/100</small></strong>
          <div class="sigorta-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.protectionScore))}%"></span></div>
        </article>
        <article class="sigorta-v2-kpi">
          <span>Teminat yeterliliği</span>
          <strong>${esc(String(model.coverageScore))}<small>/100</small></strong>
          <div class="sigorta-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.coverageScore))}%"></span></div>
        </article>
        <article class="sigorta-v2-kpi">
          <span>Maliyet verimliliği</span>
          <strong>${esc(String(model.costEfficiencyScore))}<small>/100</small></strong>
          <div class="sigorta-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.costEfficiencyScore))}%"></span></div>
        </article>
        <article class="sigorta-v2-kpi sigorta-v2-kpi--risk">
          <span>Genel risk</span>
          <strong><span class="sigorta-v2-risk sigorta-v2-risk--${esc(model.riskTone)}">${esc(model.overallRisk)}</span></strong>
          <small>Tahmini prim: ${esc(model.premiumLabel)}</small>
        </article>
      </div>

      <section class="sigorta-v2-coverage" aria-label="Teminat karşılaştırma">
        <h3>Teminat karşılaştırma (${esc(model.coverageMatrix?.typeLabel || 'Sigorta')})</h3>
        <table class="sigorta-v2-coverage-table">
          <thead>
            <tr>
              <th>Teminat</th>
              <th>Ekonomik</th>
              <th>Dengeli</th>
              <th>Geniş</th>
            </tr>
          </thead>
          <tbody>
            ${(model.coverageMatrix?.rows || [])
              .map(
                (row) => `
              <tr>
                <th scope="row">${esc(row.label)}</th>
                <td>${esc(row.economic)}</td>
                <td>${esc(row.balanced)}</td>
                <td>${esc(row.premium)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
        <p class="sigorta-v2-coverage-note text-muted-sm">${esc(model.coverageMatrix?.disclaimer || '')}</p>
      </section>

      <section class="sigorta-v2-risks" aria-label="Risk analizi">
        <h3>Risk analizi</h3>
        <div class="sigorta-v2-risk-grid">
          ${model.riskAnalysis
            .map(
              (r) => `
            <article class="sigorta-v2-risk-card">
              <div class="sigorta-v2-risk-card-head">
                <h4>${esc(r.title)}</h4>
                <span class="sigorta-v2-risk sigorta-v2-risk--${esc(riskLevelToTone(r.level))}">${esc(r.level)}</span>
              </div>
              <p>${esc(r.description)}</p>
              <p class="sigorta-v2-risk-rec"><strong>Öneri:</strong> ${esc(r.recommendation)}</p>
            </article>`
            )
            .join('')}
        </div>
      </section>

      <div class="sigorta-v2-grid">
        <article class="sigorta-v2-block sigorta-v2-block--pros">
          <h3>Güçlü taraflar</h3>
          <ul>${model.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </article>
        <article class="sigorta-v2-block sigorta-v2-block--cons">
          <h3>Dikkat edilmesi gerekenler</h3>
          <ul>${model.weaknesses.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </article>
      </div>

      <section class="sigorta-v2-alts" aria-label="Alternatif senaryolar">
        <h3>Alternatif senaryolar</h3>
        <div class="sigorta-v2-alt-grid">
          ${model.alternatives
            .map(
              (a) => `
            <article class="sigorta-v2-alt-card">
              <h4>${esc(a.title)}</h4>
              <p>${esc(a.description)}</p>
              ${a.meta ? `<span class="sigorta-v2-alt-meta">${esc(a.meta)}</span>` : ''}
              <span class="sigorta-v2-alt-score">Karar skoru: ${esc(String(model.decisionScore))}/100</span>
            </article>`
            )
            .join('')}
        </div>
      </section>

      <article class="sigorta-v2-block sigorta-v2-block--exec" data-sigorta-v2-insight-root>
        <h3>AI karar yorumu</h3>
        ${renderInsightBlocksHtml(model.insight, esc, {
          planTier: model.planTier,
          insightInput: model.insightInput
        })}
        <p class="sigorta-v2-exec-hint" data-sigorta-v2-source>Skorlar deterministik motordan; AI yalnızca açıklama üretir.</p>
      </article>

      <article class="sigorta-v2-block sigorta-v2-block--next">
        <h3>Sonraki adımlar</h3>
        <ol>${model.nextSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </article>

      ${renderSigortaActionsBarHtml({ userId: model.userId, esc })}
    </section>`;
}

export const SIGORTA_RESULTS_MOUNT_ID = 'sigorta-results';

function showMountFallback(message) {
  const flow = document.getElementById('sigorta-flow');
  const host = flow || document.querySelector('.vacation-main') || document.body;
  let el = document.getElementById('sigorta-results-mount-fallback');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sigorta-results-mount-fallback';
    el.className = 'sigorta-v2-mount-fallback';
    el.setAttribute('role', 'alert');
    host.appendChild(el);
  }
  el.hidden = false;
  el.textContent = message;
  return null;
}

function bindSigortaV2Actions(root, { track, model, onRestart, selectedOption }) {
  let pendingInterest = 'insurance_quote';

  root.querySelector('[data-sigorta-v2-pdf]')?.addEventListener('click', () => {
    safeTrackEvent(track, 'decision_report_print_click', {
      category: 'sigorta',
      score: model.decisionScore
    });
    trackSigortaPdfDownload({ decision_score: model.decisionScore });
    const hint = root.querySelector('[data-sigorta-v2-pdf-hint]');
    if (hint) {
      hint.hidden = false;
      hint.textContent =
        'Rapor penceresi açıldı. Yazdır diyalogunda “PDF olarak kaydet” seçeneğini kullanabilirsiniz.';
    }
    gatePdfDownload(model.pdfReportData);
  });

  root.querySelector('[data-sigorta-v2-restart]')?.addEventListener('click', () => {
    if (typeof onRestart === 'function') onRestart();
  });

  root.querySelector('[data-sigorta-v2-quote]')?.addEventListener('click', () => {
    const leadPanel = root.querySelector('[data-sigorta-v2-lead-panel]');
    const leadHint = root.querySelector('[data-sigorta-v2-lead-hint]');
    if (leadPanel) leadPanel.hidden = false;
    if (leadHint) {
      leadHint.textContent =
        'Size uygun sigorta teklifi için ilgi alanını seçin ve iletişim bilgilerinizi bırakın.';
    }
    leadPanel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  root.querySelectorAll('[data-sigorta-interest]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pendingInterest = btn.dataset.sigortaInterest || 'insurance_quote';
      trackSigortaInterest(pendingInterest, { decision_score: model.decisionScore });
      const form = root.querySelector('[data-sigorta-lead-form]');
      if (form) form.hidden = false;
    });
  });

  root.querySelector('[data-sigorta-lead-submit]')?.addEventListener('click', async () => {
    const statusEl = root.querySelector('[data-sigorta-lead-status]');
    const feedbackEl = root.querySelector('[data-sigorta-v2-action-feedback]');
    const privacyAccepted = root.querySelector('[data-sigorta-lead-privacy]')?.checked;
    if (!privacyAccepted) {
      if (statusEl) statusEl.textContent = 'Devam etmek için KVKK onayını işaretleyin.';
      return;
    }
    const email = root.querySelector('[data-sigorta-lead-email]')?.value?.trim() || '';
    if (!email) {
      if (statusEl) statusEl.textContent = 'E-posta adresi zorunludur.';
      return;
    }
    const state = model.state || {};
    const leadPayload = {
      full_name: root.querySelector('[data-sigorta-lead-name]')?.value?.trim() || '',
      phone: root.querySelector('[data-sigorta-lead-phone]')?.value?.trim() || '',
      email,
      privacy_consent: 'accepted',
      interest_type: pendingInterest,
      insurance_type: state.insurance_type,
      decision_score: model.decisionScore,
      protection_score: model.protectionScore,
      coverage_score: model.coverageScore,
      cost_efficiency_score: model.costEfficiencyScore,
      overall_risk: model.overallRisk,
      ai_summary: model.executiveSummary,
      profile: { ...state },
      selected_option: selectedOption || model.selectedOption || ''
    };
    const res = await saveSigortaLead(leadPayload);
    const message = res.ok
      ? 'Talebiniz alındı. Sigorta ekibimiz profilinize uygun bilgilendirme yapabilir.'
      : res.timeout
        ? 'İstek zaman aşımına uğradı; lütfen biraz sonra tekrar deneyin.'
        : 'Şu an kaydedilemedi; lütfen daha sonra tekrar deneyin.';
    if (statusEl) statusEl.textContent = message;
    if (feedbackEl) {
      feedbackEl.hidden = false;
      feedbackEl.textContent = message;
    }
  });
}

/**
 * AI yönetici özeti ve insight bloklarını arka planda günceller.
 */
export async function hydrateSigortaExtras(root, model, track) {
  try {
    const enriched = await withTimeout(
      fetchSigortaExecutiveSummary(model.engine, model.state || {}, {
        planTier: model.planTier
      }),
      SIGORTA_SUMMARY_TIMEOUT_MS,
      null
    );
    if (!enriched) return;

    if (enriched.text) {
      model.executiveSummary = enriched.text;
      model.ai = { ...model.ai, source: enriched.source };
      model.pdfReportData.executiveSummary = enriched.text;
    }
    if (enriched.insight) {
      model.insight = enriched.insight;
      hydrateInsightBlocks(root.querySelector('[data-sigorta-v2-insight-root]'), enriched.insight);
      model.pdfReportData.insightBlocks = enriched.insight;
    }
    const execHint = root.querySelector('[data-sigorta-v2-source]');
    if (execHint && enriched.source === 'ai') {
      execHint.textContent =
        'Kaynak: Deterministik skorlar + AI destekli yorum (skorlar değiştirilmez).';
    }
    safeTrackEvent(track, 'decision_result_v2_ai_hydrate', {
      category: 'sigorta',
      source: enriched.source
    });
  } catch (error) {
    console.warn('sigorta-v2-summary-hydrate-failed', error);
  }
}

/**
 * @param {HTMLElement|string|null} [mountNode] — #sigorta-results varsayılan
 * @param {object} payload
 */
export async function mountSigortaResultsV2(mountNode, payload = {}) {
  const target =
    (mountNode && typeof mountNode !== 'string' ? mountNode : null) ||
    (typeof mountNode === 'string' ? document.getElementById(mountNode) : null) ||
    document.getElementById(SIGORTA_RESULTS_MOUNT_ID);
  if (!target) {
    return showMountFallback(
      'Sonuç paneli yüklenemedi (#sigorta-results bulunamadı). Sayfayı yenileyip analizi tekrar deneyin.'
    );
  }

  document.getElementById('sigorta-results-mount-fallback')?.remove();

  const state = payload.state || {};
  const results = payload.results || [];
  const track = payload.track;
  const selectedOption = payload.selectedOption || results[0]?.id || '';
  const { user } = getResultsPlanContext();

  target.querySelector('.sigorta-v2-root')?.remove();

  const built = buildSigortaResultsV2Payload({
    state,
    results,
    selectedOption,
    userId: user?.id || null
  });
  const model = { ...built };

  const root = document.createElement('div');
  root.className = 'sigorta-v2-root';
  root.innerHTML = renderSigortaResultsV2Html(model);
  target.prepend(root);

  safeTrackEvent(track, 'decision_result_v2_view', {
    category: 'sigorta',
    score: model.decisionScore,
    protection: model.protectionScore,
    coverage: model.coverageScore,
    cost_efficiency: model.costEfficiencyScore,
    risk: model.overallRisk
  });

  trackSigortaResultsView({
    decision_score: model.decisionScore,
    overall_risk: model.overallRisk,
    insurance_type: state.insurance_type
  });

  bindSigortaV2Actions(root, {
    track,
    model,
    onRestart: payload.onRestart,
    selectedOption
  });

  void hydrateSigortaExtras(root, model, track);

  return model;
}

export {
  buildEngineResult,
  computeOverallDecisionScore,
  buildRiskAnalysis,
  resolveScoreLabel,
  syncCanonicalSigortaScores,
  resolvePrimarySigortaResult
} from './sigorta-engine.js';

export { buildSigortaAiSummary } from './sigorta-ai-summary.js';
export { buildSigortaPdfPayload } from './sigorta-pdf.js';
