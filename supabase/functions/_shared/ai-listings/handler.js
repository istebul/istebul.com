/**
 * isteBul AI Listings Edge API — request handler (testable).
 */

import { authorizeRequestWithPublicRead } from './auth.js';
import {
  handleDataPoolRoute,
  handleLearningRoute,
  handlePersonalizationRoute,
  handlePublicListingsRoute
} from './platform-handlers.js';
import { preflightResponse } from './cors.js';
import { runListingAnalysisPipeline, ANALYSIS_ENGINE_VERSION } from './analysis-pipeline.js';
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
  validatePatchListingBody,
  validateRejectBody
} from './validation.js';
import {
  QA_ACTIONS,
  eventTypeForAction,
  resolveStatusTransition
} from './status-workflow.js';
import {
  buildImportPreview,
  validateImportRequestBody
} from './import-parser.js';
import {
  detectListingDuplicate,
  emitDuplicateEvents,
  toDuplicateOutput
} from './duplicate/duplicate-workflow.js';

/**
 * @typedef {Object} HandlerDeps
 * @property {Record<string, string|undefined>} env
 * @property {(url: string, key: string) => unknown} createServiceClient
 * @property {typeof createEdgeRepositories} [createRepositories]
 * @property {typeof runListingAnalysisPipeline} [runAnalysis]
 */

/**
 * @param {Awaited<ReturnType<typeof createEdgeRepositories>>} repos
 * @param {string} listingId
 * @param {string} action
 * @param {Record<string, unknown>} [eventPayload]
 */
async function applyWorkflowTransition(repos, listingId, action, eventPayload = {}) {
  const existing = await repos.getListingById(listingId);
  if (!existing) {
    return { ok: false, status: 404, code: EDGE_ERROR_CODES.NOT_FOUND, message: 'Listing not found' };
  }

  const fromStatus = String(existing.status ?? 'draft');
  const transition = resolveStatusTransition(fromStatus, action);
  if (!transition.ok) {
    return {
      ok: false,
      status: 400,
      code: EDGE_ERROR_CODES.INVALID_REQUEST,
      message: transition.message
    };
  }

  let listing = existing;
  if (transition.nextStatus !== fromStatus) {
    listing = await repos.updateListing(listingId, { status: transition.nextStatus });
  }

  await repos.createEvent({
    listing_id: listingId,
    event_type: eventTypeForAction(action),
    payload: {
      from_status: fromStatus,
      to_status: String(listing.status ?? transition.nextStatus),
      ...eventPayload
    }
  });

  return { ok: true, listing };
}

/**
 * @param {Awaited<ReturnType<typeof createEdgeRepositories>>} repos
 * @param {Record<string, unknown>} listing
 * @param {Array<Record<string, unknown>>} [candidates]
 */
async function runPostCreateDuplicateCheck(repos, listing, candidates) {
  const pool = candidates ?? (await repos.listListings({ limit: 500 }));
  const duplicate = detectListingDuplicate(listing, pool, { excludeId: String(listing.id ?? '') });
  await emitDuplicateEvents(repos, String(listing.id), duplicate);
  return duplicate;
}

/**
 * @param {Awaited<ReturnType<typeof createEdgeRepositories>>} repos
 * @param {typeof runListingAnalysisPipeline} runAnalysis
 * @param {Record<string, unknown>[]} normalizedRows
 * @param {boolean} analyze
 */
export async function executeListingsImport(repos, runAnalysis, normalizedRows, analyze) {
  const created_ids = [];
  const errors = [];
  let analyzed_count = 0;

  for (const row of normalizedRows) {
    try {
      const listing = await repos.createListing({
        ...row,
        source_type: 'admin_import',
        status: 'draft'
      });

      await repos.createEvent({
        listing_id: listing.id,
        event_type: 'listing_imported',
        payload: {
          source_type: 'admin_import',
          category: listing.category,
          import_format: 'bulk'
        }
      });

      await runPostCreateDuplicateCheck(repos, listing);

      created_ids.push(listing.id);

      if (analyze) {
        const pipeline = await runAnalysis({ listing });
        if (!pipeline.ok || !pipeline.analysis) {
          errors.push({
            listing_id: listing.id,
            message: 'Analysis pipeline failed',
            details: pipeline.errors ?? null
          });
        } else {
          const saved = await repos.createAnalysis(listing.id, pipeline.analysis, ANALYSIS_ENGINE_VERSION);
          await repos.createEvent({
            listing_id: listing.id,
            event_type: 'listing_analyzed',
            payload: {
              analysis_id: saved.id,
              ai_score: saved.ai_score,
              rank_score: pipeline.context?.recommendation?.score ?? saved.ai_score ?? null,
              import_batch: true
            }
          });
          analyzed_count += 1;
        }
      }
    } catch (err) {
      errors.push({
        message: err instanceof Error ? err.message : 'Failed to create listing',
        row: row
      });
    }
  }

  return {
    created_count: created_ids.length,
    analyzed_count,
    created_ids,
    errors
  };
}

