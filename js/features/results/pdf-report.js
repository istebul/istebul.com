/**
 * Decision Report V1 — branded HTML report + browser print/save-as-PDF flow.
 * Designed so a server-side PDF service can reuse buildReportHtml(pdfReportData) later.
 */
import { escapeHtml } from '../../core/security.js';
import { buildPdfInsight, normalizeInsightInput } from '../ai/ai-insight-engine.js';
import { recordPdfReportHistory } from '../account/dashboard-v2-store.js';

const CATEGORY_LABELS = {
  auto: 'Araç',
  konut: 'Konut',
  tatil: 'Tatil',
  finansman: 'Finansman'
};

const DISCLAIMER =
  'Bu rapor karar destek amaçlıdır; finansal, hukuki veya yatırım tavsiyesi değildir.';

/**
 * @param {unknown} value
 */
export function sanitizeReportText(value) {
  let text = String(value ?? '');
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  return escapeHtml(text.trim());
}

/**
 * @param {unknown} value
 */
export function formatReportMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(n);
}

/**
 * @param {unknown} value
 * @param {string} [label]
 */
export function formatReportScore(value, label = '') {
  const n = Number(value);
  const score = Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : '—';
  const base = `${score}/100`;
  return label ? `${base} (${sanitizeReportText(label)})` : base;
}

/**
 * @param {string} [category]
 * @param {string|number|Date} [createdAt]
 */
export function createReportFilename(category, createdAt) {
  const slugMap = {
    auto: 'arac',
    konut: 'konut',
    tatil: 'tatil',
    finansman: 'finansman'
  };
  const slug = slugMap[String(category || '').toLowerCase()] || 'karar';
  const date = createdAt ? new Date(createdAt) : new Date();
  const iso =
    Number.isNaN(date.getTime()) ?
      new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
  return `istebul-${slug}-karar-raporu-${iso}.pdf`;
}

function categoryLabel(category) {
  return CATEGORY_LABELS[String(category || '').toLowerCase()] || 'Karar';
}

function formatReportDate(createdAt) {
  const date = createdAt ? new Date(createdAt) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString('tr-TR');
  }
  return date.toLocaleString('tr-TR', {
    dateStyle: 'long',
    timeStyle: 'short'
  });
}

function listHtml(items, ordered = false) {
  const rows = (items || []).filter(Boolean).map((item) => `<li>${sanitizeReportText(item)}</li>`);
  if (!rows.length) return `<p class="muted">—</p>`;
  return ordered ? `<ol>${rows.join('')}</ol>` : `<ul>${rows.join('')}</ul>`;
}

function costRowsHtml(rows) {
  const valid = (rows || []).filter((r) => r && r.label);
  if (!valid.length) return `<p class="muted">Maliyet verisi henüz modellenmedi.</p>`;
  return `<dl class="cost-dl">${valid
    .map(
      (r) =>
        `<div><dt>${sanitizeReportText(r.label)}</dt><dd>${sanitizeReportText(r.value)}</dd></div>`
    )
    .join('')}</dl>`;
}

