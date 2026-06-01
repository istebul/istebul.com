import { escapeHtml } from '../../core/security.js';
import { buildEngineResult } from './kasko-engine.js';
import { buildKaskoAiSummary, fetchKaskoExecutiveSummary } from './kasko-ai-summary.js';
import { riskLevelToTone, safeTrackEvent } from '../results/results-engine.js';
import { gatePdfDownload } from '../billing/pdf-access-v1.js';
import { getResultsPlanContext } from '../billing/paywall-v1.js';
import { saveKaskoLead, trackKaskoResultsView } from '../../kasko/kasko-intake.js';

export const KASKO_RESULTS_MOUNT_ID = 'kasko-results';

function formatTryAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(n);
}

export function buildKaskoResultsV2Payload({ state = {}, results = [] }) {
  const engine = buildEngineResult(state);
  const ai = buildKaskoAiSummary(engine, state);
  const { planTier } = getResultsPlanContext();
  const primary = results[0];
  const premiumBand = primary?.metrics?.premiumBand;

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
    pdfReportData: {
      title: 'Kasko karar raporu',
      category: 'kasko',
      decisionScore: engine.decisionScore,
      summary: ai.summary,
      planTier
    },
    planTier,
    premiumLabel: premiumBand ? formatTryAmount(premiumBand) : '—',
    engine,
    ai
  };
}

function renderHtml(model) {
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
        </article>
        <article class="sigorta-v2-kpi">
          <span>Teminat</span>
          <strong>${esc(String(model.coverageScore))}<small>/100</small></strong>
        </article>
        <article class="sigorta-v2-kpi">
          <span>Onarım riski</span>
          <strong>${esc(String(model.repairRiskScore))}<small>/100</small></strong>
        </article>
        <article class="sigorta-v2-kpi">
          <span>Prim verimliliği</span>
          <strong>${esc(String(model.premiumEfficiencyScore))}<small>/100</small></strong>
        </article>
        <article class="sigorta-v2-kpi sigorta-v2-kpi--risk">
          <span>Genel risk</span>
          <strong><span class="sigorta-v2-risk sigorta-v2-risk--${esc(model.riskTone)}">${esc(model.overallRisk)}</span></strong>
          <small>Tahmini prim: ${esc(model.premiumLabel)}</small>
        </article>
      </div>
      <section class="sigorta-v2-risks"><h3>Risk analizi</h3>
        <div class="sigorta-v2-risk-grid">${model.riskAnalysis
          .map(
            (r) => `
          <article class="sigorta-v2-risk-card">
            <h4>${esc(r.title)}</h4>
            <span class="sigorta-v2-risk sigorta-v2-risk--${esc(riskLevelToTone(r.level))}">${esc(r.level)}</span>
            <p>${esc(r.description)}</p>
          </article>`
          )
          .join('')}</div>
      </section>
      <article class="sigorta-v2-block sigorta-v2-block--exec">
        <h3>Yönetici özeti</h3>
        <div class="sigorta-v2-exec-body"><p>${esc(model.executiveSummary)}</p></div>
        <p class="sigorta-v2-exec-hint">Skorlar deterministik motordan; AI yalnızca açıklama üretir.</p>
      </article>
      <div class="sigorta-v2-actions">
        <button type="button" class="btn secondary" data-kasko-v2-pdf>PDF indir</button>
        <button type="button" class="btn btn-primary" data-kasko-interest>Teklif talebi</button>
      </div>
      <div class="sigorta-v2-lead-form" hidden data-kasko-lead-form>
        <input type="email" data-kasko-lead-email placeholder="E-posta" required>
        <label><input type="checkbox" data-kasko-lead-privacy> KVKK onayı</label>
        <button type="button" class="btn btn-primary" data-kasko-lead-submit>Gönder</button>
        <p data-kasko-lead-status aria-live="polite"></p>
      </div>
    </section>`;
}

export async function mountKaskoResultsV2(mountNode, payload = {}) {
  const target =
    (mountNode && typeof mountNode !== 'string' ? mountNode : null) ||
    document.getElementById(typeof mountNode === 'string' ? mountNode : KASKO_RESULTS_MOUNT_ID);
  if (!target) return null;

  const state = payload.state || {};
  const results = payload.results || [];
  const built = buildKaskoResultsV2Payload({ state, results });
  const model = { ...built };

  target.querySelector('.kasko-v2-root')?.remove();
  const root = document.createElement('div');
  root.className = 'kasko-v2-root';
  root.innerHTML = renderHtml(model);
  target.prepend(root);

  trackKaskoResultsView({ decision_score: model.decisionScore });

  try {
    const enriched = await fetchKaskoExecutiveSummary(model.engine, state, { planTier: model.planTier });
    if (enriched?.text) {
      const body = root.querySelector('.sigorta-v2-exec-body');
      if (body) body.innerHTML = `<p>${escapeHtml(enriched.text)}</p>`;
    }
  } catch {
    /* deterministic */
  }

  root.querySelector('[data-kasko-v2-pdf]')?.addEventListener('click', () => {
    gatePdfDownload(model.pdfReportData);
  });

  root.querySelector('[data-kasko-interest]')?.addEventListener('click', () => {
    const form = root.querySelector('[data-kasko-lead-form]');
    if (form) form.hidden = false;
  });

  root.querySelector('[data-kasko-lead-submit]')?.addEventListener('click', async () => {
    const statusEl = root.querySelector('[data-kasko-lead-status]');
    if (!root.querySelector('[data-kasko-lead-privacy]')?.checked) {
      if (statusEl) statusEl.textContent = 'KVKK onayı gerekli.';
      return;
    }
    const email = root.querySelector('[data-kasko-lead-email]')?.value?.trim();
    if (!email) {
      if (statusEl) statusEl.textContent = 'E-posta zorunlu.';
      return;
    }
    const res = await saveKaskoLead({
      email,
      decision_score: model.decisionScore,
      ai_summary: model.executiveSummary,
      profile: { ...state }
    });
    if (statusEl) {
      statusEl.textContent = res.ok ? 'Talebiniz alındı.' : 'Şu an kaydedilemedi.';
    }
  });

  return model;
}
