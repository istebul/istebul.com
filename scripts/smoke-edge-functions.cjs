#!/usr/bin/env node
/**
 * Production Edge Function boot smoke — detects LOAD_FUNCTION_ERROR / stale bundle.
 * Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/smoke-edge-functions.cjs
 */
const FAIL_STATUSES = new Set([502, 503, 504, 404]);
const PASS_STATUSES = new Set([200, 204, 400, 401, 403, 405]);

/** @type {Array<{ name: string, method?: string, body?: string, requireStatus?: number, requireBodyIncludes?: string }>} */
const PROBES = [
  { name: 'auto-intake', method: 'OPTIONS' },
  { name: 'lifecycle-cron', method: 'OPTIONS' },
  { name: 'warehouse-cycle-count-cron', method: 'OPTIONS' },
  { name: 'lifecycle-enroll', method: 'OPTIONS' },
  {
    name: 'lifecycle-enroll',
    method: 'POST',
    body: '{}',
    requireStatus: 400,
    requireBodyIncludes: 'flow_id_required'
  }
];

function normalizeBaseUrl(raw) {
  return String(raw || '').trim().replace(/\/$/, '');
}

function hasLoadFunctionError(bodyText, sbErrorCode) {
  if (sbErrorCode && String(sbErrorCode).toUpperCase() === 'LOAD_FUNCTION_ERROR') {
    return true;
  }
  const text = String(bodyText || '');
  if (!text) return false;
  if (text.includes('LOAD_FUNCTION_ERROR')) return true;
  try {
    const parsed = JSON.parse(text);
    const code = String(parsed?.code || '').toUpperCase();
    const message = String(parsed?.message || '');
    if (code === 'LOAD_FUNCTION_ERROR') return true;
    if (message.includes('LOAD_FUNCTION_ERROR')) return true;
    if (message.toLowerCase().includes('failed to load edge function')) return true;
  } catch {
    /* non-JSON body */
  }
  return false;
}

function logProbeResult(probe, status, result, detail = '') {
  const method = probe.method || 'OPTIONS';
  const suffix = detail ? ` (${detail})` : '';
  console.log(`function=${probe.name} method=${method} status=${status} ${result}${suffix}`);
}

/**
 * @param {string} baseUrl
 * @param {string} anonKey
 * @param {{ name: string, method?: string, body?: string, requireStatus?: number, requireBodyIncludes?: string }} probe
 */
async function smokeProbe(baseUrl, anonKey, probe) {
  const path = `/functions/v1/${probe.name}`;
  const endpoint = `${baseUrl}${path}`;
  const method = probe.method || 'OPTIONS';
  /** @type {Record<string, string>} */
  const headers = { apikey: anonKey };

  if (method === 'POST') {
    headers.Authorization = `Bearer ${anonKey}`;
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(endpoint, {
    method,
    headers,
    body: probe.body
  });

  const bodyText = await res.text();
  const sbErrorCode = res.headers.get('sb-error-code');

  if (hasLoadFunctionError(bodyText, sbErrorCode)) {
    logProbeResult(probe, res.status, 'FAIL', 'LOAD_FUNCTION_ERROR');
    return false;
  }

  if (FAIL_STATUSES.has(res.status)) {
    logProbeResult(probe, res.status, 'FAIL', 'gateway/boot failure');
    return false;
  }

  if (probe.requireBodyIncludes) {
    const statusOk =
      probe.requireStatus != null ? res.status === probe.requireStatus : PASS_STATUSES.has(res.status);
    const bodyOk = bodyText.includes(probe.requireBodyIncludes);
    if (statusOk && bodyOk) {
      logProbeResult(probe, res.status, 'PASS');
      return true;
    }
    logProbeResult(probe, res.status, 'FAIL', 'expected validation response');
    return false;
  }

  if (PASS_STATUSES.has(res.status)) {
    logProbeResult(probe, res.status, 'PASS');
    return true;
  }

  logProbeResult(probe, res.status, 'FAIL', 'unexpected status');
  return false;
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.SUPABASE_URL);
  const anonKey = String(process.env.SUPABASE_ANON_KEY || '').trim();

  if (!baseUrl || !anonKey) {
    console.error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
    process.exit(1);
  }

  console.log(`\nsmoke-edge-functions → ${PROBES.length} probe(s)\n`);

  let ok = true;
  for (const probe of PROBES) {
    const passed = await smokeProbe(baseUrl, anonKey, probe);
    if (!passed) ok = false;
  }

  console.log(ok ? '\nEdge smoke passed.\n' : '\nEdge smoke failed.\n');
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error('edge smoke error:', err.message || err);
  process.exit(1);
});
