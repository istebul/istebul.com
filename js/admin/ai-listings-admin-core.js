/**
 * isteBul AI Listings — internal admin test panel utilities.
 *
 * INTERNAL TEST ONLY — not linked from public navigation.
 * Panel is hidden unless localStorage istebul_ai_listings_admin === "on".
 *
 * approved means internally approved only; public publishing remains disabled.
 */

import { escapeHtml } from '../core/dom-safe.js';
import { isHttpOrHttpsUrl } from '../../supabase/functions/_shared/ai-listings/validation.js';
import {
  STATUS_FILTER_CHIPS,
  QA_ACTIONS,
  normalizeStatusFilter,
  resolveStatusTransition,
  isListingPubliclyVisible
} from '../../supabase/functions/_shared/ai-listings/status-workflow.js';
import {
  buildQualityChecklist,
  countChecklistPassed
} from '../../supabase/functions/_shared/ai-listings/quality-checklist.js';
import {
  buildImportPreview,
  measureImportContentBytes,
  IMPORT_MAX_CONTENT_BYTES,
  IMPORT_MAX_ROWS
} from '../../supabase/functions/_shared/ai-listings/import-parser.js';

export { STATUS_FILTER_CHIPS, isListingPubliclyVisible, IMPORT_MAX_ROWS, IMPORT_MAX_CONTENT_BYTES };

/** @type {Readonly<Record<string, string>>} */
export const STATUS_LABELS_TR = Object.freeze({
  draft: 'Taslak',
  pending_review: 'İncelemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  archived: 'Arşivlendi'
});

/** @type {Readonly<Record<string, string>>} */
export const CATEGORY_LABELS_TR = Object.freeze({
  vehicle: 'Araç',
  housing: 'Konut',
  real_estate: 'Konut',
  vacation: 'Tatil'
});

export const STATUS_FILTER_CHIPS_TR = Object.freeze([
  { value: '', label: 'Tümü' },
  { value: 'draft', label: 'Taslak' },
  { value: 'pending_review', label: 'İncelemede' },
  { value: 'approved', label: 'Onaylandı' },
  { value: 'rejected', label: 'Reddedildi' },
  { value: 'archived', label: 'Arşivlendi' }
]);

export const ADMIN_ENABLE_KEY = 'istebul_ai_listings_admin';
export const ADMIN_SECRET_KEY = 'istebul_ai_listings_secret';
export const EDGE_SECRET_HEADER = 'x-ai-listings-secret';

/**
 * @typedef {'disabled'|'no-secret'|'ready'} AdminPanelState
 */

/**
 * @param {{ getItem?: (key: string) => string|null }|null|undefined} storage
 * @returns {boolean}
 */
export function isAdminPanelEnabled(storage) {
  try {
    return storage?.getItem?.(ADMIN_ENABLE_KEY) === 'on';
  } catch {
    return false;
  }
}

/**
 * @param {{ getItem?: (key: string) => string|null }|null|undefined} storage
 * @returns {string}
 */
export function getEdgeSecret(storage) {
  try {
    return String(storage?.getItem?.(ADMIN_SECRET_KEY) ?? '').trim();
  } catch {
    return '';
  }
}

/**
 * @param {{ getItem?: (key: string) => string|null }|null|undefined} storage
 * @returns {AdminPanelState}
 */
export function getAdminPanelState(storage) {
  if (!isAdminPanelEnabled(storage)) return 'disabled';
  if (!getEdgeSecret(storage)) return 'no-secret';
  return 'ready';
}

/**
 * @param {Record<string, unknown>} [env]
 * @returns {string}
 */
export function getSupabaseAnonKey(env = {}) {
  return String(env.SUPABASE_ANON_KEY ?? '').trim();
}

/**
 * @param {{ secret?: string, anonKey?: string, hasBody?: boolean }} [options]
 * @returns {Record<string, string>}
 */
