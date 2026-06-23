/**
 * Public TÜİK reference snapshot (sanitized static metadata). No upstream fetch or secrets.
 */
import tuikReferenceRaw from '../../js/data/tuik-reference-snapshot-data.js';
import {
  getTuikReferenceCategories,
  getTuikReferenceCategoriesForVertical,
  normalizeTuikReferenceSnapshot
} from '../../js/data/tuik-reference-model.js';
import { resolveCorsOrigin } from '../_shared/cors-origins.js';
import { jsonApiHead, jsonApiSuccess, logApiEvent } from '../_shared/api-response.js';

const TUIK_PUBLIC_STATUS = 'reference';
const TUIK_PUBLIC_SOURCE = 'tuik';
const TUIK_STATIC_UPSTREAM = 'static';
const TUIK_SNAPSHOT_PATH = 'data/snapshots/tuik-reference.json';

const ATTRIBUTION_PROVIDER = 'Türkiye İstatistik Kurumu (TÜİK)';

const corsHeaders = (origin = null) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
});

/** Public API source for static TÜİK reference metadata. */
export function toPublicTuikSource() {
  return TUIK_PUBLIC_SOURCE;
}

function loadNormalizedSnapshot(raw = tuikReferenceRaw) {
  return normalizeTuikReferenceSnapshot(raw);
}

function resolveCategories(snapshot, verticalParam) {
  const vertical = String(verticalParam || '').trim();
  if (!vertical) {
    return getTuikReferenceCategories(snapshot);
  }
  return getTuikReferenceCategoriesForVertical(snapshot, vertical);
}

/**
 * @param {object} snapshot
 * @param {{ vertical?: string, fetchedAt?: string }} [options]
 */
export function buildTuikSnapshotPayload(snapshot, { vertical = '', fetchedAt = new Date().toISOString() } = {}) {
  const categories = resolveCategories(snapshot, vertical);

  return {
    status: TUIK_PUBLIC_STATUS,
    source: TUIK_PUBLIC_SOURCE,
    fetchedAt,
    lastReviewed: snapshot.lastReviewed || '',
    accessMode: snapshot.accessMode || '',
    categories,
    attribution: {
      provider: ATTRIBUTION_PROVIDER,
      url: snapshot.officialUrl || '',
      disclaimer: snapshot.disclaimer || ''
    }
  };
}

function buildMeta(categories = []) {
  return {
    upstream: TUIK_STATIC_UPSTREAM,
    scoreImpact: false,
    categoryCount: categories.length
  };
}

function buildDebugPayload() {
  return {
    sourceDetail: 'static',
    snapshotSource: TUIK_SNAPSHOT_PATH
  };
}

function buildFallbackResponse(fetchedAt = new Date().toISOString()) {
  const snapshot = normalizeTuikReferenceSnapshot(null);
  const payload = buildTuikSnapshotPayload(snapshot, { fetchedAt });
  return {
    payload,
    meta: buildMeta(payload.categories)
  };
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function onRequestHead(context) {
  const origin = context.request.headers.get('Origin');
  return jsonApiHead(corsHeaders(origin));
}

export async function onRequestGet(context) {
  const origin = context.request.headers.get('Origin');
  const url = new URL(context.request.url);
  const debug = url.searchParams.get('debug') === '1';
  const vertical = url.searchParams.get('vertical') || '';

  try {
    const fetchedAt = new Date().toISOString();
    const snapshot = loadNormalizedSnapshot();
    const payload = buildTuikSnapshotPayload(snapshot, { vertical, fetchedAt });
    const meta = buildMeta(payload.categories);

    if (debug) {
      payload.debug = buildDebugPayload();
    }

    logApiEvent('info', 'tuik_snapshot_served', {
      status: payload.status,
      source: payload.source,
      categoryCount: meta.categoryCount,
      vertical: vertical || null
    });

    return jsonApiSuccess(payload, 200, corsHeaders(origin), meta);
  } catch (error) {
    const message = error?.message || 'unknown';
    logApiEvent('error', 'tuik_snapshot_handler_error', { message });

    const { payload, meta } = buildFallbackResponse();
    if (debug) {
      payload.debug = buildDebugPayload();
    }

    return jsonApiSuccess(payload, 200, corsHeaders(origin), {
      ...meta,
      degraded: true
    });
  }
}
