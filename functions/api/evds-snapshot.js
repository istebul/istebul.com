/**
 * Public TCMB EVDS snapshot (sanitized). API key stays in env.TCMB_EVDS_API_KEY only.
 */
import { fetchEvdsFxDebugProbe, fetchEvdsSnapshot } from '../../js/services/evds-service.js';
import { resolveCorsOrigin } from '../_shared/cors-origins.js';
import { jsonApiSuccess, logApiEvent } from '../_shared/api-response.js';

const corsHeaders = (origin = null) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
});

const debugCorsHeaders = (origin = null) => ({
  ...corsHeaders(origin),
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  'CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache'
});

function isDebugRequest(request) {
  const debugParam = new URL(request.url).searchParams.get('debug');
  return debugParam === '1' || debugParam === 'true';
}

function buildSnapshotPayload(snapshot) {
  const status = snapshot.configured ? 'connected' : 'unconfigured';
  return {
    status,
    source: snapshot.source,
    fetchedAt: snapshot.fetchedAt,
    dataDate: snapshot.dataDate,
    rates: snapshot.rates,
    seriesDates: snapshot.seriesDates,
    attribution: {
      provider: 'TCMB EVDS',
      url: 'https://evds2.tcmb.gov.tr/',
      disclaimer:
        'Bilgilendirme amaçlı referans veriler; bağlayıcı teklif veya resmi kurum taahhüdü değildir.'
    }
  };
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function onRequestGet(context) {
  const origin = context.request.headers.get('Origin');
  const debugMode = isDebugRequest(context.request);

  try {
    const snapshot = await fetchEvdsSnapshot(context.env);
    const payload = buildSnapshotPayload(snapshot);
    const meta = {
      stale: snapshot.source === 'stale',
      errorCount: snapshot.errors?.length || 0
    };

    if (debugMode) {
      payload.debug = await fetchEvdsFxDebugProbe(context.env);
      logApiEvent('warn', 'evds_snapshot_debug_served', {
        status: payload.status,
        source: payload.source,
        evdsHttpStatus: payload.debug?.evdsHttpStatus ?? null,
        errorMessage: payload.debug?.errorMessage ?? null
      });
      return jsonApiSuccess(payload, 200, debugCorsHeaders(origin), {
        ...meta,
        debug: true,
        temporary: true
      });
    }

    logApiEvent('info', 'evds_snapshot_served', {
      status: payload.status,
      source: payload.source,
      hasData:
        snapshot.rates.usdTry != null ||
        snapshot.rates.eurTry != null ||
        snapshot.rates.policyRate != null ||
        snapshot.rates.cpiAnnual != null
    });

    return jsonApiSuccess(payload, 200, corsHeaders(origin), meta);
  } catch (error) {
    logApiEvent('error', 'evds_snapshot_handler_error', {
      message: error?.message || 'unknown'
    });

    const payload = {
      status: 'degraded',
      source: 'fallback',
      fetchedAt: null,
      dataDate: null,
      rates: { usdTry: null, eurTry: null, policyRate: null, cpiAnnual: null, housingLoanRate: null },
      seriesDates: {},
      attribution: {
        provider: 'TCMB EVDS',
        url: 'https://evds2.tcmb.gov.tr/',
        disclaimer: 'Veri geçici olarak kullanılamıyor.'
      }
    };

    if (debugMode) {
      try {
        payload.debug = await fetchEvdsFxDebugProbe(context.env);
      } catch (debugError) {
        payload.debug = {
          temporary: true,
          usedSeries: ['TP.DK.USD.A', 'TP.DK.EUR.A'],
          evdsRequestUrlMasked: null,
          evdsHttpStatus: null,
          evdsContentType: null,
          evdsBodyPreview: null,
          evdsTopLevelKeys: [],
          evdsItemsLength: null,
          evdsFirstItemKeys: [],
          normalizedFieldCandidates: ['TP_DK_USD_A', 'TP_DK_EUR_A'],
          errorMessage: debugError?.message || 'debug_probe_failed'
        };
      }
      return jsonApiSuccess(payload, 200, debugCorsHeaders(origin), {
        degraded: true,
        debug: true,
        temporary: true
      });
    }

    return jsonApiSuccess(payload, 200, corsHeaders(origin), { degraded: true });
  }
}
