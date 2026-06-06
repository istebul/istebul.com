/**
 * isteBul AI Listings Edge API — request handler (testable).
 */

import { authorizeRequest } from './auth.js';
import { runListingAnalysisPipeline } from './analysis-pipeline.js';
import { createEdgeRepositories } from './repositories.js';
import { parseAiListingsRoute } from './router.js';
import {
  EDGE_ERROR_CODES,
  errorResponse,
  jsonResponse,
  successBody
} from './errors.js';
import {
  parseListFilters,
  validateCreateListingBody,
  validatePatchListingBody
} from './validation.js';

/**
 * @typedef {Object} HandlerDeps
 * @property {Record<string, string|undefined>} env
 * @property {(url: string, key: string) => unknown} createServiceClient
 * @property {typeof createEdgeRepositories} [createRepositories]
 * @property {typeof runListingAnalysisPipeline} [runAnalysis]
 */

/**
 * @param {Request} req
 * @param {HandlerDeps} deps
 */
export async function handleAiListingsRequest(req, deps) {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    const auth = authorizeRequest(req, deps.env);
    if (!auth.ok) {
      return errorResponse(auth.code, auth.message, auth.status);
    }

    const supabaseUrl = deps.env.SUPABASE_URL;
    const serviceRoleKey = deps.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(
        EDGE_ERROR_CODES.INTERNAL_ERROR,
        'Supabase service configuration is missing',
        500
      );
    }

    const client = deps.createServiceClient(supabaseUrl, serviceRoleKey);
    const repos = (deps.createRepositories ?? createEdgeRepositories)(client);
    const runAnalysis = deps.runAnalysis ?? runListingAnalysisPipeline;

    const url = new URL(req.url);
    const route = parseAiListingsRoute(url.pathname);

    if (route.resource !== 'listings') {
      return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Route not found', 404);
    }

    // POST /listings
    if (route.id === null && req.method === 'POST') {
      const body = await req.json().catch(() => null);
      const validation = validateCreateListingBody(body);
      if (!validation.ok) {
        return errorResponse(validation.code, validation.message, 400, validation.details);
      }

      const listing = await repos.createListing(validation.value);
      await repos.createEvent({
        listing_id: listing.id,
        event_type: 'listing_created',
        payload: { source_type: listing.source_type, category: listing.category }
      });

      return jsonResponse(successBody({ listing }), 201);
    }

    // GET /listings
    if (route.id === null && req.method === 'GET') {
      const filters = parseListFilters(url.searchParams);
      const listings = await repos.listListings(filters);
      return jsonResponse(successBody({ listings, filters }));
    }

    if (!route.id) {
      return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Route not found', 404);
    }

    // GET /listings/:id
    if (route.action === null && req.method === 'GET') {
      const listing = await repos.getListingById(route.id);
      if (!listing) {
        return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Listing not found', 404);
      }
      const latest_analysis = await repos.getLatestAnalysis(route.id);
      return jsonResponse(successBody({ listing, latest_analysis }));
    }

    // PATCH /listings/:id
    if (route.action === null && req.method === 'PATCH') {
      const body = await req.json().catch(() => null);
      const validation = validatePatchListingBody(body);
      if (!validation.ok) {
        return errorResponse(validation.code, validation.message, 400, validation.details);
      }

      const existing = await repos.getListingById(route.id);
      if (!existing) {
        return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Listing not found', 404);
      }

      const listing = await repos.updateListing(route.id, validation.value);
      await repos.createEvent({
        listing_id: listing.id,
        event_type: 'listing_updated',
        payload: { fields: Object.keys(validation.value) }
      });

      return jsonResponse(successBody({ listing }));
    }

    // POST /listings/:id/archive
    if (route.action === 'archive' && req.method === 'POST') {
      const existing = await repos.getListingById(route.id);
      if (!existing) {
        return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Listing not found', 404);
      }

      const listing = await repos.archiveListing(route.id);
      await repos.createEvent({
        listing_id: listing.id,
        event_type: 'listing_archived',
        payload: {}
      });

      return jsonResponse(successBody({ listing }));
    }

    // POST /listings/:id/analyze
    if (route.action === 'analyze' && req.method === 'POST') {
      const listing = await repos.getListingById(route.id);
      if (!listing) {
        return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Listing not found', 404);
      }

      const pipeline = await runAnalysis({ listing });
      if (!pipeline.ok || !pipeline.analysis) {
        return errorResponse(
          EDGE_ERROR_CODES.INTERNAL_ERROR,
          'Analysis pipeline failed',
          500,
          pipeline.errors
        );
      }

      const saved = await repos.createAnalysis(route.id, pipeline.analysis, 'v1-edge');
      await repos.createEvent({
        listing_id: route.id,
        event_type: 'listing_analyzed',
        payload: {
          analysis_id: saved.id,
          ai_score: saved.ai_score,
          rank_score: pipeline.context?.recommendation?.rank_score ?? null
        }
      });

      return jsonResponse(
        successBody({
          listing,
          analysis: saved,
          context: pipeline.context
        })
      );
    }

    // GET /listings/:id/events
    if (route.action === 'events' && req.method === 'GET') {
      const listing = await repos.getListingById(route.id);
      if (!listing) {
        return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Listing not found', 404);
      }

      const events = await repos.listEventsByListingId(route.id);
      return jsonResponse(successBody({ listing_id: route.id, events }));
    }

    return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Route not found', 404);
  } catch (err) {
    const mapped = /** @type {{ code?: string, message?: string, cause?: unknown }} */ (err);
    if (mapped?.code && Object.values(EDGE_ERROR_CODES).includes(mapped.code)) {
      const status =
        mapped.code === EDGE_ERROR_CODES.NOT_FOUND
          ? 404
          : mapped.code === EDGE_ERROR_CODES.DB_ERROR
            ? 500
            : 500;
      return errorResponse(mapped.code, mapped.message || mapped.code, status);
    }

    return errorResponse(
      EDGE_ERROR_CODES.INTERNAL_ERROR,
      'Unexpected server error',
      500
    );
  }
}
