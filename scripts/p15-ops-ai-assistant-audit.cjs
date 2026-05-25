#!/usr/bin/env node
/**
 * P15 — Ops AI decision assistant audit.
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
  'data/ops/ops-decision-assistant.json',
  'docs/OPS_AI_DECISION_ASSISTANT.md',
  'js/features/ops/ops-decision-assistant.js',
  'js/features/ops/ops-ai-narration.js',
  'js/features/ops/ops-ai-assistant-views.js',
  'js/admin/ops-ai-assistant.js',
  'css/admin-ops-ai-assistant.css'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/ops-decision-assistant.json'), 'utf8')
);
for (const cap of [
  'growth_recommendations',
  'funnel_anomaly_detection',
  'churn_analysis',
  'partner_quality_analysis',
  'pricing_insights',
  'conversion_insights'
]) {
  if (!manifest.capabilities?.includes(cap)) fail(`manifest missing ${cap}`);
}

const engine = fs.readFileSync(
  path.join(root, 'js/features/ops/ops-decision-assistant.js'),
  'utf8'
);
if (!engine.includes('buildOpsDecisionBrief')) fail('ops-decision-assistant needs buildOpsDecisionBrief');

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
if (!adminHtml.includes('ops-ai-assistant')) fail('admin-panel needs ops-ai-assistant page');

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('loadOpsAiAssistantPage')) fail('admin-panel needs loadOpsAiAssistantPage');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts.test?.includes('p15-ops-ai-assistant-audit')) {
  fail('package.json test must include p15-ops-ai-assistant-audit');
}

if (failed) process.exit(1);
console.log('P15 ops AI assistant audit OK');
