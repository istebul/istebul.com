#!/usr/bin/env node
/**
 * P11 — Customer ops automation audit.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(msg);
  failed = true;
};

const requiredFlows = ['onboarding_help', 'billing_help', 'support_follow_up'];

const mustExist = [
  'data/customer/support-workflows.json',
  'data/customer/faq-knowledge.json',
  'docs/CUSTOMER_OPS_AUTOMATION.md',
  'js/features/customer/support-router.js',
  'js/features/customer/faq-automation.js',
  'js/features/customer/customer-ops-client.js',
  'js/ui/help-center-widget.js',
  'css/help-center.css',
  'supabase/functions/_shared/customer-ops.ts',
  'supabase/functions/support-intake/index.ts'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const flowsJson = JSON.parse(
  fs.readFileSync(path.join(root, 'data/lifecycle/flows.json'), 'utf8')
);
for (const id of requiredFlows) {
  if (!flowsJson.flows?.some((f) => f.id === id)) fail(`flows.json missing ${id}`);
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
if (!templates.includes('onboarding_help_welcome') || !templates.includes('billing_help_portal')) {
  fail('lifecycle-templates missing customer ops templates');
}

const cron = fs.readFileSync(
  path.join(root, 'supabase/functions/lifecycle-cron/index.ts'),
  'utf8'
);
if (!cron.includes('enrollOnboardingHelpFromNewUsers')) fail('lifecycle-cron missing onboarding help');

const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
if (!appJs.includes('mountHelpCenterWidget')) fail('app.js must mount help center');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts.test?.includes('p11-customer-ops-automation-audit')) {
  fail('package.json test must include p11-customer-ops-automation-audit');
}

const faq = JSON.parse(
  fs.readFileSync(path.join(root, 'data/customer/faq-knowledge.json'), 'utf8')
);
if ((faq.articles || []).length < 6) fail('faq-knowledge needs articles');

if (failed) process.exit(1);
console.log('P11 customer ops automation audit OK');
