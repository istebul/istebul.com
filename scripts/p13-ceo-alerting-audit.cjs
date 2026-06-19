#!/usr/bin/env node
/**
 * P13 — CEO alerting audit.
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
  'data/ops/ceo-alerts.json',
  'data/ops/ceo-alert-rules.json',
  'docs/CEO_ALERTING.md',
  'js/features/ops/ceo-alert-engine.js',
  'scripts/ceo-alert-snapshot.cjs',
  'scripts/ceo-alert-run.cjs',
  '.github/workflows/ceo-alerts.yml',
  'supabase/functions/ops-alert-digest/index.ts'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const config = JSON.parse(fs.readFileSync(path.join(root, 'data/ops/ceo-alerts.json'), 'utf8'));
if (config.version !== 'p13.0') fail('ceo-alerts.json must be p13.0');
for (const key of [
  'conversion_crash',
  'checkout_failures',
  'stripe_webhook_failures',
  'partner_dispatch_failures',
  'unusual_churn',
  'lead_drop_anomalies',
  'analytics_anomalies'
]) {
  if (!config.alerts?.includes(key)) fail(`ceo-alerts.json missing alert ${key}`);
}

const rules = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/ceo-alert-rules.json'), 'utf8')
);
const ruleIds = [
  'ceo_conversion_crash',
  'ceo_checkout_failures',
  'ceo_stripe_webhook_failures',
  'ceo_partner_dispatch_failures',
  'ceo_unusual_churn',
  'ceo_lead_drop_anomaly',
  'ceo_analytics_anomaly'
];
for (const id of ruleIds) {
  if (!rules.rules?.some((r) => r.id === id)) fail(`ceo-alert-rules missing ${id}`);
}

const digest = fs.readFileSync(
  path.join(root, 'supabase/functions/ops-alert-digest/index.ts'),
  'utf8'
);
if (!digest.includes('ceo') && !digest.includes('channel')) {
  fail('ops-alert-digest must format CEO channel');
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['metrics:ceo:alerts', 'ceo:alerts:run']) {
  if (!pkg.scripts[script]) fail(`package.json missing ${script}`);
}
if (!pkg.scripts.test?.includes('p13-ceo-alerting-audit')) {
  fail('package.json test must include p13-ceo-alerting-audit');
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/automation-manifest.json'), 'utf8')
);
if (!manifest.scheduledJobs?.some((j) => j.id === 'ceo_alerts')) {
  fail('automation-manifest needs ceo_alerts job');
}

if (failed) process.exit(1);
console.log('P13 CEO alerting audit OK');
