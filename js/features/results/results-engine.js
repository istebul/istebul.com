/**
 * Shared Results Engine V1 — standardizes scores, risks, PDF payload, print, tracking.
 * Category modules keep domain-specific calculation logic.
 */
import { escapeHtml } from '../../core/security.js';

const SCORE_LABELS = {
  auto: {
    high: 'Çok uygun',
    good: 'Uygun',
    mid: 'Dikkatli değerlendir',
    low: 'Riskli seçim'
  },
  konut: {
    high: 'Çok uygun',
    good: 'Uygun',
    mid: 'Dikkatli değerlendir',
    low: 'Riskli karar'
  },
  tatil: {
    high: 'Çok uygun',
    good: 'Uygun',
    mid: 'Dikkatli değerlendir',
    low: 'Riskli tatil planı'
  },
  finansman: {
    high: 'Çok uygun',
    good: 'Uygun',
    mid: 'Dikkatli değerlendir',
    low: 'Riskli finansman'
  }
};

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isFieldPresent(input, field) {
  const raw = input?.[field];
  if (raw == null) return false;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0;
  if (typeof raw === 'boolean') return raw;
  if (Array.isArray(raw)) return raw.length > 0;
  return String(raw).trim().length > 0;
}

/**
 * 0–100 aralığına normalize eder.
 * @param {number} value
 */
