/**
 * isteBul AI Listings Engine v1 — repository factory.
 *
 * Returns in-memory repositories by default.
 * Supabase repositories are used only when AI_LISTINGS_SUPABASE_ENABLED=true
 * and a valid client is provided.
 */

import { isAiListingsSupabaseAdapterEnabled } from '../core/config.js';
import { createInMemoryListingRepository } from './in-memory/in-memory-listing-repository.js';
import { createInMemoryAIAnalysisRepository } from './in-memory/in-memory-ai-analysis-repository.js';
import { createSupabaseAiListingRepository } from './supabase/supabase-ai-listing-repository.js';
import { createSupabaseAiAnalysisRepository } from './supabase/supabase-ai-analysis-repository.js';
import { createSupabaseAiListingEventRepository } from './supabase/supabase-ai-listing-event-repository.js';
import { hasValidSupabaseClientConfig } from './supabase/supabase-adapter-guard.js';

/** @typedef {import('./supabase/supabase-adapter-guard.js').SupabaseClientLike} SupabaseClientLike */
import {
  repositoryDisabledError,
  supabaseConfigMissingError
} from './repository-errors.js';

/** @typedef {import('./listing-repository.interface.js').ListingRepository} ListingRepository */
/** @typedef {import('./ai-analysis-repository.interface.js').AIAnalysisRepository} AIAnalysisRepository */
/** @typedef {import('./listing-event-repository.interface.js').AiListingEventRepository} AiListingEventRepository */
/** @typedef {import('./supabase/supabase-ai-listing-repository.js').SupabaseAiListingRepository} SupabaseAiListingRepository */
/** @typedef {import('./supabase/supabase-ai-analysis-repository.js').SupabaseAiAnalysisRepository} SupabaseAiAnalysisRepository */

/**
 * @typedef {'auto' | 'in-memory' | 'supabase'} RepositoryFactoryMode
 */

/**
 * @typedef {Object} AiListingsRepositoryFactoryOptions
 * @property {RepositoryFactoryMode} [mode]
 * @property {SupabaseClientLike|null} [client]
 * @property {string} [url]
 * @property {string} [key]
 */

/**
 * @typedef {Object} AiListingsRepositorySet
 * @property {'in-memory' | 'supabase'} backend
 * @property {ListingRepository|SupabaseAiListingRepository} listingRepository
 * @property {AIAnalysisRepository|SupabaseAiAnalysisRepository} aiAnalysisRepository
 * @property {AiListingEventRepository|null} eventRepository
 */

/**
 * Resolve factory mode from options and flags.
 * @param {AiListingsRepositoryFactoryOptions} [options]
 * @returns {'in-memory' | 'supabase'}
 */
export function resolveRepositoryBackend(options = {}) {
  const mode = options.mode ?? 'auto';

  if (mode === 'in-memory') return 'in-memory';
  if (mode === 'supabase') return 'supabase';

  if (!isAiListingsSupabaseAdapterEnabled()) return 'in-memory';
  if (!hasValidSupabaseClientConfig(options)) return 'in-memory';
  return 'supabase';
}

/**
 * Create repository set. Defaults to in-memory unless explicitly configured.
 * @param {AiListingsRepositoryFactoryOptions} [options]
 * @returns {AiListingsRepositorySet}
 */
export function createAiListingsRepositories(options = {}) {
  const backend = resolveRepositoryBackend(options);

  if (backend === 'in-memory') {
    return {
      backend: 'in-memory',
      listingRepository: createInMemoryListingRepository(),
      aiAnalysisRepository: createInMemoryAIAnalysisRepository(),
      eventRepository: null
    };
  }

  const client = options.client;
  if (!hasValidSupabaseClientConfig({ client, url: options.url, key: options.key })) {
    throw supabaseConfigMissingError();
  }

  return {
    backend: 'supabase',
    listingRepository: createSupabaseAiListingRepository({ client }),
    aiAnalysisRepository: createSupabaseAiAnalysisRepository({ client }),
    eventRepository: createSupabaseAiListingEventRepository({ client })
  };
}

/**
 * Require Supabase backend — throws if disabled or misconfigured.
 * @param {AiListingsRepositoryFactoryOptions} [options]
 * @returns {AiListingsRepositorySet}
 */
export function createSupabaseAiListingsRepositories(options = {}) {
  if (!isAiListingsSupabaseAdapterEnabled()) {
    throw repositoryDisabledError();
  }
  return createAiListingsRepositories({ ...options, mode: 'supabase' });
}
