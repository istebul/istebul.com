/**
 * Public TCMB EVDS snapshot (sanitized). API key stays in env.TCMB_EVDS_API_KEY only.
 */
import { fetchEvdsSnapshot } from '../../js/services/evds-service.js';
import { resolveCorsOrigin } from '../_shared/cors-origins.js';
import { jsonApiHead, jsonApiSuccess, logApiEvent } from '../_shared/api-response.js';

const corsHeaders = (origin = null) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
});

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
      url: 'https://evds3.tcmb.gov.tr/',
      disclaimer:
        'Bilgilendirme amaçlı referans veriler; bağlayıcı teklif veya resmi kurum taahhüdü değildir.'
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

  try {
    const snapshot = await fetchEvdsSnapshot(context.env);
    const payload = buildSnapshotPayload(snapshot);
    const meta = {
      stale: snapshot.source === 'stale',
      errorCount: snapshot.errors?.length || 0
    };

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

    return jsonApiSuccess(
      {
        status: 'degraded',
        source: 'fallback',
        fetchedAt: null,
        dataDate: null,
        rates: { usdTry: null, eurTry: null, policyRate: null, cpiAnnual: null, housingLoanRate: null },
        seriesDates: {},
        attribution: {
          provider: 'TCMB EVDS',
          url: 'https://evds3.tcmb.gov.tr/',
          disclaimer: 'Veri geçici olarak kullanılamıyor.'
        }
      },
      200,
      corsHeaders(origin),
      { degraded: true }
    );
  }
}