export function buildEdgeRequestHeaders({ secret, anonKey, hasBody = false } = {}) {
  const headers = { Accept: 'application/json' };

  const trimmedAnonKey = String(anonKey ?? '').trim();
  if (trimmedAnonKey) {
    headers.Authorization = `Bearer ${trimmedAnonKey}`;
    headers.apikey = trimmedAnonKey;
  }

  const trimmedSecret = String(secret ?? '').trim();
  if (trimmedSecret) headers[EDGE_SECRET_HEADER] = trimmedSecret;

  if (hasBody) headers['Content-Type'] = 'application/json';

  return headers;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function validateSourceUrl(value) {
  if (value === undefined || value === null || !String(value).trim()) return true;
  return isHttpOrHttpsUrl(value);
}

/**
 * @param {string} text
 * @returns {{ ok: true, value: Record<string, unknown> } | { ok: false, message: string }}
 */
export function validateAttributesJson(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return { ok: true, value: {} };

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, message: 'Geçersiz JSON' };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, message: 'Geçersiz JSON' };
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function safeRenderText(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {unknown} status
 * @returns {string}
 */
export function getStatusLabelTr(status) {
  const key = String(status ?? 'draft').trim();
  return STATUS_LABELS_TR[key] ?? key;
}

/**
 * @param {unknown} category
 * @returns {string}
 */
export function getCategoryLabelTr(category) {
  const key = String(category ?? '').trim().toLowerCase();
  if (!key) return '—';
  return CATEGORY_LABELS_TR[key] ?? String(category ?? '—');
}

/**
 * @param {Record<string, unknown>} [env]
 * @returns {string}
 */
export function resolveEdgeBaseUrl(env = {}) {
  const url = String(env.SUPABASE_URL ?? '').replace(/\/$/, '');
  if (!url) return '';
  return `${url}/functions/v1/ai-listings`;
}

/**
 * @param {Response} response
 * @param {unknown} body
 * @returns {{ ok: boolean, message: string, status: number, data?: unknown }}
 */
/**
 * @param {Record<string, unknown>|null|undefined} analysis
 * @returns {string}
 */
export function formatAnalysisDate(analysis) {
  const raw = analysis?.created_at;
  if (!raw) return '—';
  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {Record<string, unknown>|null}
 */
export function extractLatestAnalysis(listing) {
  const nested = listing.latest_analysis;
  if (nested && typeof nested === 'object') return /** @type {Record<string, unknown>} */ (nested);
  return null;
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {string}
 */
export function buildListingBadgesHtml(listing) {
  const category = safeRenderText(getCategoryLabelTr(listing.category));
  const analysis = extractLatestAnalysis(listing);
  const aiScore = analysis?.ai_score;
  const riskScore = analysis?.risk_score;
  const analysisDate = formatAnalysisDate(analysis);
  const status = safeRenderText(getStatusLabelTr(listing.status ?? 'draft'));
  const sourceType = safeRenderText(listing.source_type ?? '—');

  const aiBadge =
    aiScore !== undefined && aiScore !== null
      ? `<span class="ai-listings-admin__badge ai-listings-admin__badge--ai">AI Skoru ${safeRenderText(aiScore)}</span>`
      : '';
  const riskBadge =
    riskScore !== undefined && riskScore !== null
      ? `<span class="ai-listings-admin__badge ai-listings-admin__badge--risk">Risk ${safeRenderText(riskScore)}</span>`
      : '';
  const dateBadge =
    analysis && analysisDate !== '—'
      ? `<span class="ai-listings-admin__badge ai-listings-admin__badge--date">${safeRenderText(analysisDate)}</span>`
      : '';

  return `
    <span class="ai-listings-admin__badge ai-listings-admin__badge--category">${category}</span>
    <span class="ai-listings-admin__badge ai-listings-admin__badge--status">${status}</span>
    ${aiBadge}
    ${riskBadge}
    ${dateBadge}
    <span class="ai-listings-admin__badge ai-listings-admin__badge--source">${sourceType}</span>`;
}

/**
 * @param {string} activeValue
 * @returns {string}
 */
export function buildStatusFilterChipsHtml(activeValue = '') {
  const active = normalizeStatusFilter(activeValue);
  return STATUS_FILTER_CHIPS_TR.map((chip) => {
    const isActive = chip.value === active;
    const valueAttr = chip.value ? ` data-status-filter="${safeRenderText(chip.value)}"` : ' data-status-filter=""';
    const activeClass = isActive ? ' ai-listings-admin__chip--active' : '';
    return `<button type="button" class="ai-listings-admin__chip${activeClass}"${valueAttr}>${safeRenderText(chip.label)}</button>`;
  }).join('');
}

/**
 * @param {unknown} chipValue
 * @returns {string}
 */
export function resolveActiveStatusFilter(chipValue) {
  return normalizeStatusFilter(chipValue);
}

/** @type {ReadonlyArray<{ action: string, label: string, variant?: string, icon?: string }>} */
const QA_ACTION_BUTTONS = Object.freeze([
  { action: QA_ACTIONS.REANALYZE, label: 'Yeniden Analiz Et', icon: '🔄' },
  { action: QA_ACTIONS.APPROVE, label: 'Onayla', variant: 'success', icon: '✅' },
  { action: QA_ACTIONS.SUBMIT_REVIEW, label: 'İncelemeye Gönder', icon: '🟡' },
  { action: QA_ACTIONS.REJECT, label: 'Reddet', variant: 'warn', icon: '❌' },
  { action: QA_ACTIONS.ARCHIVE, label: 'Arşivle', variant: 'warn', icon: '🗄' }
]);

/** @type {ReadonlyArray<{ action: string, label: string, icon: string }>} */
const PREMIUM_EXTRA_ACTIONS = Object.freeze([
  { action: 'pdf', label: 'PDF Oluştur', icon: '📄' }
]);

/**
 * @param {string} status
 * @returns {string[]}
 */
export function getAvailableQaActions(status) {
  return QA_ACTION_BUTTONS.filter((btn) => resolveStatusTransition(status, btn.action).ok).map(
    (btn) => btn.action
  );
}

/**
 * @param {string} status
 * @returns {string}
 */
export function buildQaActionsHtml(status) {
  const available = new Set(getAvailableQaActions(status));
  const buttons = QA_ACTION_BUTTONS.filter((btn) => available.has(btn.action))
    .map((btn) => {
      const variant = btn.variant ? ` ai-listings-admin__btn--${btn.variant}` : '';
      return `<button type="button" class="ai-listings-admin__btn${variant}" data-qa-action="${safeRenderText(btn.action)}">${safeRenderText(btn.label)}</button>`;
    })
    .join('');

  return buttons || '<p class="ai-listings-admin__muted">Bu durum için işlem yok.</p>';
}

/**
 * @typedef {{ type: string, label: string, emoji: string, cssClass: string }} AiDecision
 */

/**
 * @param {Record<string, unknown>|null|undefined} analysis
 * @returns {AiDecision}
 */
export function getAiDecision(analysis) {
  const aiScore = Number(analysis?.ai_score);
  const riskScore = Number(analysis?.risk_score);

  if (!Number.isFinite(aiScore)) {
    return { type: 'unknown', label: 'Analiz Bekleniyor', emoji: '⚪', cssClass: 'ai-listings-admin__decision--unknown' };
  }

  if (aiScore >= 80 && riskScore <= 30) {
    return { type: 'buyable', label: 'Satın Alınabilir', emoji: '🟢', cssClass: 'ai-listings-admin__decision--buyable' };
  }
  if (aiScore >= 60 && riskScore <= 50) {
    return { type: 'review', label: 'İncelenmesi Önerilir', emoji: '🟡', cssClass: 'ai-listings-admin__decision--review' };
  }
  if (aiScore < 40 || riskScore > 70) {
    return { type: 'not_recommended', label: 'Önerilmez', emoji: '🔴', cssClass: 'ai-listings-admin__decision--not-recommended' };
  }
  return { type: 'risky', label: 'Riskli', emoji: '🟠', cssClass: 'ai-listings-admin__decision--risky' };
}

/**
 * @param {unknown} score
 * @returns {string}
 */
export function buildStarsHtml(score) {
  const value = Number(score);
  const emptyStars = Array.from({ length: 5 }, () => '<span class="ai-listings-admin__star ai-listings-admin__star--empty" aria-hidden="true">★</span>').join('');
  if (!Number.isFinite(value)) {
    return `<span class="ai-listings-admin__stars" aria-label="Skor yok">${emptyStars}</span>`;
  }
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * 5);
  const stars = Array.from({ length: 5 }, (_, i) => {
    const cls = i < filled ? 'ai-listings-admin__star ai-listings-admin__star--filled' : 'ai-listings-admin__star ai-listings-admin__star--empty';
    return `<span class="${cls}" aria-hidden="true">★</span>`;
  }).join('');
  return `<span class="ai-listings-admin__stars" aria-label="${filled} / 5 yıldız">${stars}</span>`;
}

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>|null|undefined} analysis
 * @returns {string}
 */
export function buildHeroDecisionCardHtml(listing, analysis) {
  const title = safeRenderText(listing.title ?? '—');
  const decision = getAiDecision(analysis);
  const aiScore = Number(analysis?.ai_score);
  const scoreDisplay = Number.isFinite(aiScore) ? Math.round(aiScore) : '—';

  return `
    <section class="ai-listings-admin__hero ${decision.cssClass}" aria-label="AI Karar Kartı">
      <div class="ai-listings-admin__hero-content">
        <p class="ai-listings-admin__hero-kicker">AI Karar Paneli</p>
        <h3 class="ai-listings-admin__hero-title">${title}</h3>
        <div class="ai-listings-admin__hero-decision">
          <span class="ai-listings-admin__hero-emoji" aria-hidden="true">${decision.emoji}</span>
          <span class="ai-listings-admin__hero-decision-label">${safeRenderText(decision.label)}</span>
        </div>
        <div class="ai-listings-admin__hero-score">
          <span class="ai-listings-admin__hero-score-label">AI Karar Skoru</span>
          <span class="ai-listings-admin__hero-score-value">${safeRenderText(scoreDisplay)}<small>/100</small></span>
          ${buildStarsHtml(analysis?.ai_score)}
        </div>
      </div>
    </section>`;
}

/** @type {ReadonlyArray<{ key: string, icon: string, label: string, scoreKey: string, badgeFn: (v: number) => string }>} */
const SCORE_CARD_CONFIG = Object.freeze([
  { key: 'ai', icon: '🤖', label: 'AI Skoru', scoreKey: 'ai_score', badgeFn: getScoreInterpretationTr },
  { key: 'risk', icon: '⚠', label: 'Risk', scoreKey: 'risk_score', badgeFn: getRiskInterpretationTr },
  { key: 'market', icon: '📈', label: 'Piyasa', scoreKey: 'market_score', badgeFn: getScoreInterpretationTr },
  { key: 'price', icon: '💰', label: 'Fiyat', scoreKey: 'price_score', badgeFn: getScoreInterpretationTr },
  { key: 'confidence', icon: '🔒', label: 'Güven', scoreKey: 'confidence', badgeFn: (v) => getScoreInterpretationTr(v <= 1 ? v * 100 : v) }
]);

/**
 * @param {Record<string, unknown>|null|undefined} analysis
 * @returns {string}
 */
export function buildScoreCardsHtml(analysis) {
  if (!analysis) {
    return `<p class="ai-listings-admin__muted">${ANALYSIS_EMPTY_MESSAGE}</p>`;
  }

  const cards = SCORE_CARD_CONFIG.map((cfg) => {
    let raw = analysis[cfg.scoreKey];
    if (cfg.key === 'confidence') {
      const normalized = normalizeConfidenceScore(raw);
      raw = normalized !== undefined ? Math.round(normalized) : undefined;
    }
    const value = formatScoreValue(raw);
    if (value === undefined) return '';

    const numVal = Number(value);
    const badge = Number.isFinite(numVal) ? cfg.badgeFn(numVal) : '—';
    const badgeClass = cfg.key === 'risk'
      ? (numVal <= 30 ? 'ai-listings-admin__score-badge--good' : numVal <= 60 ? 'ai-listings-admin__score-badge--warn' : 'ai-listings-admin__score-badge--bad')
      : (numVal >= 70 ? 'ai-listings-admin__score-badge--good' : numVal >= 40 ? 'ai-listings-admin__score-badge--warn' : 'ai-listings-admin__score-badge--bad');

    return `
      <article class="ai-listings-admin__score-card ai-listings-admin__score-card--${cfg.key}" aria-label="${safeRenderText(cfg.label)}">
        <span class="ai-listings-admin__score-card-icon" aria-hidden="true">${cfg.icon}</span>
        <span class="ai-listings-admin__score-card-value">${safeRenderText(value)}</span>
        <span class="ai-listings-admin__score-card-label">${safeRenderText(cfg.label)}</span>
        <span class="ai-listings-admin__score-badge ${badgeClass}">${safeRenderText(badge)}</span>
      </article>`;
  }).filter(Boolean);

  if (!cards.length) {
    return `<p class="ai-listings-admin__muted">${ANALYSIS_EMPTY_MESSAGE}</p>`;
  }

  return `<div class="ai-listings-admin__score-cards" role="list">${cards.join('')}</div>`;
}

/**
 * @param {Record<string, unknown>|null|undefined} analysis
 * @returns {string}
 */
export function buildExecutiveSummaryHtml(analysis) {
  if (!analysis) {
    return `<p class="ai-listings-admin__muted">${ANALYSIS_EMPTY_MESSAGE}</p>`;
  }

  const existing = String(analysis.summary ?? '').trim();
  if (existing) {
    const sentences = existing.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 5);
    return `<p class="ai-listings-admin__executive-summary">${sentences.map((s) => safeRenderText(s)).join(' ')}</p>`;
  }

  const parts = [];
  const aiScore = Number(analysis.ai_score);
  const priceScore = Number(analysis.price_score);
  const marketScore = Number(analysis.market_score);
  const riskScore = Number(analysis.risk_score);

  if (Number.isFinite(marketScore)) {
    parts.push(
      marketScore >= 70
        ? 'Bu ilan mevcut verilere göre piyasa ortalamasının üzerindedir.'
        : marketScore >= 50
          ? 'Bu ilan mevcut verilere göre piyasa ortalamasına yakındır.'
          : 'Bu ilan piyasa ortalamasının altında değerlendirilmektedir.'
    );
  }
  if (Number.isFinite(priceScore) && priceScore >= 65) {
    parts.push('Fiyat seviyesi kabul edilebilir görünmektedir.');
  } else if (Number.isFinite(priceScore)) {
    parts.push('Fiyat seviyesi dikkatle incelenmelidir.');
  }
  if (Number.isFinite(aiScore) && aiScore >= 70) {
    parts.push('Genel veri kalitesi yeterli düzeydedir.');
  }
  if (Number.isFinite(riskScore) && riskScore > 50) {
    parts.push('Ekspertiz önerilir.');
  } else if (parts.length < 3) {
    parts.push('Detaylı inceleme yapılması önerilir.');
  }

  const summary = parts.slice(0, 5).join(' ');
  return summary
    ? `<p class="ai-listings-admin__executive-summary">${safeRenderText(summary)}</p>`
    : `<p class="ai-listings-admin__muted">Özet oluşturulamadı.</p>`;
}

