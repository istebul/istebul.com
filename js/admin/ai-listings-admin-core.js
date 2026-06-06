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

/** @type {ReadonlyArray<{ action: string, label: string, variant?: string }>} */
const QA_ACTION_BUTTONS = Object.freeze([
  { action: QA_ACTIONS.SUBMIT_REVIEW, label: 'İncelemeye gönder' },
  { action: QA_ACTIONS.APPROVE, label: 'Onayla', variant: 'success' },
  { action: QA_ACTIONS.REJECT, label: 'Reddet', variant: 'warn' },
  { action: QA_ACTIONS.ARCHIVE, label: 'Arşivle', variant: 'warn' },
  { action: QA_ACTIONS.REANALYZE, label: 'Yeniden analiz et' }
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

/**
 * @param {unknown} value
 * @returns {string|number|undefined|null}
 */
export function formatScoreValue(value) {
  if (value === undefined || value === null || value === '') return undefined;
  return value;
}

/**
 * @param {Record<string, unknown>|null|undefined} analysis
 * @returns {string}
 */
export function buildAnalysisScoresHtml(analysis) {
  if (!analysis) {
    return '<p class="ai-listings-admin__muted">Henüz analiz yok.</p>';
  }

  const rows = [
    ['AI Skoru', formatScoreValue(analysis.ai_score)],
    ['Risk', formatScoreValue(analysis.risk_score)],
    ['Piyasa', formatScoreValue(analysis.market_score)],
    ['Fiyat', formatScoreValue(analysis.price_score)],
    ['Güven', formatScoreValue(analysis.confidence)]
  ]
    .filter(([, value]) => value !== undefined)
    .map(
      ([label, value]) =>
        `<p><strong>${safeRenderText(label)}:</strong> ${safeRenderText(value)}</p>`
    )
    .join('');

  const summary = analysis.summary
    ? `<p><strong>Özet:</strong> ${safeRenderText(analysis.summary)}</p>`
    : '';

  return `<div class="ai-listings-admin__analysis">${rows}${summary}</div>`;
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
