#!/usr/bin/env node
/**
 * Production Edge Function boot smoke — detects LOAD_FUNCTION_ERROR / stale bundle.
 * Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/smoke-edge-functions.cjs
 */
const FUNCTION_NAME = 'auto-intake';
const PATH = `/functions/v1/${FUNCTION_NAME}`;

const FAIL_STATUSES = new Set([502, 503, 504, 404]);
const PASS_STATUSES = new Set([200, 204, 400, 401, 403, 405]);

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

async function smokeFunction(baseUrl, anonKey) {
  const endpoint = `${baseUrl}${PATH}`;
  const res = await fetch(endpoint, {
    method: 'OPTIONS',
    headers: {
      apikey: anonKey
    }
  });

  const bodyText = await res.text();
  const sbErrorCode = res.headers.get('sb-error-code');

  console.log(
    `function=${FUNCTION_NAME} path=${PATH} status=${res.status} sb-error-code=${sbErrorCode || '(none)'}`
  );

  if (hasLoadFunctionError(bodyText, sbErrorCode)) {
    console.error(`✗ ${FUNCTION_NAME}: LOAD_FUNCTION_ERROR detected`);
    return false;
  }

  if (FAIL_STATUSES.has(res.status)) {
    console.error(`✗ ${FUNCTION_NAME}: HTTP ${res.status} (gateway/boot failure)`);
    return false;
  }

  if (PASS_STATUSES.has(res.status)) {
    console.log(`✓ ${FUNCTION_NAME}: worker boot OK (HTTP ${res.status})`);
    return true;
  }

  console.error(`✗ ${FUNCTION_NAME}: unexpected HTTP ${res.status}`);
  return false;
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.SUPABASE_URL);
  const anonKey = String(process.env.SUPABASE_ANON_KEY || '').trim();

  if (!baseUrl || !anonKey) {
    console.error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
    process.exit(1);
  }

  console.log(`\nsmoke-edge-functions → ${PATH}\n`);

  const ok = await smokeFunction(baseUrl, anonKey);
  console.log(ok ? '\nEdge smoke passed.\n' : '\nEdge smoke failed.\n');
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error('edge smoke error:', err.message || err);
  process.exit(1);
});
