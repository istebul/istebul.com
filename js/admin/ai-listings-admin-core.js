/**
 * isteBul AI Listings — internal admin test panel utilities.
 *
 * INTERNAL TEST ONLY — not linked from public navigation.
 * Panel is hidden unless localStorage istebul_ai_listings_admin === "on".
 */

import { escapeHtml } from '../core/dom-safe.js';
import { isHttpOrHttpsUrl } from '../../supabase/functions/_shared/ai-listings/validation.js';

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
 * @param {string} secret
 * @returns {Record<string, string>}
 */
export function buildEdgeRequestHeaders(secret) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const trimmed = String(secret ?? '').trim();
  if (trimmed) headers[EDGE_SECRET_HEADER] = trimmed;
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
      return { ok: false, message: 'attributes must be a JSON object' };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, message: 'attributes JSON is invalid' };
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
  const category = safeRenderText(listing.category ?? '—');
  const analysis = extractLatestAnalysis(listing);
  const aiScore = analysis?.ai_score ?? '—';
  const riskScore = analysis?.risk_score ?? '—';
  const analysisDate = formatAnalysisDate(analysis);

  return `
    <span class="ai-listings-admin__badge ai-listings-admin__badge--category">${category}</span>
    <span class="ai-listings-admin__badge ai-listings-admin__badge--ai">AI ${safeRenderText(aiScore)}</span>
    <span class="ai-listings-admin__badge ai-listings-admin__badge--risk">Risk ${safeRenderText(riskScore)}</span>
    <span class="ai-listings-admin__badge ai-listings-admin__badge--date">${safeRenderText(analysisDate)}</span>`;
}

export function mapEdgeResponse(response, body) {
  const payload = body && typeof body === 'object' ? body : {};
  const error = /** @type {{ code?: string, message?: string }} */ (payload.error ?? {});

  if (response.status === 503 && (error.code === 'MODULE_DISABLED' || error.message?.includes('disabled'))) {
    return { ok: false, status: 503, message: 'AI Listings module is disabled.' };
  }
  if (response.status === 401) {
    return { ok: false, status: 401, message: error.message || 'Unauthorized' };
  }
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: error.message || `Request failed (${response.status})`
    };
  }

  return { ok: true, status: response.status, message: 'OK', data: payload.data };
}