/**
 * @param {Record<string, unknown>|null|undefined} analysis
 * @returns {string}
 */
export function buildStrengthsCardHtml(analysis) {
  const items = Array.isArray(analysis?.pros) ? analysis.pros : [];
  const content = buildStringListHtml(items, 'Güçlü yön bulunamadı.');
  return `
    <article class="ai-listings-admin__insight-card ai-listings-admin__insight-card--strengths">
      <h4 class="ai-listings-admin__insight-title"><span aria-hidden="true">✅</span> Güçlü Yönler</h4>
      ${content}
    </article>`;
}

/**
 * @param {Record<string, unknown>|null|undefined} analysis
 * @returns {string}
 */
export function buildRisksCardHtml(analysis) {
  const items = Array.isArray(analysis?.cons) ? analysis.cons : [];
  const content = buildStringListHtml(items, 'Risk bulunamadı.');
  return `
    <article class="ai-listings-admin__insight-card ai-listings-admin__insight-card--risks">
      <h4 class="ai-listings-admin__insight-title"><span aria-hidden="true">⚠</span> Riskler</h4>
      ${content}
    </article>`;
}

/**
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
function formatCurrency(amount, currency = 'TRY') {
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString('tr-TR')} ${currency}`;
  }
}

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>|null|undefined} analysis
 * @returns {string}
 */
