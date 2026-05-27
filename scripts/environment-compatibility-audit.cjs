#!/usr/bin/env node
/**
 * Preview / staging / production compatibility checks (static).
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
let failed = 0;

const fail = (msg) => {
  console.error(`environment-compatibility-audit: FAIL — ${msg}`);
  failed += 1;
};

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const corsJs = read('functions/_shared/cors-origins.js');
const corsTs = read('supabase/functions/_shared/cors-origins.ts');
const indexHtml = read('index.html');

if (!corsJs.includes('PAGES_PREVIEW_ORIGIN_RE')) fail('cors-origins.js missing preview regex');
if (!corsTs.includes('PAGES_PREVIEW_ORIGIN_RE')) fail('cors-origins.ts missing preview regex');
if (!corsJs.includes('istebul-com.pages.dev') || !corsJs.includes('[a-z0-9-]')) {
  fail('cors-origins.js preview pattern should allow istebul-com.pages.dev deployments');
}

if (indexHtml.includes('<script>\n/* ROUTE_BOOTSTRAP_START')) {
  fail('index.html must not use inline route bootstrap script');
}
if (!indexHtml.includes('route-bootstrap-head.js')) {
  fail('index.html must reference external route-bootstrap-head.js');
}

const bootstrapPath = path.join(root, 'js/runtime/route-bootstrap-head.js');
if (!fs.existsSync(bootstrapPath)) {
  fail('js/runtime/route-bootstrap-head.js is missing — run npm run generate:route-bootstrap');
}

const headers = read('_headers');
const cspLine = headers
  .split('\n')
  .find((line) => line.includes('Content-Security-Policy:')) || '';
if (!cspLine.includes("script-src 'self'")) {
  fail('_headers CSP must restrict script-src to self (+ allowlisted vendors)');
}
if (/script-src[^;]*'unsafe-inline'/.test(cspLine)) {
  fail('_headers CSP script-src must not allow unsafe-inline');
}

const supabaseJs = read('js/core/supabase.js');
if (!supabaseJs.includes('supabaseSingleton')) {
  fail('js/core/supabase.js must cache a singleton Supabase client');
}

const catalogJs = read('js/auto/auto-catalog.js');
if (catalogJs.includes('_ts=')) {
  fail('auto-catalog must not append unknown PostgREST query params (_ts)');
}

if (!fs.existsSync(path.join(root, 'functions/_shared/api-response.js'))) {
  fail('functions/_shared/api-response.js missing');
}

if (!fs.existsSync(path.join(root, 'supabase/functions/_shared/api-response.ts'))) {
  fail('supabase/functions/_shared/api-response.ts missing');
}

if (failed) process.exit(1);
console.log('environment-compatibility-audit: OK');
