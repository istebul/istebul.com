#!/usr/bin/env node
/**
 * P6.1 — Partner closing machine audit.
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
  'docs/P6_1_CLOSING_MACHINE.md',
  'data/sales/closing-machine.json',
  'data/sales/partner-sales-deck.json',
  'data/sales/pricing-sheet.json',
  'data/sales/onboarding-docs.json',
  'data/sales/email-templates.json',
  'data/sales/follow-up-flows.json',
  'js/features/sales/partner-closing-machine.js',
  'partner-closing-kit.html',
  'js/corporate/partner-closing-kit.js'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const closing = JSON.parse(
  fs.readFileSync(path.join(root, 'data/sales/closing-machine.json'), 'utf8')
);
if (!String(closing.version || '').startsWith('p6.')) fail('closing-machine.json must be p6.x');

const deck = JSON.parse(
  fs.readFileSync(path.join(root, 'data/sales/partner-sales-deck.json'), 'utf8')
);
if ((deck.slides || []).length < 5) fail('partner-sales-deck needs slides');

const emails = JSON.parse(
  fs.readFileSync(path.join(root, 'data/sales/email-templates.json'), 'utf8')
);
const stages = new Set((emails.templates || []).map((t) => t.stage));
for (const s of ['discover', 'proposal', 'close']) {
  if (!stages.has(s)) fail(`email-templates missing stage: ${s}`);
}

const flows = JSON.parse(
  fs.readFileSync(path.join(root, 'data/sales/follow-up-flows.json'), 'utf8')
);
if (!(flows.flows || []).some((f) => f.id === 'ae_pilot_close')) {
  fail('follow-up-flows missing ae_pilot_close');
}
if (!String(flows.version).startsWith('p6.')) fail('follow-up-flows version must be p6.x');

const objections = JSON.parse(
  fs.readFileSync(path.join(root, 'data/sales/objections.json'), 'utf8')
);
if (!String(objections.version).startsWith('p6.')) fail('objections.json version');

const analytics = fs.readFileSync(
  path.join(root, 'supabase/functions/_shared/platform-analytics.ts'),
  'utf8'
);
if (!analytics.includes('partner_closing_kit_view')) {
  fail('platform-analytics missing partner_closing_kit_view');
}

const build = fs.readFileSync(path.join(root, 'scripts/production-build.cjs'), 'utf8');
if (!build.includes('partner-closing-kit.html')) fail('production-build must ship closing kit page');

const machineJs = fs.readFileSync(
  path.join(root, 'js/features/sales/partner-sales-machine.js'),
  'utf8'
);
if (!machineJs.includes('renderClosingKitSummaryHtml')) {
  fail('admin sales machine must link closing kit');
}

if (failed) process.exit(1);
console.log('P6.1 closing machine audit OK');