export function buildMarketAnalysisHtml(listing, analysis) {
  const price = Number(listing.price);
  const priceScore = Number(analysis?.price_score);
  const currency = String(listing.currency ?? 'TRY');

  if (!Number.isFinite(price) || !Number.isFinite(priceScore) || priceScore <= 0) {
    return `<p class="ai-listings-admin__muted">Piyasa karşılaştırması için yeterli veri yok.</p>`;
  }

  const marketAvg = Math.round(price / (priceScore / 100));
  const diff = price - marketAvg;
  const pct = marketAvg > 0 ? ((diff / marketAvg) * 100) : 0;
  const isAdvantage = diff < 0;
  const diffClass = isAdvantage ? 'ai-listings-admin__market-diff--good' : diff > 0 ? 'ai-listings-admin__market-diff--bad' : 'ai-listings-admin__market-diff--neutral';
  const pctLabel = isAdvantage
    ? `%${Math.abs(pct).toFixed(1)} avantaj`
    : diff > 0
      ? `%${Math.abs(pct).toFixed(1)} dezavantaj`
      : 'Eşit';

  return `
    <article class="ai-listings-admin__market-card" aria-label="Piyasa Analizi">
      <div class="ai-listings-admin__market-row">
        <span class="ai-listings-admin__market-label">Benzer ilan ortalaması</span>
        <span class="ai-listings-admin__market-value">${safeRenderText(formatCurrency(marketAvg, currency))}</span>
      </div>
      <div class="ai-listings-admin__market-row">
        <span class="ai-listings-admin__market-label">Bu ilan</span>
        <span class="ai-listings-admin__market-value ai-listings-admin__market-value--highlight">${safeRenderText(formatCurrency(price, currency))}</span>
      </div>
      <div class="ai-listings-admin__market-row">
        <span class="ai-listings-admin__market-label">Fark</span>
        <span class="ai-listings-admin__market-value ${diffClass}">${safeRenderText(formatCurrency(Math.abs(diff), currency))}</span>
      </div>
      <div class="ai-listings-admin__market-advantage ${diffClass}">
        ${safeRenderText(pctLabel)}
      </div>
    </article>`;
}

