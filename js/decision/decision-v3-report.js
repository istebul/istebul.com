/**
 * Decision Engine V3 — shareable / downloadable decision report.
 * Deterministic; no LLM; no personal data fields.
 */
import { escapeHtml } from '../core/security.js';

export const REPORT_VERSION = 'decision-report-v1';
export const REPORT_DISCLAIMER =
  'Bu rapor bilgilendirme amaçlıdır; finansal, hukuki veya yatırım tavsiyesi değildir.';

const VERTICAL_LABELS = {
  auto: 'Araç',
  konut: 'Konut',
  finansman: 'Finansman',
  tatil: 'Tatil',
  sigorta: 'Sigorta',
  kasko: 'Kasko'
};

function esc(value) {
  return escapeHtml(String(value ?? ''));
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizeVertical(value) {
  const vertical = String(value || 'unknown').toLowerCase();
  if (vertical === 'finans' || vertical === 'finance') return 'finansman';
  if (vertical === 'housing' || vertical === 'real-estate') return 'konut';
  if (vertical === 'vehicle' || vertical === 'arac') return 'auto';
  return vertical;
}

function formatCost(value) {
  const n = safeNumber(value);
  if (n == null) return '—';
  return `₺${Math.round(n).toLocaleString('tr-TR')}`;
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(new Date(iso));
  } catch {
    return String(iso || '');
  }
}

function buildTopRisks(decision = {}) {
  const risks = Array.isArray(decision.riskAnalysis) ? decision.riskAnalysis : [];
  return risks.slice(0, 4).map((risk) => {
    const label = risk.label || risk.key || 'Risk';
    const level = risk.level || 'orta';
    const detail = risk.detail || risk.reason || '';
    return detail ? `${label} (${level}): ${detail}` : `${label} (${level})`;
  });
}

function buildWhatIfSummary(whatIfResult) {
  if (!whatIfResult || typeof whatIfResult !== 'object') return null;

  const explanation = whatIfResult.explanation || '';
  const delta = whatIfResult.delta || {};
  const parts = [];

  if (explanation) parts.push(explanation);
  if (Number.isFinite(delta.decisionScore) && delta.decisionScore !== 0) {
    parts.push(`Karar skoru değişimi: ${delta.decisionScore > 0 ? '+' : ''}${Math.round(delta.decisionScore)}`);
  }
  if (Number.isFinite(delta.riskScore) && delta.riskScore !== 0) {
    parts.push(`Risk skoru değişimi: ${delta.riskScore > 0 ? '+' : ''}${Math.round(delta.riskScore)}`);
  }
  if (Number.isFinite(delta.totalCost) && delta.totalCost !== 0) {
    parts.push(
      `Toplam maliyet değişimi: ${delta.totalCost > 0 ? '+' : ''}${Math.round(delta.totalCost).toLocaleString('tr-TR')} ₺`
    );
  }

  return parts.length ? parts.join(' · ') : null;
}

function buildMemorySummary(memory) {
  if (!memory || memory.version !== 'memory-lite-v1') return null;

  const profile = memory.profile || {};
  const insights = Array.isArray(memory.insights) ? memory.insights.slice(0, 3) : [];
  const trend = memory.trend?.explanation || '';

  return {
    trend,
    insights,
    profile: {
      riskPreference: profile.riskPreference,
      budgetDiscipline: profile.budgetDiscipline,
      comfortPriority: profile.comfortPriority,
      investmentFocus: profile.investmentFocus,
      financeSensitivity: profile.financeSensitivity
    },
    privacyNote: 'Bu profil yalnızca cihazınızdaki analiz geçmişinden tahmini olarak oluşturulur.'
  };
}

/**
 * @param {object} decision
 * @param {object|null} memory
 * @param {object|null} whatIfResult
 */
export function buildDecisionReportModel(decision = {}, memory = null, whatIfResult = null) {
  const vertical = normalizeVertical(decision.vertical);
  const snapshot = decision.snapshot || {};
  const decisionScore = clampScore(decision.decisionScore ?? snapshot.decisionScore);
  const confidenceScore = clampScore(decision.confidenceScore ?? snapshot.confidenceScore);
  const riskScore = clampScore(decision.riskScore ?? snapshot.riskScore);
  const decisionQualityScore = clampScore(
    decision.decisionQualityScore ?? snapshot.decisionQualityScore
  );
  const totalCost = safeNumber(decision.totalCost ?? snapshot.totalCost);

  return {
    version: REPORT_VERSION,
    generatedAt: decision.generatedAt || new Date().toISOString(),
    title: decision.title || 'Karar Özeti',
    verticalLabel: VERTICAL_LABELS[vertical] || vertical,
    summary: decision.executiveSummary || decision.summary || '',
    scores: {
      decisionScore,
      confidenceScore,
      riskScore,
      decisionQualityScore
    },
    totalCost,
    topRisks: buildTopRisks(decision),
    actionPlan: Array.isArray(decision.nextSteps) ? decision.nextSteps.slice(0, 6) : [],
    whatIfSummary: buildWhatIfSummary(whatIfResult),
    memorySummary: buildMemorySummary(memory),
    disclaimer: REPORT_DISCLAIMER
  };
}