function buildCostRows(data) {
  const cost = data?.totalCost && typeof data.totalCost === 'object' ? data.totalCost : {};
  const category = String(data?.category || '').toLowerCase();

  if (category === 'konut') {
    return [
      { label: 'Peşinat', value: formatReportMoney(cost.downPayment) },
      { label: 'Kredi ihtiyacı', value: formatReportMoney(cost.loanNeed) },
      { label: 'Aylık ödeme (tahmini)', value: formatReportMoney(cost.monthlyPayment) },
      { label: 'Tapu/masraf (tahmini)', value: formatReportMoney(cost.titleFees) },
      { label: 'Aidat (aylık tahmini)', value: formatReportMoney(cost.duesMonthly) },
      { label: '12 aylık toplam yük', value: formatReportMoney(cost.yearlyLoad) },
      { label: 'İlk yıl toplam maliyet', value: formatReportMoney(cost.firstYearTotal) },
      { label: 'Gerçek toplam (model)', value: formatReportMoney(cost.realTotal) }
    ];
  }

  if (category === 'finansman') {
    return [
      { label: 'Talep edilen finansman', value: formatReportMoney(cost.principal) },
      { label: 'Tahmini aylık ödeme', value: formatReportMoney(cost.monthlyPayment) },
      { label: 'Toplam geri ödeme', value: formatReportMoney(cost.totalRepayment) },
      { label: 'Tahmini faiz maliyeti', value: formatReportMoney(cost.interestCost) },
      { label: 'Dosya/masraf tahmini', value: formatReportMoney(cost.fileFees) },
      { label: 'İlk 12 ay ödeme yükü', value: formatReportMoney(cost.yearlyLoad) },
      {
        label: 'Gelire göre aylık yük',
        value: cost.incomeLoadPct != null ? `%${cost.incomeLoadPct}` : '—'
      }
    ];
  }

  if (category === 'tatil') {
    return [
      { label: 'Konaklama tahmini', value: formatReportMoney(cost.accommodation) },
      { label: 'Ulaşım tahmini', value: formatReportMoney(cost.transport) },
      { label: 'Yeme-içme tahmini', value: formatReportMoney(cost.food) },
      { label: 'Aktivite tahmini', value: formatReportMoney(cost.activities) },
      { label: 'Ekstra/rezerv bütçe', value: formatReportMoney(cost.reserve) },
      { label: 'Kişi başı maliyet', value: formatReportMoney(cost.perPerson) },
      { label: 'Toplam tatil bütçesi', value: formatReportMoney(cost.totalBudget) },
      {
        label: 'Bütçe uyum oranı',
        value: cost.budgetFitPct != null ? `%${cost.budgetFitPct}` : '—'
      }
    ];
  }

  if (category === 'auto') {
    const profile = data.profile || {};
    const rows = [
      { label: 'Bütçe', value: sanitizeReportText(profile.budgetLabel || '—') },
      { label: 'Kullanım', value: sanitizeReportText(profile.usage || '—') }
    ];
    if (cost.tco12Months != null) {
      rows.push({
        label: '12 ay toplam maliyet (TCO)',
        value: formatReportMoney(cost.tco12Months)
      });
    }
    if (cost.vehiclePrice != null) {
      rows.push({ label: 'Araç fiyatı (tahmini)', value: formatReportMoney(cost.vehiclePrice) });
    }
    return rows;
  }

  return Object.entries(cost)
    .filter(([k, v]) => k !== 'isEstimate' && k !== 'estimateNote' && v != null)
    .slice(0, 8)
    .map(([k, v]) => ({
      label: k,
      value: typeof v === 'number' ? formatReportMoney(v) : sanitizeReportText(v)
    }));
}