export function clampScore(value) {
  const n = safeNumber(value);
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Premium score display — never emit raw JS floats (e.g. 40.199999999999996).
 * @param {unknown} value
 * @param {number} [digits=1] max decimal places when not an integer
 * @returns {string}
 */
export function formatScore(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const clamped = Math.min(100, Math.max(0, n));
  const places = Math.max(0, Math.min(2, Number(digits) || 0));
  const factor = 10 ** places;
  const rounded = Math.round(clamped * factor) / factor;
  const asInt = Math.round(rounded);
  if (Math.abs(rounded - asInt) < 1e-9) {
    return String(asInt);
  }
  let s = rounded.toFixed(places);
  if (places > 0) {
    s = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }
  return s;
}

/**
 * @param {unknown} value
 * @param {number} [digits]
 */
export function formatScoreOutOf100(value, digits = 1) {
  const core = formatScore(value, digits);
  return core === '—' ? '—' : `${core}/100`;
}

/**
 * @param {number} score
 * @param {'auto'|'konut'|'tatil'|'finansman'} type
 */
export function resolveScoreLabel(score, type) {
  const s = clampScore(score);
  const labels = SCORE_LABELS[type] || SCORE_LABELS.konut;
  if (s >= 85) return labels.high;
  if (s >= 70) return labels.good;
  if (s >= 55) return labels.mid;
  return labels.low;
}

/**
 * @param {object} input
 * @param {Array<string|{field?:string,weight?:number,ok?:boolean,test?:(input:object)=>boolean}>} requiredFields
 * @param {{minScore?:number,maxScore?:number,baseScore?:number,scoreRange?:number}} [options]
 */
export function buildConfidenceScore(input = {}, requiredFields = [], options = {}) {
  const { minScore = 32, maxScore = 98, baseScore = 52, scoreRange = 46 } = options;

  let max = 0;
  let got = 0;

  for (const field of requiredFields) {
    if (typeof field === 'string') {
      const weight = 1;
      max += weight;
      if (isFieldPresent(input, field)) got += weight;
      continue;
    }

    if (!field || typeof field !== 'object') continue;

    const weight = field.weight ?? 1;
    max += weight;

    let ok = false;
    if (typeof field.test === 'function') {
      ok = Boolean(field.test(input));
    } else if (field.ok !== undefined) {
      ok = Boolean(field.ok);
    } else if (field.field) {
      ok = isFieldPresent(input, field.field);
    }

    if (ok) got += weight;
  }

  const ratio = max > 0 ? got / max : 0;
  const raw = Math.round(baseScore + ratio * scoreRange);
  return Math.min(maxScore, Math.max(minScore, raw));
}

/**
 * @param {string} value
 * @param {{locale?:'tr'|'en'}} [options]
 * @returns {'düşük'|'orta'|'yüksek'|'low'|'medium'|'high'}
 */
export function normalizeRiskLevel(value, options = {}) {
  const { locale = 'tr' } = options;
  const raw = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');

  let tr = 'orta';
  if (/high|yuksek|yüksek/.test(raw)) tr = 'yüksek';
  else if (/low|dusuk|düşük/.test(raw)) tr = 'düşük';

  if (locale === 'en') {
    if (tr === 'yüksek') return 'high';
    if (tr === 'düşük') return 'low';
    return 'medium';
  }

  return tr === 'yüksek' ? 'yüksek' : tr === 'düşük' ? 'düşük' : 'orta';
}

/**
 * CSS tone: low | mid | high
 * @param {string} level
 */
export function riskLevelToTone(level) {
  const n = normalizeRiskLevel(level, { locale: 'tr' });
  if (n === 'yüksek') return 'high';
  if (n === 'düşük') return 'low';
  return 'mid';
}

/**
 * @param {string} key
 * @param {string} level
 * @param {string} title
 * @param {string} description
 * @param {string} recommendation
 */
export function buildRiskItem(key, level, title, description, recommendation) {
  return {
    key,
    title,
    level: normalizeRiskLevel(level, { locale: 'tr' }),
    description,
    recommendation
  };
}

/**
 * @param {object} payload
 */
export function buildPdfReportData(payload = {}) {
  const category = payload.category || 'unknown';
  const decisionScore = clampScore(payload.decisionScore);
  const confidenceScore = clampScore(payload.confidenceScore);

  const base = {
    category,
    generatedAt: payload.generatedAt || new Date().toISOString(),
    decisionScore,
    scoreLabel: payload.scoreLabel || resolveScoreLabel(decisionScore, category),
    confidenceScore,
    overallRisk: payload.overallRisk || 'Orta',
    totalCost: payload.totalCost || {},
    riskAnalysis: Array.isArray(payload.riskAnalysis) ? payload.riskAnalysis : [],
    strengths: Array.isArray(payload.strengths) ? payload.strengths : [],
    weaknesses: Array.isArray(payload.weaknesses)
      ? payload.weaknesses
      : Array.isArray(payload.cautions)
        ? payload.cautions
        : [],
    alternatives: Array.isArray(payload.alternatives) ? payload.alternatives : [],
    nextSteps: Array.isArray(payload.nextSteps) ? payload.nextSteps : [],
    executiveSummary: String(payload.executiveSummary || ''),
    profile: payload.profile && typeof payload.profile === 'object' ? payload.profile : {}
  };

  const { category: _c, generatedAt: _g, ...rest } = payload;
  return { ...base, ...rest };
}

/**
 * @param {Function} [track]
 * @param {string} eventName
 * @param {object} [eventPayload]
 */
export function safeTrackEvent(track, eventName, eventPayload = {}) {
  try {
    if (typeof track === 'function') {
      track(eventName, eventPayload);
    }
  } catch {
    /* analytics must not break UX */
  }
}

/**
 * @param {string} html
 * @param {string} [frameTitle]
 */
export function printHtmlInIframe(html, frameTitle = 'Karar raporu') {
  const frame = document.createElement('iframe');
  frame.setAttribute('title', frameTitle);
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) {
    frame.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  frame.contentWindow?.focus();
  setTimeout(() => {
    try {
      frame.contentWindow?.print();
    } catch {
      /* ignore print errors */
    } finally {
      setTimeout(() => {
        try {
          frame.remove();
        } catch {
          /* ignore */
        }
      }, 800);
    }
  }, 250);
  return true;
}

function buildDefaultPrintHtml(pdfReportData) {
  const esc = escapeHtml;
  const data = pdfReportData || {};
  const category = String(data.category || 'karar');
  const titleMap = {
    auto: 'Auto',
    konut: 'Konut',
    tatil: 'Tatil',
    finansman: 'Finansman'
  };
  const label = titleMap[category] || category;

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>isteBul ${esc(label)} Karar Raporu</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;color:#0f172a;line-height:1.55}@media print{body{margin:12mm}}</style>
</head><body>
<h1>isteBul — ${esc(label)} Karar Raporu</h1>
<p>${esc(new Date(data.generatedAt || Date.now()).toLocaleString('tr-TR'))}</p>
<p><strong>Karar:</strong> ${esc(String(data.decisionScore))}/100 (${esc(data.scoreLabel || '')})</p>
<p><strong>Güven:</strong> ${esc(String(data.confidenceScore))}/100 · <strong>Risk:</strong> ${esc(data.overallRisk || '')}</p>
<h2>AI Executive Summary</h2>
<p>${esc(data.executiveSummary || '')}</p>
<h2>Sonraki adımlar</h2>
<ol>${(data.nextSteps || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
</body></html>`;
}

/**
 * @param {object} pdfReportData
 * @param {{buildHtml?:(data:object)=>string,frameTitle?:string,fallbackWindowPrint?:boolean}} [options]
 * @returns {() => void}
 */
export function buildPrintReportHandler(pdfReportData, options = {}) {
  const { buildHtml, frameTitle, fallbackWindowPrint = true } = options;

  return () => {
    try {
      const html =
        typeof buildHtml === 'function' ? buildHtml(pdfReportData) : buildDefaultPrintHtml(pdfReportData);
      const title =
        frameTitle ||
        `${pdfReportData?.category ? String(pdfReportData.category) : 'Karar'} karar raporu`;
      const ok = printHtmlInIframe(html, title);
      if (!ok && fallbackWindowPrint) {
        try {
          window.print();
        } catch {
          /* ignore */
        }
      }
    } catch {
      if (fallbackWindowPrint) {
        try {
          window.print();
        } catch {
          /* ignore */
        }
      }
    }
  };
}