function renderReportList(items = []) {
  if (!items.length) return '<p>—</p>';
  return `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

/**
 * @param {object} reportModel
 * @returns {string}
 */
export function renderDecisionReportHtml(reportModel = {}) {
  const model = reportModel || {};
  const scores = model.scores || {};
  const memory = model.memorySummary;

  const memoryBlock = memory
    ? `
      <section>
        <h2>Karar Profili Özeti</h2>
        ${memory.trend ? `<p>${esc(memory.trend)}</p>` : ''}
        ${
          memory.insights?.length
            ? `<ul>${memory.insights.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`
            : ''
        }
        <p class="muted">${esc(memory.privacyNote || '')}</p>
      </section>
    `
    : '';

  const whatIfBlock = model.whatIfSummary
    ? `
      <section>
        <h2>What-If Özeti</h2>
        <p>${esc(model.whatIfSummary)}</p>
      </section>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(model.title)} — isteBul Karar Raporu</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    .wrap { max-width: 760px; margin: 0 auto; padding: 24px 16px 40px; }
    .brand { color: #2563eb; font-weight: 700; letter-spacing: 0.02em; margin-bottom: 8px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-top: 16px; }
    h1 { margin: 0 0 8px; font-size: 1.5rem; }
    h2 { margin: 0 0 10px; font-size: 1rem; }
    .meta { color: #64748b; font-size: 0.875rem; margin: 0 0 16px; }
    .scores { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .score { background: #eff6ff; border-radius: 12px; padding: 12px; }
    .score span { display: block; color: #475569; font-size: 0.75rem; }
    .score strong { font-size: 1.25rem; }
    .muted { color: #64748b; font-size: 0.875rem; }
    .disclaimer { margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 0.8125rem; color: #475569; }
    ul { margin: 0; padding-left: 1.2rem; }
    li { margin-bottom: 0.35rem; }
    @media (max-width: 640px) { .scores { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="brand">isteBul</div>
    <div class="card">
      <h1>${esc(model.title)}</h1>
      <p class="meta">${esc(model.verticalLabel)} · ${esc(formatDate(model.generatedAt))}</p>
      <p>${esc(model.summary)}</p>

      <section>
        <h2>Skorlar</h2>
        <div class="scores">
          <div class="score"><span>Karar Skoru</span><strong>${esc(String(scores.decisionScore ?? '—'))}/100</strong></div>
          <div class="score"><span>Güven</span><strong>${esc(String(scores.confidenceScore ?? '—'))}/100</strong></div>
          <div class="score"><span>Risk Skoru</span><strong>${esc(String(scores.riskScore ?? '—'))}/100</strong></div>
          <div class="score"><span>Karar Kalitesi</span><strong>${esc(String(scores.decisionQualityScore ?? '—'))}/100</strong></div>
        </div>
        <p style="margin-top:12px"><strong>Toplam maliyet:</strong> ${esc(formatCost(model.totalCost))}</p>
      </section>

      <section>
        <h2>Kritik Riskler</h2>
        ${renderReportList(model.topRisks)}
      </section>

      <section>
        <h2>Aksiyon Planı</h2>
        ${renderReportList(model.actionPlan)}
      </section>

      ${whatIfBlock}
      ${memoryBlock}

      <p class="disclaimer">${esc(model.disclaimer || REPORT_DISCLAIMER)}</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * @param {object} reportModel
 * @returns {string}
 */
export function buildDecisionReportSummaryText(reportModel = {}) {
  const model = reportModel || {};
  const scores = model.scores || {};
  const lines = [
    `isteBul Karar Özeti — ${model.title || 'Karar'}`,
    `${model.verticalLabel || 'Analiz'} · ${formatDate(model.generatedAt)}`,
    '',
    model.summary || '',
    '',
    `Karar Skoru: ${scores.decisionScore ?? '—'}/100`,
    `Güven: ${scores.confidenceScore ?? '—'}/100`,
    `Risk Skoru: ${scores.riskScore ?? '—'}/100`,
    `Karar Kalitesi: ${scores.decisionQualityScore ?? '—'}/100`,
    `Toplam Maliyet: ${formatCost(model.totalCost)}`
  ];

  if (model.topRisks?.length) {
    lines.push('', 'Kritik Riskler:', ...model.topRisks.map((item) => `- ${item}`));
  }

  if (model.actionPlan?.length) {
    lines.push('', 'Aksiyon Planı:', ...model.actionPlan.map((item, index) => `${index + 1}. ${item}`));
  }

  if (model.whatIfSummary) {
    lines.push('', `What-If: ${model.whatIfSummary}`);
  }

  if (model.memorySummary?.trend) {
    lines.push('', `Profil: ${model.memorySummary.trend}`);
  }

  lines.push('', model.disclaimer || REPORT_DISCLAIMER);
  return lines.filter((line, index, arr) => line !== '' || (index > 0 && arr[index - 1] !== '')).join('\n').trim();
}

/**
 * @param {object} reportModel
 */
export function downloadDecisionReportHtml(reportModel = {}) {
  if (typeof document === 'undefined') return false;

  try {
    const html = renderDecisionReportHtml(reportModel);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const slug = String(reportModel.title || 'karar-raporu')
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

    anchor.href = url;
    anchor.download = `${slug || 'karar-raporu'}-istebul.html`;
    anchor.rel = 'noopener';
    document.body?.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

async function copyTextWithFallback(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to textarea
    }
  }

  if (typeof document === 'undefined') return false;

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body?.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * @param {object} reportModel
 * @returns {Promise<{ ok: boolean, text: string }>}
 */
export async function copyDecisionReportSummary(reportModel = {}) {
  const text = buildDecisionReportSummaryText(reportModel);
  if (!text) return { ok: false, text: '' };

  try {
    const ok = await copyTextWithFallback(text);
    return { ok, text };
  } catch {
    return { ok: false, text };
  }
}
