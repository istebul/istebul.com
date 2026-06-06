/**
 * isteBul AI Listings Edge API — request validation utilities.
 */

import { EDGE_ERROR_CODES } from './errors.js';

const HTTP_URL_PATTERN = /^https?:\/\/.+/i;
const BLOCKED_PROTOCOL_PREFIXES = ['javascript:', 'data:', 'file:', 'ftp:', 'blob:'];

const PATCH_ALLOWED_FIELDS = new Set([
  'title',
  'description',
  'location',
  'price',
  'currency',
  'images',
  'attributes',
  'status',
  'source_url'
]);

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isHttpOrHttpsUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 2000) return false;
  const lower = raw.toLowerCase();
  for (const prefix of BLOCKED_PROTOCOL_PREFIXES) {
    if (lower.startsWith(prefix)) return false;
  }
  if (!HTTP_URL_PATTERN.test(raw)) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, value: Record<string, unknown> } | { ok: false, code: string, message: string, details?: unknown }}
 */
export function validateCreateListingBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      code: EDGE_ERROR_CODES.INVALID_REQUEST,
      message: 'Request body must be a JSON object'
    };
  }

  const input = /** @type {Record<string, unknown>} */ (body);
  const category = String(input.category ?? '').trim();
  const title = String(input.title ?? '').trim();

  if (!category) {
    return { ok: false, code: EDGE_ERROR_CODES.INVALID_REQUEST, message: 'category is required' };
  }
  if (!title) {
    return { ok: false, code: EDGE_ERROR_CODES.INVALID_REQUEST, message: 'title is required' };
  }

  if (input.price !== undefined && input.price !== null) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, code: EDGE_ERROR_CODES.INVALID_REQUEST, message: 'price must be a non-negative number' };
    }
  }

  if (input.images !== undefined && !Array.isArray(input.images)) {
    return { ok: false, code: EDGE_ERROR_CODES.INVALID_REQUEST, message: 'images must be an array' };
  }

  if (input.attributes !== undefined && (typeof input.attributes !== 'object' || input.attributes === null || Array.isArray(input.attributes))) {
    return { ok: false, code: EDGE_ERROR_CODES.INVALID_REQUEST, message: 'attributes must be an object' };
  }

  if (input.source_url !== undefined && input.source_url !== null && String(input.source_url).trim()) {
    if (!isHttpOrHttpsUrl(input.source_url)) {
      return {
        ok: false,
        code: EDGE_ERROR_CODES.INVALID_REQUEST,
        message: 'source_url must be a valid http or https URL'
      };
    }
  }

  return {
    ok: true,
    value: {
      category,
      title,
      description: input.description !== undefined ? String(input.description ?? '') : undefined,
      location: input.location !== undefined ? String(input.location ?? '') : undefined,
      price: input.price !== undefined && input.price !== null ? Number(input.price) : undefined,
      currency: input.currency !== undefined ? String(input.currency ?? 'TRY') : 'TRY',
      images: Array.isArray(input.images) ? input.images.map(String) : [],
      attributes: input.attributes && typeof input.attributes === 'object' ? input.attributes : {},
      source_url: input.source_url !== undefined && input.source_url !== null ? String(input.source_url).trim() : undefined,
      source_type: input.source_type !== undefined ? String(input.source_type) : undefined,
      owner_user_id: input.owner_user_id !== undefined ? String(input.owner_user_id) : undefined,
      status: input.status !== undefined ? String(input.status) : undefined
    }
  };
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, value: Record<string, unknown> } | { ok: false, code: string, message: string, details?: unknown }}
 */
export function validatePatchListingBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      code: EDGE_ERROR_CODES.INVALID_REQUEST,
      message: 'Request body must be a JSON object'
    };
  }

  const input = /** @type {Record<string, unknown>} */ (body);
  /** @type {Record<string, unknown>} */
  const patch = {};

  for (const key of Object.keys(input)) {
    if (!PATCH_ALLOWED_FIELDS.has(key)) {
      return {
        ok: false,
        code: EDGE_ERROR_CODES.INVALID_REQUEST,
        message: `Field "${key}" is not allowed in patch`,
        details: { allowed: [...PATCH_ALLOWED_FIELDS] }
      };
    }
    patch[key] = input[key];
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, code: EDGE_ERROR_CODES.INVALID_REQUEST, message: 'At least one patch field is required' };
  }

  if (patch.price !== undefined && patch.price !== null) {
    const price = Number(patch.price);
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, code: EDGE_ERROR_CODES.INVALID_REQUEST, message: 'price must be a non-negative number' };
    }
    patch.price = price;
  }

  if (patch.images !== undefined && !Array.isArray(patch.images)) {
    return { ok: false, code: EDGE_ERROR_CODES.INVALID_REQUEST, message: 'images must be an array' };
  }

  if (patch.attributes !== undefined && (typeof patch.attributes !== 'object' || patch.attributes === null || Array.isArray(patch.attributes))) {
    return { ok: false, code: EDGE_ERROR_CODES.INVALID_REQUEST, message: 'attributes must be an object' };
  }

  if (patch.source_url !== undefined && patch.source_url !== null && String(patch.source_url).trim()) {
    if (!isHttpOrHttpsUrl(patch.source_url)) {
      return {
        ok: false,
        code: EDGE_ERROR_CODES.INVALID_REQUEST,
        message: 'source_url must be a valid http or https URL'
      };
    }
    patch.source_url = String(patch.source_url).trim();
  }

  return { ok: true, value: patch };
}

/**
 * @param {URLSearchParams} params
 */
export function parseListFilters(params) {
  const filters = {};
  if (params.get('category')) filters.category = params.get('category');
  if (params.get('status')) filters.status = params.get('status');
  if (params.get('source_type')) filters.source_type = params.get('source_type');
  if (params.get('owner_user_id')) filters.owner_user_id = params.get('owner_user_id');
  if (params.get('limit')) {
    const limit = Number(params.get('limit'));
    if (Number.isFinite(limit) && limit > 0) filters.limit = Math.min(limit, 100);
  }
  if (params.get('offset')) {
    const offset = Number(params.get('offset'));
    if (Number.isFinite(offset) && offset >= 0) filters.offset = offset;
  }
  return filters;
}