/**
 * @param {Request} req
 * @param {HandlerDeps} deps
 */
export async function handleAiListingsRequest(req, deps) {
  const origin = req.headers.get('Origin');

  try {
    if (req.method === 'OPTIONS') {
      return preflightResponse(origin);
    }

    const auth = authorizeRequestWithPublicRead(req, deps.env);
    if (!auth.ok) {
      return errorResponse(auth.code, auth.message, auth.status, undefined, origin);
    }

    const supabaseUrl = deps.env.SUPABASE_URL;
    const serviceRoleKey = deps.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse(
        EDGE_ERROR_CODES.INTERNAL_ERROR,
        'Supabase service configuration is missing',
        500,
        undefined,
        origin
      );
    }

    const client = deps.createServiceClient(supabaseUrl, serviceRoleKey);
    const repos = (deps.createRepositories ?? createEdgeRepositories)(client);
    const runAnalysis = deps.runAnalysis ?? runListingAnalysisPipeline;

    const url = new URL(req.url);
    const route = parseAiListingsRoute(url.pathname);

    if (route.resource === 'learning') {
      return handleLearningRoute(repos, req, route, deps.env, origin);
    }

    if (route.resource === 'data-pool') {
      return handleDataPoolRoute(repos, req, route, origin);
    }

    if (route.resource === 'personalization') {
      return handlePersonalizationRoute(req, route, origin);
    }

    if (route.resource !== 'listings') {
      return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Route not found', 404, undefined, origin);
    }

    if (route.id === 'public' && route.action === null && req.method === 'GET') {
      return handlePublicListingsRoute(repos, deps.env, origin);
    }

    // POST /listings
    if (route.id === null && req.method === 'POST') {
      const body = await req.json().catch(() => null);
      const validation = validateCreateListingBody(body);
      if (!validation.ok) {
        return errorResponse(validation.code, validation.message, 400, validation.details, origin);
      }

      const listing = await repos.createListing(validation.value);
      await repos.createEvent({
        listing_id: listing.id,
        event_type: 'listing_created',
        payload: { source_type: listing.source_type, category: listing.category }
      });

      const duplicate = await runPostCreateDuplicateCheck(repos, listing);

      return jsonResponse(successBody({ listing, duplicate: toDuplicateOutput(duplicate) }), 201, origin);
    }

    // POST /listings/import
    if (route.id === 'import' && route.action === null && req.method === 'POST') {
      const body = await req.json().catch(() => null);
      const requestValidation = validateImportRequestBody(body);
      if (!requestValidation.ok) {
        return errorResponse(EDGE_ERROR_CODES.INVALID_REQUEST, requestValidation.message, 400, undefined, origin);
      }

      let preview;
      try {
        preview = buildImportPreview(
          requestValidation.value.format,
          requestValidation.value.content
        );
      } catch (err) {
        return errorResponse(
          EDGE_ERROR_CODES.INVALID_REQUEST,
          err instanceof Error ? err.message : 'Import content is invalid',
          400,
          undefined,
          origin
        );
      }

      const importResult = await executeListingsImport(
        repos,
        runAnalysis,
        preview.normalized_rows,
        requestValidation.value.analyze
      );

      return jsonResponse(
        successBody({
          total_count: preview.total_count,
          created_count: importResult.created_count,
          invalid_count: preview.invalid_rows,
          analyzed_count: importResult.analyzed_count,
          created_ids: importResult.created_ids,
          errors: [...preview.row_errors, ...importResult.errors]
        }),
        201,
        origin
      );
    }

    // GET /listings
    if (route.id === null && req.method === 'GET') {
      const filters = parseListFilters(url.searchParams);
      const listings = await repos.listListings(filters);
      const enriched = await Promise.all(
        listings.map(async (listing) => ({
          ...listing,
          latest_analysis: await repos.getLatestAnalysis(listing.id)
        }))
      );
      return jsonResponse(successBody({ listings: enriched, filters }), 200, origin);
    }

    if (!route.id) {
      return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Route not found', 404, undefined, origin);
    }

    // GET /listings/:id
    if (route.action === null && req.method === 'GET') {
      const listing = await repos.getListingById(route.id);
      if (!listing) {
        return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Listing not found', 404, undefined, origin);
      }
      const latest_analysis = await repos.getLatestAnalysis(route.id);
      return jsonResponse(successBody({ listing, latest_analysis }), 200, origin);
    }

    // PATCH /listings/:id
    if (route.action === null && req.method === 'PATCH') {
      const body = await req.json().catch(() => null);
      const validation = validatePatchListingBody(body);
      if (!validation.ok) {
        return errorResponse(validation.code, validation.message, 400, validation.details, origin);
      }

      const existing = await repos.getListingById(route.id);
      if (!existing) {
        return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Listing not found', 404, undefined, origin);
      }

      const listing = await repos.updateListing(route.id, validation.value);
      await repos.createEvent({
        listing_id: listing.id,
        event_type: 'listing_updated',
        payload: { fields: Object.keys(validation.value) }
      });

      return jsonResponse(successBody({ listing }), 200, origin);
    }

    // POST /listings/:id/submit-review
    if (route.action === QA_ACTIONS.SUBMIT_REVIEW && req.method === 'POST') {
      const result = await applyWorkflowTransition(repos, route.id, QA_ACTIONS.SUBMIT_REVIEW);
      if (!result.ok) return errorResponse(result.code, result.message, result.status, undefined, origin);
      return jsonResponse(successBody({ listing: result.listing }), 200, origin);
    }

    // POST /listings/:id/approve
    if (route.action === QA_ACTIONS.APPROVE && req.method === 'POST') {
      const result = await applyWorkflowTransition(repos, route.id, QA_ACTIONS.APPROVE);
      if (!result.ok) return errorResponse(result.code, result.message, result.status, undefined, origin);
      return jsonResponse(successBody({ listing: result.listing }), 200, origin);
    }

    // POST /listings/:id/reject
    if (route.action === QA_ACTIONS.REJECT && req.method === 'POST') {
      const body = await req.json().catch(() => null);
      const validation = validateRejectBody(body);
      if (!validation.ok) {
        return errorResponse(validation.code, validation.message, 400, undefined, origin);
      }

      const result = await applyWorkflowTransition(repos, route.id, QA_ACTIONS.REJECT, {
        reason: validation.value.reason
      });
      if (!result.ok) return errorResponse(result.code, result.message, result.status, undefined, origin);
      return jsonResponse(successBody({ listing: result.listing, reason: validation.value.reason }), 200, origin);
    }

    // POST /listings/:id/archive
    if (route.action === QA_ACTIONS.ARCHIVE && req.method === 'POST') {
      const result = await applyWorkflowTransition(repos, route.id, QA_ACTIONS.ARCHIVE);
      if (!result.ok) return errorResponse(result.code, result.message, result.status, undefined, origin);
      return jsonResponse(successBody({ listing: result.listing }), 200, origin);
    }

    // POST /listings/:id/analyze
    if (route.action === 'analyze' && req.method === 'POST') {
      const listing = await repos.getListingById(route.id);
      if (!listing) {
        return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Listing not found', 404, undefined, origin);
      }

      const pipeline = await runAnalysis({ listing });
      if (!pipeline.ok || !pipeline.analysis) {
        return errorResponse(
          EDGE_ERROR_CODES.INTERNAL_ERROR,
          'Analysis pipeline failed',
          500,
          pipeline.errors,
          origin
        );
      }

      const saved = await repos.createAnalysis(route.id, pipeline.analysis, ANALYSIS_ENGINE_VERSION);
      const duplicate = detectListingDuplicate(listing, await repos.listListings({ limit: 500 }), {
        excludeId: route.id
      });
      await repos.createEvent({
        listing_id: route.id,
        event_type: 'listing_analyzed',
        payload: {
          analysis_id: saved.id,
          ai_score: saved.ai_score,
          rank_score: pipeline.context?.recommendation?.score ?? saved.ai_score ?? null
        }
      });

      return jsonResponse(
        successBody({
          listing,
          analysis: saved,
          context: {
            ...pipeline.context,
            duplicate: toDuplicateOutput(duplicate)
          }
        }),
        200,
        origin
      );
    }

    // POST /listings/:id/publish
    if (route.action === QA_ACTIONS.PUBLISH && req.method === 'POST') {
      const result = await applyWorkflowTransition(repos, route.id, QA_ACTIONS.PUBLISH);
      if (!result.ok) return errorResponse(result.code, result.message, result.status, undefined, origin);
      return jsonResponse(successBody({ listing: result.listing }), 200, origin);
    }

    // POST /listings/:id/unpublish
    if (route.action === QA_ACTIONS.UNPUBLISH && req.method === 'POST') {
      const result = await applyWorkflowTransition(repos, route.id, QA_ACTIONS.UNPUBLISH);
      if (!result.ok) return errorResponse(result.code, result.message, result.status, undefined, origin);
      return jsonResponse(successBody({ listing: result.listing }), 200, origin);
    }

    // POST /listings/:id/reanalyze
    if (route.action === QA_ACTIONS.REANALYZE && req.method === 'POST') {
      const listing = await repos.getListingById(route.id);
      if (!listing) {
        return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Listing not found', 404, undefined, origin);
      }

      const transition = resolveStatusTransition(listing.status, QA_ACTIONS.REANALYZE);
      if (!transition.ok) {
        return errorResponse(EDGE_ERROR_CODES.INVALID_REQUEST, transition.message, 400, undefined, origin);
      }

      const pipeline = await runAnalysis({ listing });
      if (!pipeline.ok || !pipeline.analysis) {
        return errorResponse(
          EDGE_ERROR_CODES.INTERNAL_ERROR,
          'Analysis pipeline failed',
          500,
          pipeline.errors,
          origin
        );
      }

      const saved = await repos.createAnalysis(route.id, pipeline.analysis, ANALYSIS_ENGINE_VERSION);
      const duplicate = detectListingDuplicate(listing, await repos.listListings({ limit: 500 }), {
        excludeId: route.id
      });
      await repos.createEvent({
        listing_id: route.id,
        event_type: eventTypeForAction(QA_ACTIONS.REANALYZE),
        payload: {
          analysis_id: saved.id,
          ai_score: saved.ai_score,
          rank_score: pipeline.context?.recommendation?.score ?? saved.ai_score ?? null
        }
      });

      return jsonResponse(
        successBody({
          listing,
          analysis: saved,
          context: {
            ...pipeline.context,
            duplicate: toDuplicateOutput(duplicate)
          }
        }),
        200,
        origin
      );
    }

    // GET /listings/:id/events
    if (route.action === 'events' && req.method === 'GET') {
      const listing = await repos.getListingById(route.id);
      if (!listing) {
        return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Listing not found', 404, undefined, origin);
      }

      const events = await repos.listEventsByListingId(route.id);
      return jsonResponse(successBody({ listing_id: route.id, events }), 200, origin);
    }

    return errorResponse(EDGE_ERROR_CODES.NOT_FOUND, 'Route not found', 404, undefined, origin);
  } catch (err) {
    const mapped = /** @type {{ code?: string, message?: string, cause?: unknown }} */ (err);
    if (mapped?.code && Object.values(EDGE_ERROR_CODES).includes(mapped.code)) {
      const status =
        mapped.code === EDGE_ERROR_CODES.NOT_FOUND
          ? 404
          : mapped.code === EDGE_ERROR_CODES.DB_ERROR
            ? 500
            : 500;
      return errorResponse(mapped.code, mapped.message || mapped.code, status, undefined, origin);
    }

    return errorResponse(
      EDGE_ERROR_CODES.INTERNAL_ERROR,
      'Unexpected server error',
      500,
      undefined,
      origin
    );
  }
}