/** @type {ReadonlyArray<{ key: string, label: string }>} */
const PREMIUM_CHECKLIST_ITEMS = Object.freeze([
  { key: 'has_title', label: 'Başlık' },
  { key: 'has_description', label: 'Açıklama' },
  { key: 'has_price', label: 'Fiyat' },
  { key: 'has_attributes', label: 'Özellik' },
  { key: 'has_analysis', label: 'Analiz' },
  { key: 'has_images', label: 'Görsel' },
  { key: 'has_location', label: 'Konum' }
]);

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>|null|undefined} latestAnalysis
 * @returns {string}
 */
export function buildDataQualityHtml(listing, latestAnalysis = null) {
  const checklist = buildQualityChecklist(listing, latestAnalysis);
  const passed = countChecklistPassed(checklist);
  const total = Object.keys(checklist).length;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  const items = PREMIUM_CHECKLIST_ITEMS.map(({ key, label }) => {
    const ok = checklist[key];
    const mark = ok ? '✔' : '✖';
    const stateClass = ok ? 'ai-listings-admin__quality-item--pass' : 'ai-listings-admin__quality-item--fail';
    return `<li class="ai-listings-admin__quality-item ${stateClass}"><span aria-hidden="true">${mark}</span> ${safeRenderText(label)}</li>`;
  }).join('');

  const filled = Math.round((pct / 100) * 12);
  const bar = '█'.repeat(filled) + '░'.repeat(12 - filled);

  return `
    <article class="ai-listings-admin__quality-card" aria-label="Veri Kalitesi">
      <div class="ai-listings-admin__quality-bar-wrap">
        <div class="ai-listings-admin__quality-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Veri kalitesi ${pct}%">
          <div class="ai-listings-admin__quality-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="ai-listings-admin__quality-pct">${pct}%</span>
      </div>
      <pre class="ai-listings-admin__quality-visual" aria-hidden="true">${bar}</pre>
      <ul class="ai-listings-admin__quality-list">${items}</ul>
    </article>`;
}

/** @type {Readonly<Record<string, string>>} */
const TIMELINE_EVENT_LABELS = Object.freeze({
  listing_created: 'İlan oluşturuldu',
  listing_analyzed: 'AI analiz edildi',
  listing_submitted: 'İncelemeye gönderildi',
  listing_approved: 'Onaylandı',
  listing_rejected: 'Reddedildi',
  listing_archived: 'Arşivlendi',
  listing_updated: 'Güncellendi'
});

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>|null|undefined} analysis
 * @param {Array<Record<string, unknown>>|null|undefined} events
 * @returns {string}
 */
export function buildAnalysisTimelineHtml(listing, analysis, events) {
  /** @type {Array<{ label: string, done: boolean, time?: string }>} */
  const steps = [];

  const hasCreated = events?.some((e) => e.event_type === 'listing_created') || listing.created_at;
  steps.push({ label: 'İlan oluşturuldu', done: Boolean(hasCreated), time: String(listing.created_at ?? '') });

  const hasAnalyzed = events?.some((e) => e.event_type === 'listing_analyzed') || analysis?.ai_score !== undefined;
  steps.push({ label: 'AI analiz edildi', done: Boolean(hasAnalyzed) });

  const hasRisk = analysis?.risk_score !== undefined;
  steps.push({ label: 'Risk hesaplandı', done: Boolean(hasRisk) });

  const hasMarket = analysis?.market_score !== undefined;
  steps.push({ label: 'Piyasa analizi', done: Boolean(hasMarket) });

  const hasUpdated =
    events?.some((e) => e.event_type === 'listing_updated') ||
    (listing.updated_at && listing.created_at && String(listing.updated_at) !== String(listing.created_at));
  steps.push({ label: 'Güncellendi', done: Boolean(hasUpdated), time: String(listing.updated_at ?? '') });

  const items = steps
    .map((step) => {
      const icon = step.done ? '✔' : '○';
      const stateClass = step.done ? 'ai-listings-admin__timeline-item--done' : 'ai-listings-admin__timeline-item--pending';
      const timeHtml = step.time
        ? `<time class="ai-listings-admin__timeline-time">${safeRenderText(step.time)}</time>`
        : '';
      return `
        <li class="ai-listings-admin__timeline-item ${stateClass}">
          <span class="ai-listings-admin__timeline-icon" aria-hidden="true">${icon}</span>
          <span class="ai-listings-admin__timeline-label">${safeRenderText(step.label)}</span>
          ${timeHtml}
        </li>`;
    })
    .join('');

  return `
    <section class="ai-listings-admin__timeline" aria-label="Analiz Geçmişi">
      <h4 class="ai-listings-admin__section-title">Analiz Geçmişi</h4>
      <ol class="ai-listings-admin__timeline-list">${items}</ol>
    </section>`;
}

