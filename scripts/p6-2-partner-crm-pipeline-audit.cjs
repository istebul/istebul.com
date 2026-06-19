#!/usr/bin/env node
/**
 * P6.2 — Partner CRM pipeline audit.
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
  'docs/P6_2_PARTNER_CRM_PIPELINE.md',
  'data/sales/partner-crm-pipeline.json',
  'supabase/migrations/20260612_partner_crm_pipeline_p62.sql',
  'js/features/sales/partner-crm-pipeline.js',
  'js/admin-panel.js'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const pipeline = JSON.parse(
  fs.readFileSync(path.join(root, 'data/sales/partner-crm-pipeline.json'), 'utf8')
);
if (pipeline.version !== 'p6.2') fail('partner-crm-pipeline.json must be p6.2');

const required = ['lead', 'qualified', 'demo', 'pilot', 'negotiation', 'won', 'lost'];
const ids = (pipeline.stages || []).map((s) => s.id);
for (const id of required) {
  if (!ids.includes(id)) fail(`pipeline missing stage: ${id}`);
}

const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260612_partner_crm_pipeline_p62.sql'),
  'utf8'
);
for (const id of required) {
  if (!migration.includes(`'${id}'`)) fail(`migration must allow status ${id}`);
}

const admin = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!admin.includes('renderPartnerPipelineBoardHtml')) fail('admin needs CRM board');
if (!admin.includes('logPartnerCrmStageChange')) fail('admin must log stage changes');

const onboarding = fs.readFileSync(
  path.join(root, 'supabase/functions/partner-onboarding/index.ts'),
  'utf8'
);
if (!onboarding.includes('"pilot"')) fail('partner-onboarding must use pilot status');

const appFn = fs.readFileSync(
  path.join(root, 'supabase/functions/partner-application/index.ts'),
  'utf8'
);
if (!appFn.includes('status: "lead"')) fail('partner-application default must be lead');

const analytics = fs.readFileSync(
  path.join(root, 'supabase/functions/_shared/platform-analytics.ts'),
  'utf8'
);
if (!analytics.includes('partner_crm_stage_change')) fail('analytics missing stage change');

if (failed) process.exit(1);
console.log('P6.2 partner CRM pipeline audit OK');
