#!/usr/bin/env node
/**
 * P10 — Revenue ops automation audit.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(msg);
  failed = true;
};

const requiredFlows = [
  'failed_payment_recovery',
  'dunning_past_due',
  'invoice_reminder',
  'renewal_nudge',
  'churn_rescue',
  'downgrade_save',
  'upgrade_prompt',
  'trial_ending_upgrade'
];

const mustExist = [
  'data/revenue/revops-flows.json',
  'docs/REVOPS_AUTOMATION.md',
  'functions/api/_shared/revenue-ops-enroll.js',
  'supabase/functions/_shared/revenue-ops.ts',
  'js/features/revenue/revenue-ops-client.js'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const flowsJson = JSON.parse(
  fs.readFileSync(path.join(root, 'data/lifecycle/flows.json'), 'utf8')
);
const flowIds = (flowsJson.flows || []).map((f) => f.id);
for (const id of requiredFlows) {
  if (!flowIds.includes(id)) fail(`flows.json missing ${id}`);
}

const tsFlows = fs.readFileSync(
  path.join(root, 'supabase/functions/_shared/lifecycle-flows.ts'),
  'utf8'
);
for (const id of requiredFlows) {
  if (!tsFlows.includes(`id: "${id}"`)) fail(`lifecycle-flows.ts missing ${id}`);
}

const templates = fs.readFileSync(
  path.join(root, 'supabase/functions/_shared/lifecycle-templates.ts'),
  'utf8'
);
for (const tpl of ['payment_failed', 'dunning_urgent', 'invoice_upcoming', 'churn_rescue', 'upgrade_prompt']) {
  if (!templates.includes(`${tpl}:`)) fail(`lifecycle-templates missing ${tpl}`);
}

const webhook = fs.readFileSync(path.join(root, 'functions/api/stripe-webhook.js'), 'utf8');
if (!webhook.includes('failed_payment_recovery') || !webhook.includes('trial_will_end')) {
  fail('stripe-webhook.js must enroll revops flows');
}

const cron = fs.readFileSync(
  path.join(root, 'supabase/functions/lifecycle-cron/index.ts'),
  'utf8'
);
for (const fn of ['enrollRenewalNudges', 'enrollInvoiceReminders', 'enrollChurnRescue']) {
  if (!cron.includes(fn)) fail(`lifecycle-cron missing ${fn}`);
}

const revops = JSON.parse(
  fs.readFileSync(path.join(root, 'data/revenue/revops-flows.json'), 'utf8')
);
if (revops.version !== 'p10.0') fail('revops-flows.json must be p10.0');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts.test?.includes('p10-revops-automation-audit')) {
  fail('package.json test must include p10-revops-automation-audit');
}

if (failed) process.exit(1);
console.log('P10 revops automation audit OK');