/**
 * @param {string} status
 * @returns {string}
 */
export function buildStickyActionBarHtml(status) {
  const available = new Set(getAvailableQaActions(status));
  const qaButtons = QA_ACTION_BUTTONS.filter((btn) => available.has(btn.action))
    .map((btn) => {
      const variant = btn.variant ? ` ai-listings-admin__action-btn--${btn.variant}` : '';
      const icon = btn.icon ? `<span class="ai-listings-admin__action-icon" aria-hidden="true">${btn.icon}</span>` : '';
      return `<button type="button" class="ai-listings-admin__action-btn${variant}" data-qa-action="${safeRenderText(btn.action)}" aria-label="${safeRenderText(btn.label)}">${icon}<span>${safeRenderText(btn.label)}</span></button>`;
    })
    .join('');

  const extraButtons = PREMIUM_EXTRA_ACTIONS.map((btn) => {
    return `<button type="button" class="ai-listings-admin__action-btn ai-listings-admin__action-btn--ghost" data-qa-action="${safeRenderText(btn.action)}" aria-label="${safeRenderText(btn.label)}"><span class="ai-listings-admin__action-icon" aria-hidden="true">${btn.icon}</span><span>${safeRenderText(btn.label)}</span></button>`;
  }).join('');

  const buttons = qaButtons + extraButtons;
  if (!buttons) {
    return '';
  }

  return `
    <nav class="ai-listings-admin__action-bar" aria-label="İlan işlemleri">
      <div class="ai-listings-admin__action-bar-inner">${buttons}</div>
    </nav>`;
}

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>|null|undefined} analysis
 * @param {Array<Record<string, unknown>>|null|undefined} events
 * @param {string} status
 * @returns {string}
 */
export function buildPremiumDashboardHtml(listing, analysis, events, status) {
  return `
    <div class="ai-listings-admin__dashboard">
      ${buildHeroDecisionCardHtml(listing, analysis)}
      ${buildScoreCardsHtml(analysis)}
      <section class="ai-listings-admin__section ai-listings-admin__section--summary">
        <h4 class="ai-listings-admin__section-title">Yapay Zeka Yorumu</h4>
        ${buildExecutiveSummaryHtml(analysis)}
      </section>
      <div class="ai-listings-admin__insights-grid">
        ${buildStrengthsCardHtml(analysis)}
        ${buildRisksCardHtml(analysis)}
      </div>
      <section class="ai-listings-admin__section">
        <h4 class="ai-listings-admin__section-title">Piyasa Analizi</h4>
        ${buildMarketAnalysisHtml(listing, analysis)}
      </section>
      <section class="ai-listings-admin__section">
        <h4 class="ai-listings-admin__section-title">Veri Kalitesi</h4>
        ${buildDataQualityHtml(listing, analysis)}
      </section>
      ${buildAnalysisTimelineHtml(listing, analysis, events)}
      <details class="ai-listings-admin__meta-details">
        <summary>İlan meta verileri</summary>
        <dl class="ai-listings-admin__fields">
          <dt>ID</dt><dd>${safeRenderText(listing.id)}</dd>
          <dt>Kategori</dt><dd>${safeRenderText(getCategoryLabelTr(listing.category))}</dd>
          <dt>Durum</dt><dd>${safeRenderText(getStatusLabelTr(status))}</dd>
          <dt>Fiyat</dt><dd>${safeRenderText(listing.price)} ${safeRenderText(listing.currency)}</dd>
          <dt>Konum</dt><dd>${safeRenderText(listing.location ?? '—')}</dd>
          <dt>Kaynak URL</dt><dd>${safeRenderText(listing.source_url ?? '—')}</dd>
          <dt>Kaynak tipi</dt><dd>${safeRenderText(listing.source_type ?? '—')}</dd>
        </dl>
      </details>
      <p class="ai-listings-admin__muted ai-listings-admin__visibility-note">Yayına alma kapalıdır. Onaylandı durumu yalnızca iç QA içindir.</p>
      ${buildStickyActionBarHtml(status)}
    </div>`;
}

const CHECKLIST_LABELS = Object.freeze({
  has_title: 'Başlık var',
  has_price: 'Fiyat var',
  has_location: 'Konum var',
  has_description: 'Açıklama var',
  has_attributes: 'Özellikler var',
  has_analysis: 'Analiz var',
  has_images: 'Görsel var'
});

/**
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>|null} [latestAnalysis]
 * @returns {string}
 */
export function buildQualityChecklistHtml(listing, latestAnalysis = null) {
  const checklist = buildQualityChecklist(listing, latestAnalysis);
  const passed = countChecklistPassed(checklist);
  const total = Object.keys(checklist).length;

  const items = Object.entries(checklist)
    .map(([key, ok]) => {
      const label = CHECKLIST_LABELS[key] ?? key;
      const stateClass = ok ? 'ai-listings-admin__check--pass' : 'ai-listings-admin__check--fail';
      const mark = ok ? '✓' : '✗';
      return `<li class="ai-listings-admin__check ${stateClass}"><span class="ai-listings-admin__check-mark">${mark}</span> ${safeRenderText(label)}</li>`;
    })
    .join('');

  return `
    <p class="ai-listings-admin__check-summary">${passed}/${total} kontrol geçti</p>
    <ul class="ai-listings-admin__checklist">${items}</ul>`;
}

