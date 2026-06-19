/**
 * Decision OS v1 — premium PDF-like report + LinkedIn summary.
 */
import { escapeHtml } from '../core/security.js';

export const REPORT_VERSION = 'decision-os-report-v1';
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

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function formatCost(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₺${Math.round(n).toLocaleString('tr-TR')}`;
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return String(iso || '');
  }
}

/**
 * @param {object} decision
 * @param {object|null} memory
 * @param {object|null} whatIfResult
 */
export function buildDecisionReportModel(decision = {}, memory = null, whatIfResult = null) {
  const vertical = String(decision.vertical || 'unknown').toLowerCase();
  const verdict = decision.verdict || { label: 'BEKLE', emoji: '🟡' };

  return {
    version: REPORT_VERSION,
    generatedAt: decision.generatedAt || new Date().toISOString(),
    title: decision.title || 'Karar Özeti',
    verticalLabel: VERTICAL_LABELS[vertical] || vertical,
    verdict: verdict.label,
    verdictEmoji: verdict.emoji,
    summary: decision.executiveSummary || decision.summary || '',
    scores: {
      decisionScore: clampScore(decision.decisionScore),
      confidenceScore: clampScore(decision.confidenceScore),
      riskScore: clampScore(decision.riskScore),
      decisionQualityScore: clampScore(decision.decisionQualityScore)
    },
    totalCost: decision.totalCost,
    topRisks: (decision.riskAnalysis || []).slice(0, 4).map((r) => {
      const label = r.label || r.key || 'Risk';
      const detail = r.detail || r.reason || '';
      return detail ? `${label}: ${detail}` : label;
    }),
    actionPlan: Array.isArray(decision.nextSteps) ? decision.nextSteps.slice(0, 6) : [],
    whatIfSummary: whatIfResult?.explanation || null,
    memoryTrend: memory?.trend?.explanation || null,
    disclaimer: REPORT_DISCLAIMER
  };
}

/**
 * @param {object} reportModel
 * @returns {string}
 */
export function renderDecisionOsReportHtml(reportModel = {}) {
  const model = reportModel || {};
  const scores = model.scores || {};

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(model.title)} — isteBul Karar Raporu</title>
  <style>
    @page { margin: 24mm 18mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
      margin: 0; background: #f4f6f8; color: #0f172a;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .wrap { max-width: 720px; margin: 0 auto; padding: 32px 20px 48px; }
    .sheet {
      background: #fff; border-radius: 20px;
      box-shadow: 0 1px 3px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.04);
      padding: 36px 32px; border: 1px solid rgba(15,23,42,.06);
    }
    .brand { font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #64748b; margin-bottom: 20px; }
    .verdict {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 12px 20px; border-radius: 16px;
      background: #f8fafc; border: 1px solid #e2e8f0;
      font-size: 1.5rem; font-weight: 700; margin-bottom: 20px;
    }
    h1 { margin: 0 0 6px; font-size: 1.375rem; font-weight: 600; letter-spacing: -.02em; }
    .meta { color: #64748b; font-size: .8125rem; margin: 0 0 24px; }
    .summary { font-size: .9375rem; line-height: 1.6; color: #334155; margin-bottom: 28px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 28px; }
    .metric {
      padding: 16px; border-radius: 14px; background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .metric span { display: block; font-size: .6875rem; text-transform: uppercase; letter-spacing: .06em; color: #64748b; margin-bottom: 4px; }
    .metric strong { font-size: 1.25rem; font-weight: 700; }
    h2 { font-size: .8125rem; text-transform: uppercase; letter-spacing: .08em; color: #64748b; margin: 0 0 12px; font-weight: 600; }
    section { margin-bottom: 24px; }
    ul, ol { margin: 0; padding-left: 1.25rem; }
    li { margin-bottom: 6px; font-size: .875rem; line-height: 1.5; color: #334155; }
    .disclaimer {
      margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;
      font-size: .75rem; color: #94a3b8; line-height: 1.5;
    }
    @media (max-width: 520px) { .grid { grid-template-columns: 1fr; } .sheet { padding: 24px 20px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="sheet">
      <div class="brand">isteBul · Decision OS</div>
      <div class="verdict">${esc(model.verdictEmoji || '')} ${esc(model.verdict || 'BEKLE')}</div>
      <h1>${esc(model.title)}</h1>
      <p class="meta">${esc(model.verticalLabel)} · ${esc(formatDate(model.generatedAt))}</p>
      <p class="summary">${esc(model.summary)}</p>
      <div class="grid">
        <div class="metric"><span>Karar Skoru</span><strong>${esc(String(scores.decisionScore))}/100</strong></div>
        <div class="metric"><span>Güven</span><strong>${esc(String(scores.confidenceScore))}%</strong></div>
        <div class="metric"><span>Risk</span><strong>${esc(String(scores.riskScore))}/100</strong></div>
        <div class="metric"><span>Toplam Maliyet</span><strong>${esc(formatCost(model.totalCost))}</strong></div>
      </div>
      <section>
        <h2>Kritik Riskler</h2>
        <ul>${(model.topRisks || []).map((r) => `<li>${esc(r)}</li>`).join('') || '<li>—</li>'}</ul>
      </section>
      <section>
        <h2>Aksiyon Planı</h2>
        <ol>${(model.actionPlan || []).map((s) => `<li>${esc(s)}</li>`).join('') || '<li>—</li>'}</ol>
      </section>
      ${model.whatIfSummary ? `<section><h2>What-If</h2><p class="summary">${esc(model.whatIfSummary)}</p></section>` : ''}
      <p class="disclaimer">${esc(model.disclaimer)}</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * LinkedIn-friendly summary text.
 * @param {object} reportModel
 */
export function buildLinkedInSummaryText(reportModel = {}) {
  const model = reportModel || {};
  const scores = model.scores || {};
  const lines = [
    `🎯 isteBul AI Karar Özeti — ${model.verticalLabel || 'Analiz'}`,
    '',
    `${model.verdictEmoji || ''} AI Kararı: ${model.verdict || 'BEKLE'}`,
    `📊 Karar Skoru: ${scores.decisionScore ?? '—'}/100 | Güven: ${scores.confidenceScore ?? '—'}%`,
    '',
    model.summary || '',
    '',
    '—',
    'isteBul ile daha bilinçli kararlar verin.',
    '#isteBul #AIKarar #FinansalOkuryazarlık'
  ];
  return lines.join('\n').trim();
}

export function downloadDecisionReportHtml(reportModel = {}) {
  if (typeof document === 'undefined') return false;
  try {
    const html = renderDecisionOsReportHtml(reportModel);
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
      // fall through
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

export async function copyDecisionReportSummary(reportModel = {}) {
  const text = buildLinkedInSummaryText(reportModel);
  if (!text) return { ok: false, text: '' };
  try {
    const ok = await copyTextWithFallback(text);
    return { ok, text };
  } catch {
    return { ok: false, text };
  }
}
