/**
 * P6.2 — Partner CRM pipeline (predictable AE stages + forecast).
 */

/** @type {typeof import('../../../data/sales/partner-crm-pipeline.json')['stages']} */
const FALLBACK_STAGES = [
  { id: 'lead', label: 'Lead', order: 1, winProbability: 0.05, terminal: false },
  { id: 'qualified', label: 'Qualified', order: 2, winProbability: 0.15, terminal: false },
  { id: 'demo', label: 'Demo', order: 3, winProbability: 0.35, terminal: false },
  { id: 'pilot', label: 'Pilot', order: 4, winProbability: 0.55, terminal: false },
  { id: 'negotiation', label: 'Negotiation', order: 5, winProbability: 0.75, terminal: false },
  { id: 'won', label: 'Won', order: 6, winProbability: 1, terminal: true, won: true },
  { id: 'lost', label: 'Lost', order: 7, winProbability: 0, terminal: true, lost: true }
];

const FALLBACK_LEGACY = {
  new: 'lead',
  contacted: 'lead',
  qualified: 'qualified',
  integrating: 'pilot',
  live: 'won',
  rejected: 'lost'
};

let pipelineCache = null;

async function loadPipelineConfig() {
  if (pipelineCache) return pipelineCache;
  try {
    const res = await fetch('/data/sales/partner-crm-pipeline.json');
    pipelineCache = res.ok ? await res.json() : { stages: FALLBACK_STAGES, legacyStatusMap: FALLBACK_LEGACY };
  } catch {
    pipelineCache = { stages: FALLBACK_STAGES, legacyStatusMap: FALLBACK_LEGACY };
  }
  return pipelineCache;
}

/** Sync config for Node tests */
export function loadPartnerCrmPipelineSync(rawJson) {
  pipelineCache = rawJson;
  return pipelineCache;
}

export async function getPartnerCrmStages() {
  const cfg = await loadPipelineConfig();
  return [...(cfg.stages || FALLBACK_STAGES)].sort((a, b) => a.order - b.order);
}

/**
 * @param {string} [status]
 */
export function normalizePartnerCrmStatus(status, legacyMap = FALLBACK_LEGACY) {
  const raw = String(status || 'lead').trim().toLowerCase();
  return legacyMap[raw] || raw;
}

/**
 * @param {string} status
 * @param {Awaited<ReturnType<typeof getPartnerCrmStages>>} [stages]
 */
export function getPartnerCrmStageMeta(status, stages = FALLBACK_STAGES) {
  const id = normalizePartnerCrmStatus(status);
  return stages.find((s) => s.id === id) || { id, label: id, winProbability: 0.05, nextAction: '—' };
}

export function isTerminalPartnerCrmStatus(status) {
  const id = normalizePartnerCrmStatus(status);
  return id === 'won' || id === 'lost';
}

/**
 * @param {string} status
 */
export function getPartnerCrmWinProbability(status, stages = FALLBACK_STAGES) {
  return getPartnerCrmStageMeta(status, stages).winProbability ?? 0;
}

/**
 * @param {object[]} applications
 */
export function computePartnerPipelineForecast(applications = [], stages = FALLBACK_STAGES) {
  const rows = Array.isArray(applications) ? applications : [];
  const byStage = {};
  for (const s of stages) byStage[s.id] = 0;

  let weighted = 0;
  let open = 0;

  for (const app of rows) {
    const stageId = normalizePartnerCrmStatus(app.status);
    byStage[stageId] = (byStage[stageId] || 0) + 1;
    if (!isTerminalPartnerCrmStatus(stageId)) {
      open += 1;
      weighted += getPartnerCrmWinProbability(stageId, stages);
    } else if (stageId === 'won') {
      weighted += 1;
    }
  }

  const total = rows.length || 1;
  return {
    total: rows.length,
    open,
    byStage,
    forecastWinRate: rows.length ? Number((weighted / total).toFixed(3)) : 0,
    won: byStage.won || 0,
    lost: byStage.lost || 0
  };
}