function riskLevelClass(level) {
  const n = String(level || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (n.includes('yuksek') || n.includes('yüksek')) return 'yuksek';
  if (n.includes('dusuk') || n.includes('düşük')) return 'dusuk';
  return 'orta';
}

function risksHtml(riskAnalysis) {
  const risks = Array.isArray(riskAnalysis) ? riskAnalysis : [];
  if (!risks.length) {
    return `<p class="muted">Risk analizi verisi bulunmuyor.</p>`;
  }
  return `<div class="risk-grid">${risks
    .map(
      (r) => `
    <article class="risk-card">
      <div class="risk-head">
        <h3>${sanitizeReportText(r.title || r.key || 'Risk')}</h3>
        <span class="risk-pill risk-pill--${riskLevelClass(r.level)}">${sanitizeReportText(r.level || '—')}</span>
      </div>
      <p>${sanitizeReportText(r.description || '')}</p>
      <p class="risk-rec"><strong>Öneri:</strong> ${sanitizeReportText(r.recommendation || '')}</p>
    </article>`
    )
    .join('')}</div>`;
}

function alternativesHtml(alternatives) {
  const alts = Array.isArray(alternatives) ? alternatives : [];
  if (!alts.length) return `<p class="muted">—</p>`;
  return `<div class="alt-grid">${alts
    .map(
      (a) => `
    <article class="alt-card">
      <h3>${sanitizeReportText(a.title || 'Alternatif')}</h3>
      <p>${sanitizeReportText(a.description || a.reason || '')}</p>
      ${a.meta || a.delta ? `<p class="alt-meta">${sanitizeReportText(a.meta || a.delta)}</p>` : ''}
    </article>`
    )
    .join('')}</div>`;
}

const REPORT_STYLES = `
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  color: #0f172a;
  background: #f8fafc;
  line-height: 1.55;
  font-size: 11pt;
}
.report {
  max-width: 210mm;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
}
.report-header {
  padding: 22px 26px 18px;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%);
  color: #f8fafc;
}
.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.brand {
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.brand small {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  opacity: 0.85;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 2px;
}
.report-meta {
  text-align: right;
  font-size: 0.82rem;
  opacity: 0.92;
}
.report-body { padding: 22px 26px 28px; }
h2 {
  font-size: 0.95rem;
  margin: 1.35rem 0 0.55rem;
  color: #1e293b;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.35rem;
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0.5rem 0 1rem;
}
.kpi {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #f8fafc;
}
.kpi span {
  display: block;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 4px;
}
.kpi strong { font-size: 1.05rem; }
.exec {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(248, 250, 252, 1));
  border: 1px solid rgba(37, 99, 235, 0.22);
  border-radius: 10px;
  padding: 12px 14px;
}
.cost-dl { margin: 0; }
.cost-dl div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed #e2e8f0;
  font-size: 0.9rem;
}
.cost-dl dt { color: #64748b; margin: 0; }
.cost-dl dd { margin: 0; font-weight: 600; text-align: right; }
.risk-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.risk-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
  break-inside: avoid;
}
.risk-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}
.risk-head h3 { margin: 0; font-size: 0.85rem; }
.risk-pill {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  white-space: nowrap;
}
.risk-rec { font-size: 0.82rem; color: #64748b; margin: 6px 0 0; }
.alt-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.alt-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  break-inside: avoid;
}
.alt-card h3 { margin: 0 0 4px; font-size: 0.85rem; }
.alt-card p { margin: 0; font-size: 0.82rem; color: #475569; }
.alt-meta { margin-top: 6px; font-size: 0.75rem; font-weight: 700; color: #2563eb; }
.note-banner {
  margin: 0 0 1rem;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff7ed;
  border: 1px solid #fdba74;
  color: #9a3412;
  font-size: 0.86rem;
}
.disclaimer {
  margin-top: 1.5rem;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  font-size: 0.8rem;
  color: #64748b;
}
.muted { color: #94a3b8; font-size: 0.88rem; }
ul, ol { margin: 0; padding-left: 1.2rem; }
li + li { margin-top: 0.25rem; }
@media print {
  body { background: #fff; }
  .report { border: none; box-shadow: none; border-radius: 0; max-width: none; }
  .report-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
@media (max-width: 720px) {
  .kpi-row, .risk-grid, .alt-grid { grid-template-columns: 1fr; }
}
`;

function resolvePdfInsightSections(data) {
  if (data.pdfInsight && data.pdfInsight.executiveSummary) return data.pdfInsight;
  const input = normalizeInsightInput({
    vertical: data.category,
    answers: data.profile || {},
    scores: {
      decision: data.decisionScore,
      confidence: data.confidenceScore,
      overallRisk: data.overallRisk,
      scoreLabel: data.scoreLabel,
      factors: data.scoreFactors
    },
    costs: data.totalCost,
    risks: data.riskAnalysis,
    strengths: data.strengths,
    weaknesses: data.weaknesses || data.cautions,
    alternatives: data.alternatives,
    recommendation: {
      level: data.recommendationLevel,
      label: data.recommendationLabel
    },
    planTier: data.planTier || 'pro',
    locale: 'tr-TR'
  });
  return buildPdfInsight(input);
}

/**
 * @param {object} [pdfReportData]
 */
export function buildReportHtml(pdfReportData = {}) {
  const data = pdfReportData && typeof pdfReportData === 'object' ? pdfReportData : {};
  const category = String(data.category || 'karar').toLowerCase();
  const label = categoryLabel(category);
  const pdfInsight = resolvePdfInsightSections(data);
  const executiveText =
    sanitizeReportText(data.executiveSummary || pdfInsight.executiveSummary || '');
  const cost = data.totalCost && typeof data.totalCost === 'object' ? data.totalCost : {};
  const estimateNote = cost.isEstimate
    ? sanitizeReportText(cost.estimateNote || 'Bazı tutarlar tahmini model ile hesaplanmıştır; güncel teklif ile doğrulanmalıdır.')
    : '';

  const weaknesses =
    Array.isArray(data.weaknesses) && data.weaknesses.length ?
      data.weaknesses
    : Array.isArray(data.cautions) ? data.cautions : [];

  const title = `isteBul ${label} Karar Raporu`;
  const filename = createReportFilename(category, data.generatedAt);

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${sanitizeReportText(title)}</title>
  <style>${REPORT_STYLES}</style>
</head>
<body>
  <div class="report" data-report-category="${sanitizeReportText(category)}" data-report-filename="${sanitizeReportText(filename)}">
    <header class="report-header">
      <div class="brand-row">
        <div class="brand">
          isteBul
          <small>AI destekli karar analizi</small>
        </div>
        <div class="report-meta">
          <div><strong>${sanitizeReportText(label)}</strong> karar raporu</div>
          <div>${sanitizeReportText(formatReportDate(data.generatedAt))}</div>
        </div>
      </div>
    </header>
    <main class="report-body">
      ${estimateNote ? `<p class="note-banner"><strong>Veri notu:</strong> ${estimateNote}</p>` : ''}

      <section aria-label="Özet skorlar">
        <h2>Özet Skorlar</h2>
        <div class="kpi-row">
          <div class="kpi">
            <span>Karar Skoru</span>
            <strong>${sanitizeReportText(formatReportScore(data.decisionScore, data.scoreLabel))}</strong>
          </div>
          <div class="kpi">
            <span>Güven Skoru</span>
            <strong>${sanitizeReportText(formatReportScore(data.confidenceScore))}</strong>
          </div>
          <div class="kpi">
            <span>Genel Risk</span>
            <strong>${sanitizeReportText(data.overallRisk || '—')}</strong>
          </div>
        </div>
      </section>

      <section aria-label="Yönetici özeti">
        <h2>Yönetici özeti</h2>
        <div class="exec">
          <p>${executiveText || 'Özet henüz oluşturulmadı.'}</p>
        </div>
      </section>

      <section aria-label="Karar gerekçeleri">
        <h2>Karar gerekçeleri</h2>
        ${listHtml(pdfInsight.decisionReasons, true)}
      </section>

      <section aria-label="Risk ve uyarılar">
        <h2>Risk ve uyarılar</h2>
        ${listHtml(pdfInsight.riskWarnings)}
      </section>

      <section aria-label="Önerilen aksiyonlar">
        <h2>Önerilen aksiyonlar</h2>
        ${listHtml(pdfInsight.actions, true)}
      </section>

      <section aria-label="Maliyet yorumu">
        <h2>Maliyet yorumu</h2>
        <div class="exec">
          <p>${sanitizeReportText(pdfInsight.costCommentary || '—')}</p>
        </div>
      </section>

      <section aria-label="Risk Analizi">
        <h2>Risk Analizi</h2>
        ${risksHtml(data.riskAnalysis)}
      </section>

      <section aria-label="Toplam Maliyet">
        <h2>Toplam Maliyet</h2>
        ${costRowsHtml(buildCostRows(data))}
      </section>

      <section aria-label="Güçlü Yönler">
        <h2>Güçlü Yönler</h2>
        ${listHtml(data.strengths)}
      </section>

      <section aria-label="Zayıf Yönler">
        <h2>Zayıf Yönler</h2>
        ${listHtml(weaknesses)}
      </section>

      <section aria-label="Alternatifler">
        <h2>Alternatifler</h2>
        ${alternativesHtml(data.alternatives)}
      </section>

      <section aria-label="Sonraki Adımlar">
        <h2>Sonraki Adımlar</h2>
        ${listHtml(data.nextSteps, true)}
      </section>

      <p class="disclaimer">${sanitizeReportText(DISCLAIMER)}</p>
    </main>
  </div>
  <script>
    (function () {
      try {
        var fn = ${JSON.stringify(filename)};
        document.title = fn.replace(/\\.pdf$/i, '');
      } catch (e) {}
    })();
  </script>
</body>
</html>`;
}

/**
 * Opens branded report and triggers print dialog (Save as PDF in browser).
 * @param {object} [pdfReportData]
 * @param {{onComplete?:()=>void}} [options]
 * @returns {{ok:boolean, method:string, filename:string}}
 */
export function downloadDecisionReport(pdfReportData = {}, options = {}) {
  const data = pdfReportData && typeof pdfReportData === 'object' ? pdfReportData : {};
  const filename = createReportFilename(data.category, data.generatedAt);
  const html = buildReportHtml(data);

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { ok: false, method: 'no-window', filename };
  }

  try {
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      const trigger = () => {
        try {
          win.focus();
          win.print();
        } catch {
          /* ignore */
        }
        options.onComplete?.();
      };
      setTimeout(trigger, 400);
      try {
        const userId =
          data.userId ||
          (typeof window !== 'undefined' ? window.app?.currentUser?.id : null) ||
          null;
        recordPdfReportHistory({ ...data, filename }, userId);
      } catch {
        /* PDF geçmişi kaydı dashboard'u kırmamalı */
      }
      return { ok: true, method: 'print-dialog', filename };
    }
  } catch {
    /* fallback below */
  }

  try {
    const frame = document.createElement('iframe');
    frame.setAttribute('title', filename.replace(/\.pdf$/i, ''));
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    const doc = frame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } catch {
          /* ignore */
        } finally {
          setTimeout(() => frame.remove(), 800);
        }
        options.onComplete?.();
      }, 350);
      return { ok: true, method: 'iframe-print', filename };
    }
    frame.remove();
  } catch {
    /* ignore */
  }

  return { ok: false, method: 'failed', filename };
}
