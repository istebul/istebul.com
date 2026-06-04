/**
 * Public TCMB EVDS snapshot (sanitized). API key stays in env.TCMB_EVDS_API_KEY only.
 */
import { fetchEvdsDebugReport, fetchEvdsSnapshot } from '../../js/services/evds-service.js';
import { resolveCorsOrigin } from '../_shared/cors-origins.js';
import { jsonApiSuccess, logApiEvent } from '../_shared/api-response.js';

const corsHeaders = (origin = null) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(origin),
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
});

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

const debugCorsHeaders = (origin = null) => ({
  ...corsHeaders(origin),
  'Cache-Control': 'no-store'
});

export async function onRequestGet(context) {
  const origin = context.request.headers.get('Origin');
  const debugMode = new URL(context.request.url).searchParams.get('debug') === '1';

  // TEMPORARY: safe upstream diagnostics — remove after EVDS incident is resolved.
  if (debugMode) {
    try {
      const report = await fetchEvdsDebugReport(context.env);
      logApiEvent('warn', 'evds_snapshot_debug_served', {
        configured: report.configured,
        probeCount: report.probes?.length || 0
      });
      return jsonApiSuccess(report, 200, debugCorsHeaders(origin), {
        debug: true,
        temporary: true
      });
    } catch (error) {
      logApiEvent('error', 'evds_snapshot_debug_error', {
        message: error?.message || 'unknown'
      });
      return jsonApiSuccess(
        {
          debug: true,
          temporary: true,
          configured: Boolean(String(context.env?.TCMB_EVDS_API_KEY || '').trim()),
          errorMessage: error?.message || 'debug_probe_failed',
          probes: []
        },
        200,
        debugCorsHeaders(origin),
        { debug: true, temporary: true }
      );
    }
  }

  try {
    const snapshot = await fetchEvdsSnapshot(context.env);
    const status = snapshot.configured ? 'connected' : 'unconfigured';
    const hasData =
      snapshot.rates.usdTry != null ||
      snapshot.rates.eurTry != null ||
      snapshot.rates.policyRate != null ||
      snapshot.rates.cpiAnnual != null;

    logApiEvent('info', 'evds_snapshot_served', {
      status,
      source: snapshot.source,
      hasData
    });

    return jsonApiSuccess(
      {
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
      },
      200,
      corsHeaders(origin),
      {
        stale: snapshot.source === 'stale',
        errorCount: snapshot.errors?.length || 0
      }
    );
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
          url: 'https://evds2.tcmb.gov.tr/',
          disclaimer: 'Veri geçici olarak kullanılamıyor.'
        }
      },
      200,
      corsHeaders(origin),
      { degraded: true }
    );
  }
}