/**
 * Stage-to-stage conversion from application list (ordered funnel).
 */
export function computePartnerStageConversions(applications = [], stages = FALLBACK_STAGES) {
  const ordered = stages.filter((s) => !s.lost).sort((a, b) => a.order - b.order);
  const counts = computePartnerPipelineForecast(applications, stages).byStage;
  const conversions = [];

  for (let i = 0; i < ordered.length - 1; i++) {
    const from = ordered[i];
    const to = ordered[i + 1];
    const fromCount = counts[from.id] || 0;
    const toCount = counts[to.id] || 0;
    const reached = fromCount + toCount;
    conversions.push({
      from: from.id,
      to: to.id,
      rate: reached ? Number((toCount / reached).toFixed(2)) : null
    });
  }

  return conversions;
}

/**
 * @param {string} status
 * @param {object} app
 */
export function recommendCrmStageAction(app = {}, stages = FALLBACK_STAGES) {
  const stageId = normalizePartnerCrmStatus(app.status);
  const meta = getPartnerCrmStageMeta(stageId, stages);

  if (stageId === 'pilot' && !app.webhook_ready) {
    return { action: 'Onboarding + webhook test — pilot tamamlama', priority: 'high', stageId, winProbability: meta.winProbability };
  }
  if (stageId === 'lead') {
    return { action: meta.nextAction || 'Outbound', priority: 'high', stageId, winProbability: meta.winProbability };
  }
  if (stageId === 'negotiation') {
    return { action: 'Teklif kilidi + sözleşme imza', priority: 'high', stageId, winProbability: meta.winProbability };
  }
  if (stageId === 'demo') {
    return { action: 'Demo kaydı + pilot CTA', priority: 'medium', stageId, winProbability: meta.winProbability };
  }

  return {
    action: meta.nextAction || '—',
    priority: (meta.winProbability || 0) >= 0.5 ? 'medium' : 'low',
    stageId,
    winProbability: meta.winProbability
  };
}

export function partnerCrmStatusOptions(stages = FALLBACK_STAGES) {
  return stages.map((s) => ({ value: s.id, label: s.label }));
}

/**
 * Admin CRM funnel summary (predictability).
 * @param {object[]} applications
 */
export function renderPartnerPipelineBoardHtml(applications = [], escapeHtmlFn = (s) => String(s ?? '')) {
  const stages = FALLBACK_STAGES;
  const forecast = computePartnerPipelineForecast(applications, stages);
  const esc = escapeHtmlFn;

  const stageCards = stages
    .filter((s) => !s.lost || (forecast.byStage.lost || 0) > 0)
    .map((s) => {
      const count = forecast.byStage[s.id] || 0;
      const pct = forecast.total ? Math.round((count / forecast.total) * 100) : 0;
      return `
        <div class="ib-crm-stage-card" data-stage="${esc(s.id)}">
          <span class="ib-crm-stage-label">${esc(s.label)}</span>
          <span class="ib-crm-stage-count">${count}</span>
          <span class="ib-crm-stage-pct">${pct}% · P(win) ${Math.round((s.winProbability || 0) * 100)}%</span>
        </div>`;
    })
    .join('');

  return `
    <div class="ib-partner-crm-board" role="region" aria-label="Partner CRM pipeline">
      <div class="ib-crm-forecast-metrics">
        <span><strong>${forecast.total}</strong> başvuru</span>
        <span><strong>${forecast.open}</strong> açık</span>
        <span><strong>${Math.round(forecast.forecastWinRate * 100)}%</strong> ağırlıklı kazanma tahmini</span>
        <span class="badge badge-green">Won ${forecast.won}</span>
        <span class="badge badge-red">Lost ${forecast.lost}</span>
      </div>
      <div class="ib-crm-stage-grid">${stageCards}</div>
    </div>`;
}
