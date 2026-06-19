/**
 * Public TCMB EVDS snapshot (sanitized). API key stays in env.TCMB_EVDS_API_KEY only.
 */
import {
  fetchEvdsSnapshot,
  EVDS_SNAPSHOT_SERIES_MAP,
  resolveEvdsApiKey
} from '../../js/services/evds-service.js';
import { resolveCorsOrigin } from '../_shared/cors-origins.js';
import { jsonApiHead, jsonApiSuccess, logApiEvent } from '../_shared/api-response.js';

const corsHeaders = (origin = null) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
});

function hasUsableRates(rates = {}) {
  return (
    rates.usdTry != null ||
    rates.eurTry != null ||
    rates.policyRate != null ||
    rates.cpiAnnual != null ||
    rates.housingLoanRate != null
  );
}

/** Public API source: healthy EVDS data surfaces as "evds". */
export function toPublicEvdsSource(snapshot = {}) {
  const internal = snapshot.source;
  if (internal === 'live' || internal === 'cache') return 'evds';
  if (internal === 'stale' && hasUsableRates(snapshot.rates)) return 'evds';
  return 'fallback';
}

export function buildFallbackReason(snapshot = {}, env = {}) {
  const internal = snapshot.source;
  const apiKeyConfigured = Boolean(resolveEvdsApiKey(env));

  if (!apiKeyConfigured) {
    return 'TCMB_EVDS_API_KEY (veya EVDS_API_KEY) ortam değişkeni tanımlı değil';
  }
  if (internal === 'unconfigured') {
    return 'EVDS API anahtarı yapılandırılmamış';
  }
  if (internal === 'stale') {
    const detail = snapshot.errors?.[0]?.message || 'upstream_unavailable';
    return `Canlı EVDS yanıtı alınamadı; önbellekteki son veri kullanılıyor (${detail})`;
  }
  if (internal === 'fallback') {
    const detail = snapshot.errors?.[0]?.message;
    return detail ? `EVDS canlı veri çekilemedi (${detail})` : 'EVDS canlı veri çekilemedi';
  }
  return null;
}

function buildDebugPayload(snapshot, env, { handlerError = null } = {}) {
  const fallbackReason =
    handlerError != null
      ? `API işleyici hatası (${handlerError})`
      : buildFallbackReason(snapshot, env);
  const publicSource = handlerError != null ? 'fallback' : toPublicEvdsSource(snapshot);

  return {
    seriesCodes: EVDS_SNAPSHOT_SERIES_MAP,
    errors: snapshot.errors || [],
    sourceDetail: snapshot.source,
    publicSource,
    fallbackReason: fallbackReason || null,
    apiKeyConfigured: Boolean(resolveEvdsApiKey(env)),
    configured: snapshot.configured !== false
  };
}

function buildSnapshotPayload(snapshot, env) {
  const publicSource = toPublicEvdsSource(snapshot);
  const status =
    publicSource === 'evds' ? 'connected' : snapshot.configured === false ? 'unconfigured' : 'degraded';

  return {
    status,
    source: publicSource,
    fetchedAt: snapshot.fetchedAt,
    dataDate: snapshot.dataDate,
    rates: snapshot.rates,
    seriesDates: snapshot.seriesDates,
    attribution: {
      provider: 'TCMB EVDS',
      url: 'https://evds3.tcmb.gov.tr/',
      disclaimer:
        publicSource === 'evds'
          ? 'Bilgilendirme amaçlı referans veriler; bağlayıcı teklif veya resmi kurum taahhüdü değildir.'
          : 'Veri geçici olarak kullanılamıyor.'
    }
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
  const debug = new URL(context.request.url).searchParams.get('debug') === '1';

  try {
    const snapshot = await fetchEvdsSnapshot(context.env);
    const payload = buildSnapshotPayload(snapshot, context.env);
    const fallbackReason = buildFallbackReason(snapshot, context.env);
    const meta = {
      stale: snapshot.source === 'stale',
      errorCount: snapshot.errors?.length || 0,
      sourceDetail: snapshot.source
    };
    if (fallbackReason) {
      meta.fallbackReason = fallbackReason;
    }

    if (debug) {
      payload.debug = buildDebugPayload(snapshot, context.env);
    }

    logApiEvent('info', 'evds_snapshot_served', {
      status: payload.status,
      source: payload.source,
      sourceDetail: snapshot.source,
      hasData: hasUsableRates(snapshot.rates)
    });

    return jsonApiSuccess(payload, 200, corsHeaders(origin), meta);
  } catch (error) {
    const message = error?.message || 'unknown';
    logApiEvent('error', 'evds_snapshot_handler_error', { message });

    const emptyRates = {
      usdTry: null,
      eurTry: null,
      policyRate: null,
      cpiAnnual: null,
      housingLoanRate: null
    };
    const payload = {
      status: 'degraded',
      source: 'fallback',
      fetchedAt: null,
      dataDate: null,
      rates: emptyRates,
      seriesDates: {},
      attribution: {
        provider: 'TCMB EVDS',
        url: 'https://evds3.tcmb.gov.tr/',
        disclaimer: 'Veri geçici olarak kullanılamıyor.'
      }
    };
    const meta = {
      degraded: true,
      fallbackReason: `API işleyici hatası (${message})`
    };

    if (debug) {
      payload.debug = buildDebugPayload(
        { source: 'fallback', configured: true, rates: emptyRates, errors: [{ message }] },
        context.env,
        { handlerError: message }
      );
    }

    return jsonApiSuccess(payload, 200, corsHeaders(origin), meta);
  }
}
