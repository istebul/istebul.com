/**
 * isteBul AI Listings Edge API — platform routes (learning, data pool, personalization).
 */

import { EDGE_ERROR_CODES, errorResponse, jsonResponse, successBody } from './errors.js';
import { runListingDataPoolEngine } from './listing-data-pool/index.js';
import { runLearningInsightsEngine } from './user-learning/index.js';
import { runPersonalizationSuite } from './personalization/index.js';
import { isListingPubliclyVisible, isPublicPublishEnabled } from './status-workflow.js';
import { validateLearningEventsBody, validateDataPoolBatchBody, validatePersonalizationBody } from './validation.js';

/**
 * @param {Awaited<ReturnType<import('./repositories.js').createEdgeRepositories>>} repos
 * @param {Request} req
 * @param {{ id: string|null, action: string|null }} route
 * @param {Record<string, string|undefined>} env
 * @param {string|null} origin
 */
export async function handleLearningRoute(repos, req, route, env, origin) {
  if (route.id === 'events' && route.action === null && req.method === 'POST') {
    const body = await req.json().catch(() => null);
    const validation = validateLearningEventsBody(body);
    if (!validation.ok) {
      return errorResponse(EDGE_ERROR_CODES.INVALID_REQUEST, validation.message, 400, undefined, origin);
    }

    const saved = [];
    for (const event of validation.value.events) {
      const row = await repos.createLearningEvent(event);
      saved.push(row);
    }

    return jsonResponse(successBody({ saved_count: saved.length, events: saved }), 201, origin);
  }

  if (route.id === 'insights' && route.action === null && req.method === 'GET') {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 100), 1), 500);
    const sessionId = String(url.searchParams.get('session_id') ?? '').trim() || undefined;
    const events = await repos.listLearningEvents({ limit, session_id: sessionId });
    const insights = runLearningInsightsEngine(events, [], [], { skipCache: true });

    return jsonResponse(
      successBody({
        event_count: events.length,
        insights
      }),
      200,
      origin
    );
  }

  return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Route not found', 404, undefined, origin);
}

/**
 * @param {Awaited<ReturnType<import('./repositories.js').createEdgeRepositories>>} repos
 * @param {Request} req
 * @param {{ id: string|null, action: string|null }} route
 * @param {string|null} origin
 */
export async function handleDataPoolRoute(repos, req, route, origin) {
  if (route.id === 'batch' && route.action === null && req.method === 'POST') {
    const body = await req.json().catch(() => null);
    const validation = validateDataPoolBatchBody(body);
    if (!validation.ok) {
      return errorResponse(EDGE_ERROR_CODES.INVALID_REQUEST, validation.message, 400, undefined, origin);
    }

    let listings = validation.value.listings;
    if (validation.value.use_repository) {
      const filters = { limit: validation.value.limit ?? 200 };
      if (validation.value.status) filters.status = validation.value.status;
      listings = await repos.listListings(filters);
    }

    const result = runListingDataPoolEngine(listings, { skipCache: true });
    return jsonResponse(successBody({ pool: result, listing_count: listings.length }), 200, origin);
  }

  return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Route not found', 404, undefined, origin);
}

/**
 * @param {Request} req
 * @param {{ id: string|null, action: string|null }} route
 * @param {string|null} origin
 */
export async function handlePersonalizationRoute(req, route, origin) {
  if (route.id === 'profile' && route.action === null && req.method === 'POST') {
    const body = await req.json().catch(() => null);
    const validation = validatePersonalizationBody(body);
    if (!validation.ok) {
      return errorResponse(EDGE_ERROR_CODES.INVALID_REQUEST, validation.message, 400, undefined, origin);
    }

    const suite = runPersonalizationSuite(
      validation.value.recommendation,
      validation.value.decisionResult,
      validation.value.profile,
      validation.value.behaviorSignals,
      { skipCache: true }
    );

    return jsonResponse(successBody({ personalization: suite }), 200, origin);
  }

  return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Route not found', 404, undefined, origin);
}

/**
 * @param {Awaited<ReturnType<import('./repositories.js').createEdgeRepositories>>} repos
 * @param {Record<string, string|undefined>} env
 * @param {string|null} origin
 */
export async function handlePublicListingsRoute(repos, env, origin) {
  if (!isPublicPublishEnabled(env)) {
    return errorResponse(
      EDGE_ERROR_CODES.MODULE_DISABLED,
      'Public publish is disabled',
      503,
      undefined,
      origin
    );
  }

  const listings = await repos.listListings({ status: 'published', limit: 100 });
  const enriched = await Promise.all(
    listings
      .filter((listing) => isListingPubliclyVisible(listing.status, env))
      .map(async (listing) => ({
        ...listing,
        latest_analysis: await repos.getLatestAnalysis(listing.id)
      }))
  );

  return jsonResponse(successBody({ listings: enriched, count: enriched.length }), 200, origin);
}
