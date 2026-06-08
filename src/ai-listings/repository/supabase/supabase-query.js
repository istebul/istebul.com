/**
 * isteBul AI Listings Engine v1 — Supabase query helpers.
 */

import { unwrapSupabaseResponse } from '../repository-errors.js';

/**
 * @typedef {Object} SupabaseFilter
 * @property {string} column
 * @property {unknown} value
 */

/**
 * Apply equality filters to a Supabase query builder.
 * @param {Record<string, unknown>} query
 * @param {SupabaseFilter[]} filters
 * @returns {Record<string, unknown>}
 */
export function applyEqFilters(query, filters) {
  let builder = query;
  for (const { column, value } of filters) {
    if (value !== undefined && value !== null && value !== '') {
      builder = builder.eq(column, value);
    }
  }
  return builder;
}

/**
 * @template T
 * @param {Promise<{ data: T, error: { code?: string, message?: string }|null }>} promise
 * @param {{ allowEmpty?: boolean, notFoundLabel?: string }} [options]
 * @returns {Promise<T>}
 */
export async function runSupabaseQuery(promise, options = {}) {
  const response = await promise;
  return unwrapSupabaseResponse(response, options);
}

/**
 * @template T
 * @param {Promise<{ data: T, error: { code?: string, message?: string }|null }>} promise
 * @param {string} [notFoundLabel]
 * @returns {Promise<T|null>}
 */
export async function runSupabaseMaybeQuery(promise, notFoundLabel) {
  const response = await promise;
  if (response.error?.code === 'PGRST116') return null;
  return unwrapSupabaseResponse(response, { allowEmpty: true, notFoundLabel });
}
