/**
 * isteBul AI Listings Engine v1 — Supabase adapter activation guard.
 */

import { isAiListingsSupabaseAdapterEnabled } from '../../core/config.js';
import { repositoryDisabledError, supabaseConfigMissingError } from '../repository-errors.js';

export const SUPABASE_TABLES = Object.freeze({
  LISTINGS: 'ai_listings',
  ANALYSES: 'ai_listing_analyses',
  EVENTS: 'ai_listing_events'
});

/** @deprecated Use AiListingsRepositoryError with AI_LISTINGS_REPOSITORY_DISABLED */
export const SUPABASE_ADAPTER_INACTIVE_ERROR = repositoryDisabledError().message;

/**
 * @typedef {Object} SupabaseClientConfig
 * @property {string} [url]
 * @property {string} [key]
 * @property {SupabaseClientLike} [client]
 */

/**
 * @typedef {Object} SupabaseClientLike
 * @property {(table: string) => SupabaseQueryBuilderLike} from
 */

/**
 * @typedef {Object} SupabaseQueryBuilderLike
 * @property {(...args: unknown[]) => SupabaseQueryBuilderLike} select
 * @property {(...args: unknown[]) => SupabaseQueryBuilderLike} insert
 * @property {(...args: unknown[]) => SupabaseQueryBuilderLike} update
 * @property {(...args: unknown[]) => SupabaseQueryBuilderLike} delete
 * @property {(...args: unknown[]) => SupabaseQueryBuilderLike} eq
 * @property {(...args: unknown[]) => SupabaseQueryBuilderLike} order
 * @property {(...args: unknown[]) => SupabaseQueryBuilderLike} limit
 * @property {(...args: unknown[]) => SupabaseQueryBuilderLike} range
 * @property {() => Promise<{ data: unknown, error: { code?: string, message?: string }|null }>} single
 * @property {() => Promise<{ data: unknown, error: { code?: string, message?: string }|null }>} maybeSingle
 * @property {() => Promise<{ data: unknown, error: { code?: string, message?: string }|null }>} then
 */

/**
 * Assert Supabase adapter is enabled before any DB operation.
 * @returns {void}
 */
export function assertSupabaseAdapterActive() {
  if (!isAiListingsSupabaseAdapterEnabled()) {
    throw repositoryDisabledError();
  }
}

/**
 * Resolve Supabase client from deps.
 * @param {{ client?: SupabaseClientLike|null }} [deps]
 * @returns {SupabaseClientLike}
 */
export function requireSupabaseClient(deps = {}) {
  assertSupabaseAdapterActive();

  const client = deps.client ?? null;
  if (client && typeof client.from === 'function') {
    return client;
  }

  throw supabaseConfigMissingError();
}

/**
 * @param {SupabaseClientConfig} [config]
 * @returns {boolean}
 */
export function hasValidSupabaseClientConfig(config = {}) {
  return Boolean(config.client && typeof config.client.from === 'function');
}
