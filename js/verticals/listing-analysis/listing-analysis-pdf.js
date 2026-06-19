/**
 * AI İlan Analizi V1 — client-side printable PDF raporu.
 * Mevcut pdf-report.js dosyasına dokunulmaz.
 */

import { escapeHtml } from '../../core/security.js';
import { LISTING_ANALYSIS_LEGAL_NOTICE, LISTING_SOURCE_NOTE } from './listing-analysis-config.js';
import { buildListingAiSummary } from './listing-analysis-ai-summary.js';

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
  if (level === 'düşük') return '#16a34a';
  if (level === 'orta') return '#d97706';
  return '#dc2626';
}

/**
 * @param {object} params
 * @param {object} params.result
 * @param {object} [params.aiSummary]
 */
export function buildListingPdfHtml({ result = {}, aiSummary = null } = {}) {
  const ai = aiSummary || buildListingAiSummary(result);
  const typeLabel = result.listingType === 'vehicle' ? 'Araç İlanı' : 'Konut İlanı';
  const totalCost =
    result.listingType === 'vehicle'
      ? formatMoney(result.totalCostEstimate?.firstYearTotal)
      : formatMoney(result.totalCostEstimate?.totalAcquisitionCost);

  const strengths = (result.strengths || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  const weaknesses = (result.weaknesses || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  const source = result.source || {};
  const sourceSection = source.listingUrl
    ? `<section>
    <h2>İlan Kaynağı</h2>
    <p><strong>Kaynak:</strong> ${escapeHtml(source.label || 'Diğer')}</p>
    <p><strong>Bağlantı:</strong> ${escapeHtml(source.listingUrl)}</p>
    <p>${escapeHtml(LISTING_SOURCE_NOTE)}</p>
  </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>isteBul Seçenek Analizi Raporu</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #0f172a; margin: 24px; }
    h1 { font-size: 1.4rem; margin: 0 0 8px; }
    .meta { color: #64748b; font-size: 0.9rem; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
    .label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
    .value { font-size: 1.2rem; font-weight: 700; margin-top: 4px; }
    section { margin-top: 18px; }
    ul { margin: 8px 0 0; padding-left: 18px; }
    .summary { line-height: 1.55; white-space: pre-wrap; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>isteBul — AI Seçenek Analizi Raporu</h1>
  <p class="meta">${escapeHtml(typeLabel)} · ${new Date().toLocaleString('tr-TR')}</p>
  <div class="grid">
    <div class="card"><div class="label">Karar Skoru</div><div class="value">${result.decisionScore}/100</div></div>
    <div class="card"><div class="label">Güven Skoru</div><div class="value">${result.confidenceScore}/100</div></div>
    <div class="card"><div class="label">Fiyat Uygunluğu</div><div class="value">${result.priceFit}/100</div></div>
    <div class="card"><div class="label">Risk</div><div class="value" style="color:${riskTone(result.riskLevel)}">${escapeHtml(result.riskLevel)}</div></div>
  </div>
  ${sourceSection}
  <section>
    <h2>Toplam Maliyet Tahmini</h2>
    <p><strong>${totalCost}</strong></p>
  </section>
  <section>
    <h2>Güçlü Yönler</h2>
    <ul>${strengths || '<li>—</li>'}</ul>
  </section>
  <section>
    <h2>Zayıf Yönler</h2>
    <ul>${weaknesses || '<li>—</li>'}</ul>
  </section>
  <section>
    <h2>AI Executive Summary</h2>
    <p class="summary">${escapeHtml(ai.summary)}</p>
  </section>
  <p class="meta">${escapeHtml(LISTING_ANALYSIS_LEGAL_NOTICE)}</p>
</body>
</html>`;
}

/**
 * @param {object} params
 */
export function downloadListingAnalysisPdf(params = {}) {
  const html = buildListingPdfHtml(params);
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return { ok: false, error: 'popup_blocked' };
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      /* ignore */
    }
  }, 350);
  return { ok: true };
}
