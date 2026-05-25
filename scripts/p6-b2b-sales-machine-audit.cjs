#!/usr/bin/env node
/**
 * P6 — B2B sales machine audit.
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
  'docs/P6_B2B_SALES_MACHINE.md',
  'data/sales/sales-machine.json',
  'data/sales/objections.json',
  'data/sales/outbound-sequences.json',
  'js/features/sales/partner-sales-machine.js',
  'js/features/sales/partner-sales-crm.js',
  'js/features/sales/partner-sales-assets.js',
  'js/features/sales/partner-objections.js',
  'js/features/sales/partner-pricing-strategy.js',
  'js/features/sales/partner-onboarding-velocity.js',
  'css/sales-partner.css',
  'js/admin-panel.js'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const machine = JSON.parse(
  fs.readFileSync(path.join(root, 'data/sales/sales-machine.json'), 'utf8')
);
if (!String(machine.version || '').startsWith('p6.')) fail('sales-machine.json must be p6.x');
if (!(machine.partnerAePipeline || []).length) fail('partnerAePipeline required');

const objections = JSON.parse(
  fs.readFileSync(path.join(root, 'data/sales/objections.json'), 'utf8')
);
if ((objections.objections || []).length < 4) fail('objections.json needs playbook entries');

const outbound = JSON.parse(
  fs.readFileSync(path.join(root, 'data/sales/outbound-sequences.json'), 'utf8')
);
if (!(outbound.sequences || []).some((s) => s.id === 'partner_cold_outbound')) {
  fail('outbound-sequences.json missing partner_cold_outbound');
}

const edge = fs.readFileSync(
  path.join(root, 'supabase/functions/_shared/lifecycle-flows.ts'),
  'utf8'
);
if (!edge.includes('partner_sales_cadence')) fail('lifecycle-flows missing partner_sales_cadence');

const analytics = fs.readFileSync(
  path.join(root, 'supabase/functions/_shared/platform-analytics.ts'),
  'utf8'
);
for (const ev of ['partner_sales_touch', 'partner_outbound_sent']) {
  if (!analytics.includes(`"${ev}"`)) fail(`platform-analytics missing ${ev}`);
}

const admin = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!admin.includes('initPartnerSalesMachineAdmin')) {
  fail('admin-panel must load sales enablement');
}
if (!admin.includes('log-partner-sales-touch')) fail('admin partner applications need sales touch');

const planlar = fs.readFileSync(path.join(root, 'js/corporate/partner-planlar.js'), 'utf8');
if (!planlar.includes('renderObjectionPlaybookHtml')) {
  fail('partner-planlar must expose objection playbook');
}

const channels = JSON.parse(
  fs.readFileSync(path.join(root, 'data/growth/channels.json'), 'utf8')
);
if (!(channels.channels || []).some((c) => c.id === 'partner_outbound')) {
  fail('channels.json missing partner_outbound');
}

if (failed) process.exit(1);
console.log('P6 B2B sales machine audit OK');
