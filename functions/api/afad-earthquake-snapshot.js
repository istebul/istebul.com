/**
 * Public AFAD deprem risk snapshot (sanitized). Upstream çağrıları server-side kalır.
 */
import {
  fetchAfadRegionalRisk,
  normalizeTurkishText
} from '../../js/services/afad-service.js';
import { resolveCorsOrigin } from '../_shared/cors-origins.js';
import { jsonApiHead, jsonApiSuccess, logApiEvent } from '../_shared/api-response.js';

const corsHeaders = (origin = null) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=1800, stale-while-revalidate=21600'
});

function hasUsableRisk(snapshot = {}) {
  return (
    snapshot.earthquakeRiskScore != null ||
    snapshot.seismicBaseRisk != null ||
    Boolean(snapshot.earthquakeSummary)
  );
}

/** Public API source: sağlıklı AFAD verisi "afad" olarak döner. */
export function toPublicAfadSource(snapshot = {}) {
  const internal = snapshot.source;
  if (internal === 'live' || internal === 'cache') return 'afad';
  if (internal === 'stale' && hasUsableRisk(snapshot)) return 'afad';
  return 'fallback';
}

export function buildFallbackReason(snapshot = {}) {
  const internal = snapshot.source;
  if (internal === 'stale') {
    const detail = snapshot.errors?.[0]?.message || 'upstream_unavailable';
    return `Canlı AFAD yanıtı alınamadı; önbellekteki son veri kullanılıyor (${detail})`;
  }
  if (internal === 'fallback') {
    const detail = snapshot.errors?.[0]?.message;
    return detail
      ? `AFAD canlı veri çekilemedi (${detail}); statik bölgesel risk profili kullanıldı`
      : 'AFAD canlı veri çekilemedi; statik bölgesel risk profili kullanıldı';
  }
  return null;
}

function buildDebugPayload(snapshot, { handlerError = null } = {}) {
  const fallbackReason =
    handlerError != null
      ? `API işleyici hatası (${handlerError})`
      : buildFallbackReason(snapshot);
  const publicSource = handlerError != null ? 'fallback' : toPublicAfadSource(snapshot);

  return {
    errors: snapshot.errors || [],
    sourceDetail: snapshot.source,
    publicSource,
    fallbackReason: fallbackReason || null,
    configured: snapshot.configured !== false,
    eventCount: snapshot.eventCount ?? 0,
    hasLiveActivity: Boolean(snapshot.hasLiveActivity)
  };
}

function buildSnapshotPayload(snapshot) {
  const publicSource = toPublicAfadSource(snapshot);
  const status =
    publicSource === 'afad' ? 'connected' : snapshot.configured === false ? 'unconfigured' : 'degraded';

  return {
    status,
    source: publicSource,
    fetchedAt: snapshot.fetchedAt,
    dataDate: snapshot.dataDate,
    location: snapshot.location || {},
    earthquakeRiskScore: snapshot.earthquakeRiskScore ?? null,
    earthquakeActivityLevel: snapshot.earthquakeActivityLevel ?? 'sakin',
    earthquakeSummary: snapshot.earthquakeSummary ?? '',
    riskLevel: snapshot.riskLevel ?? 'orta',
    seismicBaseRisk: snapshot.seismicBaseRisk ?? null,
    activityScore: snapshot.activityScore ?? null,
    eventCount: snapshot.eventCount ?? 0,
    maxMagnitude: snapshot.maxMagnitude ?? 0,
    avgMagnitude: snapshot.avgMagnitude ?? 0,
    significantCount: snapshot.significantCount ?? 0,
    recentEvents: Array.isArray(snapshot.recentEvents) ? snapshot.recentEvents : [],
    attribution: {
      provider: 'AFAD Deprem Dairesi',
      url: 'https://deprem.afad.gov.tr/',
      disclaimer:
        publicSource === 'afad'
          ? 'Bilgilendirme amaçlı resmi deprem olay verisi; zemin etüdü veya yapı güvenliği taahhüdü değildir.'
          : 'AFAD verisi geçici olarak kullanılamıyor; statik bölgesel risk profili gösteriliyor.'
    }
  };
}

function parseLocationFromRequest(request) {
  const url = new URL(request.url);
  const province = String(url.searchParams.get('city') || url.searchParams.get('province') || '').trim();
  const district = String(url.searchParams.get('district') || '').trim();
  return { province, district };
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
  const debug = new URL(context.request.url).searchParams.get('debug') === '1';
  const location = parseLocationFromRequest(context.request);

  if (!location.province) {
    return jsonApiSuccess(
      {
        status: 'degraded',
        source: 'fallback',
        location: { province: null, district: null },
        earthquakeRiskScore: null,
        earthquakeActivityLevel: 'sakin',
        earthquakeSummary: '',
        attribution: {
          provider: 'AFAD Deprem Dairesi',
          url: 'https://deprem.afad.gov.tr/',
          disclaimer: 'İl bilgisi gerekli.'
        }
      },
      200,
      corsHeaders(origin),
      { fallbackReason: 'city veya province parametresi gerekli' }
    );
  }

  try {
    const snapshot = await fetchAfadRegionalRisk(location, { fetchImpl: fetch });
    const payload = buildSnapshotPayload(snapshot);
    const fallbackReason = buildFallbackReason(snapshot);
    const meta = {
      stale: snapshot.source === 'stale',
      errorCount: snapshot.errors?.length || 0,
      sourceDetail: snapshot.source,
      locationKey: `${normalizeTurkishText(location.province)}|${normalizeTurkishText(location.district)}`
    };
    if (fallbackReason) meta.fallbackReason = fallbackReason;
    if (debug) payload.debug = buildDebugPayload(snapshot);

    logApiEvent('info', 'afad_earthquake_snapshot_served', {
      status: payload.status,
      source: payload.source,
      sourceDetail: snapshot.source,
      province: location.province,
      district: location.district,
      hasData: hasUsableRisk(snapshot)
    });

    return jsonApiSuccess(payload, 200, corsHeaders(origin), meta);
  } catch (error) {
    const message = error?.message || 'unknown';
    logApiEvent('error', 'afad_earthquake_snapshot_handler_error', { message });

    const payload = {
      status: 'degraded',
      source: 'fallback',
      fetchedAt: null,
      dataDate: null,
      location,
      earthquakeRiskScore: null,
      earthquakeActivityLevel: 'sakin',
      earthquakeSummary: '',
      attribution: {
        provider: 'AFAD Deprem Dairesi',
        url: 'https://deprem.afad.gov.tr/',
        disclaimer: 'Veri geçici olarak kullanılamıyor.'
      }
    };
    const meta = { degraded: true, fallbackReason: `API işleyici hatası (${message})` };
    if (debug) payload.debug = buildDebugPayload({ source: 'fallback', errors: [{ message }] }, { handlerError: message });

    return jsonApiSuccess(payload, 200, corsHeaders(origin), meta);
  }
}
