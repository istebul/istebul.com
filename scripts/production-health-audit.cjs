#!/usr/bin/env node
/**
 * Full production health audit — build, deploy artifacts, security, Cloudflare/Supabase/Stripe static checks.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const report = {
  generatedAt: new Date().toISOString(),
  passed: [],
  warnings: [],
  failures: [],
  scores: {}
};

const pass = (m) => report.passed.push(m);
const warn = (m) => report.warnings.push(m);
const fail = (m) => report.failures.push(m);

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

console.log('Production health audit…\n');

// Stack detection
const pkg = JSON.parse(read('package.json'));
const isTs = exists('tsconfig.json');
if (isTs) pass('TypeScript config present');
else warn('No TypeScript project — JS-only (check-syntax covers syntax)');

// Node engines
if (pkg.engines?.node) pass(`Node engine: ${pkg.engines.node}`);

// Build
const build = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
if (build.status === 0) pass('npm run build');
else fail(`build failed: ${build.stderr?.slice(0, 500)}`);

// Lint
const lint = spawnSync('npm', ['run', 'lint'], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
if (lint.status === 0) pass('eslint');
else fail('eslint errors');

// Syntax check
const check = spawnSync('npm', ['run', 'check'], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
if (check.status === 0) pass('syntax + console check');
else fail('check failed');

// Cloudflare Pages
if (exists('wrangler.toml')) {
  const wr = read('wrangler.toml');
  if (wr.includes('pages_build_output_dir = "dist"')) pass('wrangler pages_build_output_dir=dist');
  else fail('wrangler output dir misconfigured');
}
if (exists('_redirects')) {
  const red = read('_redirects');
  if (red.includes('/* /index.html')) pass('SPA fallback in _redirects');
  if (red.includes('/auto')) pass('auto route in _redirects');
}
if (exists('dist/_redirects')) pass('dist/_redirects copied');
else warn('dist/_redirects missing — run build');

if (exists('_headers') && read('_headers').includes('Content-Security-Policy')) {
  pass('CSP in _headers');
}

// Functions (Pages)
const cfFns = [
  'functions/api/stripe-webhook.js',
  'functions/api/create-checkout.js',
  'functions/api/create-billing-portal.js',
  'functions/ai-proxy.js'
];
cfFns.forEach((f) => (exists(f) ? pass(`CF function: ${f}`) : fail(`missing ${f}`)));

const stripeWh = read('functions/api/stripe-webhook.js');
if (stripeWh.includes('constructEvent') || stripeWh.includes('webhooks.constructEvent')) {
  pass('Stripe webhook signature verification');
} else warn('Verify Stripe constructEvent in webhook');

if (stripeWh.includes('stripe_webhook_events')) pass('Stripe idempotency table');

// Supabase
if (exists('.env.example')) {
  const envEx = read('.env.example');
  ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_SECRET_KEY'].forEach((k) => {
    if (envEx.includes(k)) pass(`env template: ${k}`);
    else warn(`env template missing ${k}`);
  });
}

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));
if (migrations.length > 0) pass(`Supabase migrations: ${migrations.length} files`);

// RLS sample
const launchSql = migrations.find((f) => f.includes('launch_security'));
if (launchSql && read(`supabase/migrations/${launchSql}`).includes('POLICY')) {
  pass('RLS policies in launch migration');
}

// SEO
if (exists('dist/sitemap.xml')) pass('dist/sitemap.xml');
if (exists('dist/robots.txt')) pass('dist/robots.txt');

// Hydration N/A
warn('No SSR hydration — static SPA (esbuild); N/A');

// Dependency audit (non-blocking)
const audit = spawnSync('npm', ['audit', '--omit=dev', '--json'], { cwd: root, encoding: 'utf8' });
try {
  const data = JSON.parse(audit.stdout || '{}');
  const high = data.metadata?.vulnerabilities?.high || 0;
  const mod = data.metadata?.vulnerabilities?.moderate || 0;
  if (high === 0) pass('npm audit prod: no high');
  else warn(`npm audit prod: ${high} high, ${mod} moderate`);
} catch {
  warn('npm audit parse skipped');
}

report.scores.overall =
  report.failures.length === 0 ? (report.warnings.length === 0 ? 'GREEN' : 'YELLOW') : 'RED';

const outPath = path.join(root, 'dist/production-health-audit.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log('\n--- Summary ---');
console.log('Passed:', report.passed.length);
console.log('Warnings:', report.warnings.length);
console.log('Failures:', report.failures.length);
console.log('Overall:', report.scores.overall);
console.log('JSON:', outPath);

if (report.failures.length) {
  report.failures.forEach((f) => console.error('FAIL:', f));
  process.exit(1);
}

console.log('\nProduction health audit OK');