/**
 * @param {'csv'|'json'} format
 * @param {string} content
 * @returns {{ ok: true, preview: ReturnType<typeof buildImportPreview> } | { ok: false, message: string }}
 */
export function previewImportContent(format, content) {
  const trimmed = String(content ?? '').trim();
  if (!trimmed) return { ok: false, message: 'Import content is required.' };
  if (measureImportContentBytes(trimmed) > IMPORT_MAX_CONTENT_BYTES) {
    return { ok: false, message: `Content exceeds ${IMPORT_MAX_CONTENT_BYTES} byte limit.` };
  }

  try {
    const preview = buildImportPreview(format, trimmed);
    return { ok: true, preview };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Import preview failed.'
    };
  }
}

/**
 * @param {ReturnType<typeof buildImportPreview>} preview
 * @returns {string}
 */
export function buildImportPreviewHtml(preview) {
  const errorItems = preview.row_errors
    .map(
      (entry) =>
        `<li><strong>Row ${safeRenderText(entry.row)}:</strong> ${safeRenderText(entry.messages.join('; '))}</li>`
    )
    .join('');

  const errorsBlock = errorItems
    ? `<ul class="ai-listings-admin__import-errors">${errorItems}</ul>`
    : '<p class="ai-listings-admin__muted">No row-level errors.</p>';

  return `
    <div class="ai-listings-admin__import-preview">
      <p><strong>Total rows:</strong> ${safeRenderText(preview.total_count)}</p>
      <p><strong>Valid rows:</strong> ${safeRenderText(preview.valid_rows)}</p>
      <p><strong>Invalid rows:</strong> ${safeRenderText(preview.invalid_rows)}</p>
      ${errorsBlock}
    </div>`;
}

export const ANALYSIS_EMPTY_MESSAGE = 'Henüz analiz yapılmamış.';
export const EVENTS_EMPTY_MESSAGE = 'Olay geçmişi yok.';
export const IMPORT_ANALYZE_DEFAULT = true;

/**
 * @param {unknown} value
 * @returns {string|number|undefined|null}
 */
export function formatScoreValue(value) {
  if (value === undefined || value === null || value === '') return undefined;
  return value;
}

/**
 * @param {unknown} score
 * @returns {string}
 */
export function getScoreInterpretationTr(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return '—';
  if (value >= 80) return 'Çok iyi';
  if (value >= 60) return 'İyi';
  if (value >= 40) return 'Orta';
  if (value >= 20) return 'Zayıf';
  return 'Çok zayıf';
}

/**
 * @param {unknown} riskScore
 * @returns {string}
 */
export function getRiskInterpretationTr(riskScore) {
  const value = Number(riskScore);
  if (!Number.isFinite(value)) return '—';
  if (value <= 30) return 'Düşük risk';
  if (value <= 60) return 'Orta risk';
  return 'Yüksek risk';
}

/**
 * @param {unknown} listingId
 * @returns {string}
 */
export function getListingAnalyzePath(listingId) {
  return `/listings/${encodeURIComponent(String(listingId ?? '').trim())}/analyze`;
}

/**
 * @param {boolean|undefined|null} checkboxChecked
 * @returns {boolean}
 */
export function resolveImportAnalyzeFlag(checkboxChecked) {
  if (checkboxChecked === undefined || checkboxChecked === null) return IMPORT_ANALYZE_DEFAULT;
  return Boolean(checkboxChecked);
}

/**
 * @param {unknown} value
 * @returns {number|undefined}
 */
function normalizeConfidenceScore(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return undefined;
  return raw <= 1 ? raw * 100 : raw;
}

/**
 * @param {string} label
 * @param {unknown} value
 * @param {string} [interpretation]
 * @returns {string}
 */
function buildScoreRowHtml(label, value, interpretation) {
  if (value === undefined) return '';
  const interpretationHtml = interpretation
    ? ` <span class="ai-listings-admin__score-interpretation">(${safeRenderText(interpretation)})</span>`
    : '';
  return `<li><strong>${safeRenderText(label)}:</strong> ${safeRenderText(value)}${interpretationHtml}</li>`;
}

/**
 * @param {unknown} items
 * @param {string} emptyMessage
 * @returns {string}
 */
