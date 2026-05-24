#!/usr/bin/env node
/**
 * P4.8 — Production hardening static audit (CI).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(msg);
  failed = true;
};

const mustExist = [
  'docs/P4_8_PRODUCTION_HARDENING.md',
  '_headers',
  'supabase/migrations/20260527_launch_security_hardening.sql',
  'supabase/functions/_shared/webhook-url.ts',
  'functions/api/stripe-webhook.js',
  'functions/api/create-checkout.js',
  'js/core/security.js'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) {
    fail(`MISSING: ${rel}`);
  }
}

const adminAction = fs.readFileSync(
  path.join(root, 'supabase/functions/admin-action/index.ts'),
  'utf8'
);
if (!adminAction.includes('values.role === "admin"')) {
  fail('admin-action must block granting admin role via panel');
}
if (!adminAction.includes('checkAdminActorRateLimit')) {
  fail('admin-action must rate-limit admin actors');
}

const adminPanel = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (adminPanel.includes('data-role="admin"')) {
  fail('admin-panel must not expose promote-to-admin control');
}
if (!adminPanel.includes("role === 'admin'")) {
  fail('admin-panel must guard client-side admin promotion');
}

const lucideLoader = fs.readFileSync(
  path.join(root, 'js/runtime/lucide-loader.js'),
  'utf8'
);
if (lucideLoader.includes('unpkg.com')) {
  fail('lucide-loader must not load scripts from unpkg (CSP / supply chain)');
}
if (!lucideLoader.includes('/assets/lucide.min.js')) {
  fail('lucide-loader must use self-hosted lucide asset');
}

const buildScript = fs.readFileSync(
  path.join(root, 'scripts/production-build.cjs'),
  'utf8'
);
if (!buildScript.includes('lucide.min.js')) {
  fail('production-build must bundle lucide into dist/assets');
}

const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
if (!headers.includes('Content-Security-Policy')) {
  fail('CSP missing in _headers');
}
if (headers.includes('api.groq.com')) {
  fail('CSP connect-src must not allow direct Groq (use /ai-proxy)');
}

const stripeWebhook = fs.readFileSync(
  path.join(root, 'functions/api/stripe-webhook.js'),
  'utf8'
);
if (stripeWebhook.includes('SUPABASE_SERVICE_ROLE_KEY') &&
    stripeWebhook.includes('processReferralSubscriptionConversion')) {
  const referralBlock = stripeWebhook.slice(
    stripeWebhook.indexOf('processReferralSubscriptionConversion'),
    stripeWebhook.indexOf('const recordSubscriptionAnalytics')
  );
  if (referralBlock.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    fail('stripe-webhook referral hook must not fall back to service role key');
  }
}

const walkJs = (dir, hits = []) => {
  if (!fs.existsSync(dir)) return hits;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      walkJs(full, hits);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      hits.push(full);
    }
  }
  return hits;
};

for (const file of walkJs(path.join(root, 'js'))) {
  const rel = path.relative(root, file);
  if (rel.includes('admin-panel')) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    fail(`Client bundle must not reference SERVICE_ROLE: ${rel}`);
  }
}

const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
if (!envExample.includes('REFERRAL_WEBHOOK_SECRET')) {
  fail('.env.example should document REFERRAL_WEBHOOK_SECRET for referral-hub calls');
}

if (failed) process.exit(1);
console.log('P4.8 production hardening audit passed.');
