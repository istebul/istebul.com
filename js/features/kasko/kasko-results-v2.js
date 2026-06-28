import { escapeHtml } from '../../core/security.js';
import { withTimeout } from '../../core/async-utils.js';
import {
  buildEngineResult,
  optionLabel,
  resolvePrimaryKaskoResult,
  syncCanonicalKaskoScores
} from './kasko-engine.js';
import { buildKaskoAiSummary, fetchKaskoExecutiveSummary } from './kasko-ai-summary.js';
import { buildKaskoPdfPayload } from './kasko-pdf.js';
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
  saveKaskoLead,
  trackKaskoResultsView,
  trackKaskoWizardComplete
} from '../../kasko/kasko-intake.js';

export const KASKO_RESULTS_MOUNT_ID = 'kasko-results';

const KASKO_SUMMARY_TIMEOUT_MS = 10000;

function formatTryAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(n);
}

export function buildKaskoResultsV2Payload({
  state = {},
  results = [],
  selectedOption = '',
  userId = null
}) {
  const engine = buildEngineResult(state);
  syncCanonicalKaskoScores(state, results, selectedOption);
  const ai = buildKaskoAiSummary(engine, state);
  const { planTier } = getResultsPlanContext();
  const primary = resolvePrimaryKaskoResult(results, selectedOption) || results[0];
  const premiumBand = primary?.metrics?.premiumBand;

  const pdfReportData = buildKaskoPdfPayload({
    state,
    planTier,
    engine,
    results,
    selectedOption
  });

  const insightInput = buildInsightInputFromIntelligence('kasko', state, engine, {
    planTier,
    strengths: engine.strengths,
    weaknesses: engine.weaknesses,
    costs: { premiumBand: premiumBand || null }
  });
  const insight = buildDecisionInsight(insightInput);

  return {
    decisionScore: engine.decisionScore,
    coverageScore: engine.coverageScore,
    repairRiskScore: engine.repairRiskScore,
    premiumEfficiencyScore: engine.premiumEfficiencyScore,
    scoreLabel: engine.scoreLabel,
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
 * V2 sonuç aksiyon çubuğu (Sigorta V2 parity).
 */
export function renderKaskoActionsBarHtml({ userId = null, esc = escapeHtml } = {}) {
  const loginHint = userId
    ? ''
    : `<p class="sigorta-v2-login-hint"><a href="/profil/?returnTo=/kasko/">Giriş yapın</a> — raporunuzu profilinizde saklayın.</p>`;

  return `
    <div class="sigorta-v2-actions kasko-v2-actions" aria-label="Sonuç aksiyonları">
      <button type="button" class="btn secondary kasko-v2-pdf" data-kasko-v2-pdf>
        PDF indir
      </button>
      <button type="button" class="btn secondary kasko-v2-restart" data-kasko-v2-restart>
        Tekrar analiz
      </button>
      <button type="button" class="btn secondary kasko-v2-quote" data-kasko-v2-quote>
        Teklif iste
      </button>
      ${loginHint}
      <div class="sigorta-v2-lead-panel kasko-v2-lead-panel" data-kasko-v2-lead-panel hidden>
        <p class="sigorta-v2-lead-hint" data-kasko-v2-lead-hint></p>
        <div class="sigorta-v2-lead-form" data-kasko-lead-form hidden>
          <div class="form-row">
            <input type="text" data-kasko-lead-name placeholder="Ad soyad" autocomplete="name">
            <input type="tel" data-kasko-lead-phone placeholder="Telefon" autocomplete="tel">
            <input type="email" data-kasko-lead-email placeholder="E-posta" autocomplete="email" required>
          </div>
          <label class="sigorta-lead-consent">
            <input type="checkbox" data-kasko-lead-privacy value="accepted">
            <span>
              <a href="/kvkk.html" target="_blank" rel="noopener">KVKK</a> ve
              <a href="/gizlilik.html" target="_blank" rel="noopener">gizlilik</a> metnini okudum; iletişim için onay veriyorum.
            </span>
          </label>
          <button type="button" class="btn btn-primary" data-kasko-lead-submit>Talebi gönder</button>
          <p class="sigorta-v2-lead-status" data-kasko-lead-status aria-live="polite"></p>
        </div>
      </div>
      <p class="sigorta-v2-action-feedback" data-kasko-v2-action-feedback hidden></p>
      <p class="sigorta-v2-pdf-hint" data-kasko-v2-pdf-hint hidden></p>
    </div>`;
}

function renderKaskoResultsV2Html(model) {
  const esc = escapeHtml;
  return `
    <section class="sigorta-v2-panel kasko-v2-panel" aria-label="Kasko karar raporu">
      <header class="sigorta-v2-hero">
        <p class="sigorta-v2-kicker">AI destekli kasko karar analizi</p>
        <h2 class="sigorta-v2-title">Kasko karar raporu</h2>
        <p class="sigorta-v2-band">${esc(model.scoreLabel)} · ${esc(String(model.decisionScore))}/100</p>
      </header>
      <div class="sigorta-v2-kpis">
        <article class="sigorta-v2-kpi sigorta-v2-kpi--decision">
          <span>Karar skoru</span>
          <strong>${esc(String(model.decisionScore))}<small>/100</small></strong>
          <div class="sigorta-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.decisionScore))}%"></span></div>
        </article>
        <article class="sigorta-v2-kpi">
          <span>Teminat</span>
          <strong>${esc(String(model.coverageScore))}<small>/100</small></strong>
          <div class="sigorta-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.coverageScore))}%"></span></div>
        </article>
        <article class="sigorta-v2-kpi">
          <span>Onarım riski</span>
          <strong>${esc(String(model.repairRiskScore))}<small>/100</small></strong>
          <div class="sigorta-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.repairRiskScore))}%"></span></div>
        </article>
        <article class="sigorta-v2-kpi">
          <span>Prim verimliliği</span>
          <strong>${esc(String(model.premiumEfficiencyScore))}<small>/100</small></strong>
          <div class="sigorta-v2-bar" aria-hidden="true"><span style="width:${esc(String(model.premiumEfficiencyScore))}%"></span></div>
        </article>
        <article class="sigorta-v2-kpi sigorta-v2-kpi--risk">
          <span>Genel risk</span>
          <strong><span class="sigorta-v2-risk sigorta-v2-risk--${esc(model.riskTone)}">${esc(model.overallRisk)}</span></strong>
          <small>Tahmini prim: ${esc(model.premiumLabel)}</small>
        </article>
      </div>

      <section class="sigorta-v2-risks" aria-label="Risk analizi">
        <h3>Risk analizi</h3>
        <div class="sigorta-v2-risk-grid">${model.riskAnalysis
          .map(
            (r) => `
          <article class="sigorta-v2-risk-card">
            <div class="sigorta-v2-risk-card-head">
              <h4>${esc(r.title)}</h4>
              <span class="sigorta-v2-risk sigorta-v2-risk--${esc(riskLevelToTone(r.level))}">${esc(r.level)}</span>
            </div>
            <p>${esc(r.description)}</p>
            ${r.recommendation ? `<p class="sigorta-v2-risk-rec"><strong>Öneri:</strong> ${esc(r.recommendation)}</p>` : ''}
          </article>`
          )
          .join('')}</div>
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

      <article class="sigorta-v2-block sigorta-v2-block--exec" data-kasko-v2-insight-root>
        <h3>Yapay zeka karar yorumu</h3>
        ${renderInsightBlocksHtml(model.insight, esc, {
          planTier: model.planTier,
          insightInput: model.insightInput
        })}
        <p class="sigorta-v2-exec-hint" data-kasko-v2-source>Skorlar deterministik motordan; AI yalnızca açıklama üretir.</p>
      </article>

      <article class="sigorta-v2-block sigorta-v2-block--next">
        <h3>Sonraki adımlar</h3>
        <ol>${model.nextSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </article>

      ${renderKaskoActionsBarHtml({ userId: model.userId, esc })}
    </section>`;
}

function bindKaskoV2Actions(root, { track, model, onRestart, selectedOption }) {
  root.querySelector('[data-kasko-v2-pdf]')?.addEventListener('click', () => {
    safeTrackEvent(track, 'decision_report_print_click', {
      category: 'kasko',
      score: model.decisionScore
    });
    const hint = root.querySelector('[data-kasko-v2-pdf-hint]');
    if (hint) {
      hint.hidden = false;
      hint.textContent =
        'Rapor penceresi açıldı. Yazdır diyalogunda “PDF olarak kaydet” seçeneğini kullanabilirsiniz.';
    }
    gatePdfDownload(model.pdfReportData);
  });

  root.querySelector('[data-kasko-v2-restart]')?.addEventListener('click', () => {
    if (typeof onRestart === 'function') onRestart();
  });

  root.querySelector('[data-kasko-v2-quote]')?.addEventListener('click', () => {
    const leadPanel = root.querySelector('[data-kasko-v2-lead-panel]');
    const leadHint = root.querySelector('[data-kasko-v2-lead-hint]');
    const form = root.querySelector('[data-kasko-lead-form]');
    if (leadPanel) leadPanel.hidden = false;
    if (form) form.hidden = false;
    if (leadHint) {
      leadHint.textContent =
        'Size uygun kasko teklifi için iletişim bilgilerinizi bırakın.';
    }
    leadPanel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  root.querySelector('[data-kasko-lead-submit]')?.addEventListener('click', async () => {
    const statusEl = root.querySelector('[data-kasko-lead-status]');
    const feedbackEl = root.querySelector('[data-kasko-v2-action-feedback]');
    if (!root.querySelector('[data-kasko-lead-privacy]')?.checked) {
      if (statusEl) statusEl.textContent = 'Devam etmek için KVKK onayını işaretleyin.';
      return;
    }
    const email = root.querySelector('[data-kasko-lead-email]')?.value?.trim() || '';
    if (!email) {
      if (statusEl) statusEl.textContent = 'E-posta adresi zorunludur.';
      return;
    }
    const state = model.state || {};
    const res = await saveKaskoLead({
      full_name: root.querySelector('[data-kasko-lead-name]')?.value?.trim() || '',
      phone: root.querySelector('[data-kasko-lead-phone]')?.value?.trim() || '',
      email,
      privacy_consent: 'accepted',
      decision_score: model.decisionScore,
      ai_summary: model.executiveSummary,
      profile: { ...state },
      selected_option: selectedOption || model.selectedOption || ''
    });
    const message = res.ok
      ? 'Talebiniz alındı. Kasko ekibimiz profilinize uygun bilgilendirme yapabilir.'
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
export async function hydrateKaskoExtras(root, model, track) {
  try {
    const enriched = await withTimeout(
      fetchKaskoExecutiveSummary(model.engine, model.state || {}, {
        planTier: model.planTier
      }),
      KASKO_SUMMARY_TIMEOUT_MS,
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
      hydrateInsightBlocks(root.querySelector('[data-kasko-v2-insight-root]'), enriched.insight);
      model.pdfReportData.insightBlocks = enriched.insight;
    }
    const execHint = root.querySelector('[data-kasko-v2-source]');
    if (execHint && enriched.source === 'ai') {
      execHint.textContent =
        'Kaynak: Deterministik skorlar + AI destekli yorum (skorlar değiştirilmez).';
    }
    safeTrackEvent(track, 'decision_result_v2_ai_hydrate', {
      category: 'kasko',
      source: enriched.source
    });
  } catch (error) {
    console.warn('kasko-v2-summary-hydrate-failed', error);
  }
}

export async function mountKaskoResultsV2(mountNode, payload = {}) {
  const target =
    (mountNode && typeof mountNode !== 'string' ? mountNode : null) ||
    (typeof mountNode === 'string' ? document.getElementById(mountNode) : null) ||
    document.getElementById(KASKO_RESULTS_MOUNT_ID);
  if (!target) return null;

  const state = payload.state || {};
  const results = payload.results || [];
  const track = payload.track;
  const selectedOption = payload.selectedOption || results[0]?.id || '';
  const { user } = getResultsPlanContext();

  const hadV2Root = Boolean(target.querySelector('.kasko-v2-root'));
  target.querySelector('.kasko-v2-root')?.remove();

  const built = buildKaskoResultsV2Payload({
    state,
    results,
    selectedOption,
    userId: user?.id || null
  });
  const model = { ...built };

  const root = document.createElement('div');
  root.className = 'kasko-v2-root';
  root.innerHTML = renderKaskoResultsV2Html(model);
  target.prepend(root);

  trackKaskoResultsView({ decision_score: model.decisionScore });
  if (!hadV2Root) {
    trackKaskoWizardComplete({ decision_score: model.decisionScore });
  }

  safeTrackEvent(track, 'decision_result_v2_view', {
    category: 'kasko',
    score: model.decisionScore,
    coverage: model.coverageScore,
    repair_risk: model.repairRiskScore,
    premium_efficiency: model.premiumEfficiencyScore,
    risk: model.overallRisk
  });

  bindKaskoV2Actions(root, {
    track,
    model,
    onRestart: payload.onRestart,
    selectedOption
  });

  void hydrateKaskoExtras(root, model, track);

  void import('../../decision/decision-os-mount.js')
    .then(({ mountDecisionOsOverlay }) =>
      mountDecisionOsOverlay(target, {
        category: 'kasko',
        formData: state,
        metrics: { totalCost: model.totalCost?.value ?? null },
        intelligence: model.intelligence,
        model,
        extras: {
          totalCost: model.totalCost?.value ?? null,
          title: 'Kasko Kararı',
          strengths: model.strengths,
          cautions: model.weaknesses,
          alternatives: model.alternatives,
          insight: model.insight,
          executiveSummary: model.executiveSummary
        }
      })
    )
    .catch(() => {});

  return model;
}

export {
  buildEngineResult,
  syncCanonicalKaskoScores,
  resolvePrimaryKaskoResult
} from './kasko-engine.js';

export { buildKaskoAiSummary } from './kasko-ai-summary.js';
export { buildKaskoPdfPayload } from './kasko-pdf.js';