function buildStringListHtml(items, emptyMessage) {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="ai-listings-admin__muted">${safeRenderText(emptyMessage)}</p>`;
  }
  return `<ul class="ai-listings-admin__bullet-list">${items
    .map((item) => `<li>${safeRenderText(item)}</li>`)
    .join('')}</ul>`;
}

/**
 * @param {unknown} tags
 * @returns {string}
 */
function buildTagsHtml(tags) {
  if (!Array.isArray(tags) || !tags.length) {
    return '<p class="ai-listings-admin__muted">Etiket yok.</p>';
  }
  return `<div class="ai-listings-admin__tag-list">${tags
    .map((tag) => `<span class="ai-listings-admin__tag">${safeRenderText(tag)}</span>`)
    .join('')}</div>`;
}

/**
 * @param {Record<string, unknown>|null|undefined} analysis
 * @returns {string}
 */
export function buildScoresSectionHtml(analysis) {
  if (!analysis) {
    return `<p class="ai-listings-admin__muted">${ANALYSIS_EMPTY_MESSAGE}</p>`;
  }

  const confidence = formatScoreValue(analysis.confidence);
  const confidenceScore = normalizeConfidenceScore(analysis.confidence);
  const rows = [
    buildScoreRowHtml('AI Skoru', formatScoreValue(analysis.ai_score), getScoreInterpretationTr(analysis.ai_score)),
    buildScoreRowHtml(
      'Risk Skoru',
      formatScoreValue(analysis.risk_score),
      getRiskInterpretationTr(analysis.risk_score)
    ),
    buildScoreRowHtml(
      'Piyasa Skoru',
      formatScoreValue(analysis.market_score),
      getScoreInterpretationTr(analysis.market_score)
    ),
    buildScoreRowHtml(
      'Fiyat Skoru',
      formatScoreValue(analysis.price_score),
      getScoreInterpretationTr(analysis.price_score)
    ),
    buildScoreRowHtml(
      'Güven',
      confidence,
      confidenceScore !== undefined ? getScoreInterpretationTr(confidenceScore) : undefined
    )
  ].filter(Boolean);

  if (!rows.length) {
    return `<p class="ai-listings-admin__muted">${ANALYSIS_EMPTY_MESSAGE}</p>`;
  }

  return `<ul class="ai-listings-admin__score-list">${rows.join('')}</ul>`;
}

/**
 * @param {Record<string, unknown>|null|undefined} analysis
 * @returns {string}
 */
export function buildAnalysisDetailHtml(analysis) {
  if (!analysis) {
    return `
      <h4>AI Analizi</h4>
      <p class="ai-listings-admin__muted">${ANALYSIS_EMPTY_MESSAGE}</p>
      <h4>Skorlar</h4>
      <p class="ai-listings-admin__muted">${ANALYSIS_EMPTY_MESSAGE}</p>
      <h4>Güçlü Yönler</h4>
      <p class="ai-listings-admin__muted">${ANALYSIS_EMPTY_MESSAGE}</p>
      <h4>Riskler</h4>
      <p class="ai-listings-admin__muted">${ANALYSIS_EMPTY_MESSAGE}</p>
      <h4>Etiketler</h4>
      <p class="ai-listings-admin__muted">${ANALYSIS_EMPTY_MESSAGE}</p>`;
  }

  const summary = String(analysis.summary ?? '').trim();
  const summaryHtml = summary
    ? `<p class="ai-listings-admin__analysis-summary">${safeRenderText(summary)}</p>`
    : `<p class="ai-listings-admin__muted">Özet yok.</p>`;

  return `
    <h4>AI Analizi</h4>
    ${summaryHtml}
    <h4>Skorlar</h4>
    ${buildScoresSectionHtml(analysis)}
    <h4>Güçlü Yönler</h4>
    ${buildStringListHtml(analysis.pros, 'Güçlü yön bulunamadı.')}
    <h4>Riskler</h4>
    ${buildStringListHtml(analysis.cons, 'Risk bulunamadı.')}
    <h4>Etiketler</h4>
    ${buildTagsHtml(analysis.tags)}`;
}

/**
 * @param {Array<Record<string, unknown>>|null|undefined} events
 * @returns {string}
 */
export function buildEventsHtml(events) {
  if (!events?.length) {
    return `<p class="ai-listings-admin__muted">${EVENTS_EMPTY_MESSAGE}</p>`;
  }

  return `<ul class="ai-listings-admin__events">${events
    .map((event) => {
      const reason =
        event.event_type === 'listing_rejected' && event.payload?.reason
          ? ` — ${safeRenderText(event.payload.reason)}`
          : '';
      return `
      <li>
        <span class="ai-listings-admin__event-type">${safeRenderText(event.event_type)}</span>
        <span class="ai-listings-admin__event-time">${safeRenderText(event.created_at)}</span>${reason}
      </li>`;
    })
    .join('')}</ul>`;
}

/**
 * @param {Record<string, unknown>|null|undefined} analysis
 * @returns {string}
 * @deprecated Use buildAnalysisDetailHtml for the full detail panel.
 */
export function buildAnalysisScoresHtml(analysis) {
  if (!analysis) {
    return `<p class="ai-listings-admin__muted">${ANALYSIS_EMPTY_MESSAGE}</p>`;
  }
  return buildScoresSectionHtml(analysis);
}

/**
 * @param {string} message
 * @returns {string}
 */
export function translateAdminErrorMessage(message) {
  const text = String(message ?? '').trim();
  if (!text) return 'İstek başarısız';

  const lower = text.toLowerCase();
  if (lower === 'unauthorized' || lower.includes('invalid secret')) return 'Yetkisiz erişim';
  if (lower.includes('edge secret missing')) return 'Edge secret eksik';
  if (lower.includes('supabase anon key missing')) return 'Supabase anon key eksik';
  if (lower.includes('invalid json') || lower.includes('json is invalid')) return 'Geçersiz JSON';
  if (lower.includes('invalid url') || lower.includes('http or https')) return 'Geçersiz URL';
  if (lower.startsWith('request failed')) return 'İstek başarısız';

  return text;
}

export function mapEdgeResponse(response, body) {
  const payload = body && typeof body === 'object' ? body : {};
  const error = /** @type {{ code?: string, message?: string }} */ (payload.error ?? {});

  if (response.status === 503 && (error.code === 'MODULE_DISABLED' || error.message?.includes('disabled'))) {
    return { ok: false, status: 503, message: 'AI Listings modülü devre dışı.' };
  }
  if (response.status === 401) {
    return {
      ok: false,
      status: 401,
      message: translateAdminErrorMessage(error.message || 'Unauthorized')
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: translateAdminErrorMessage(error.message || `Request failed (${response.status})`)
    };
  }

  return { ok: true, status: response.status, message: 'OK', data: payload.data };
}
