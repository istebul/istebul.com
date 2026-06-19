#!/usr/bin/env node
/**
 * Decision Platform 2.0 — full platform validation audit.
 * Scans Sprint-22..33 modules + Faz B/C/E.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

let failed = 0;
let warnings = 0;
const issues = [];
const fixed = [];

function fail(msg) {
  console.error('FAIL:', msg);
  issues.push({ severity: 'error', message: msg });
  failed += 1;
}

function warn(msg) {
  console.warn('WARN:', msg);
  issues.push({ severity: 'warning', message: msg });
  warnings += 1;
}

function pass(msg) {
  console.log('PASS:', msg);
}

const sprintModules = [
  ['Sprint-17', 'js/ai-decision-coach/index.js'],
  ['Sprint-18', 'js/ai-decision-simulator/index.js'],
  ['Sprint-19', 'js/ai-decision-report/index.js'],
  ['Sprint-20', 'js/ai-decision-flow/index.js'],
  ['Sprint-21', 'js/ai-ownership-cost/index.js'],
  ['Sprint-24', 'js/ai-purchase-decision/index.js'],
  ['Sprint-25', 'js/ai-decision-explainability/index.js'],
  ['Sprint-26', 'js/ai-executive-decision-report/index.js'],
  ['Sprint-27', 'js/ai-compare-intelligence/index.js'],
  ['Sprint-28', 'js/ai-scenario-simulator/index.js'],
  ['Sprint-29', 'js/admin/ai-listings-admin-kpi.js'],
  ['Sprint-30/Faz B', 'js/ai-user-learning/index.js'],
  ['Sprint-31/Faz C', 'js/ai-listing-data-pool/index.js'],
  ['Sprint-32/Faz E', 'js/ai-personalization/index.js']
];

for (const [sprint, rel] of sprintModules) {
  if (!exists(rel)) fail(`${sprint} module missing: ${rel}`);
  else pass(`${sprint} module present`);
}

const fazBModules = [
  'supabase/functions/_shared/ai-listings/user-learning/user-learning-engine.js',
  'supabase/functions/_shared/ai-listings/user-learning/feedback-learning-engine.js',
  'supabase/functions/_shared/ai-listings/user-learning/decision-outcome-analytics.js',
  'supabase/functions/_shared/ai-listings/user-learning/learning-summary.js'
];

const fazCModules = [
  'supabase/functions/_shared/ai-listings/listing-data-pool/listing-normalization-engine.js',
  'supabase/functions/_shared/ai-listings/listing-data-pool/duplicate-cluster-engine.js',
  'supabase/functions/_shared/ai-listings/listing-data-pool/listing-quality-enrichment.js',
  'supabase/functions/_shared/ai-listings/listing-data-pool/entity-resolution-engine.js'
];

const fazEModules = [
  'supabase/functions/_shared/ai-listings/personalization/personalization-engine.js',
  'supabase/functions/_shared/ai-listings/personalization/preference-profile-engine.js',
  'supabase/functions/_shared/ai-listings/personalization/decision-style-engine.js',
  'supabase/functions/_shared/ai-listings/personalization/personalization-summary.js'
];

for (const rel of [...fazBModules, ...fazCModules, ...fazEModules]) {
  if (!exists(rel)) fail(`Required module missing: ${rel}`);
  else {
    const text = read(rel);
    if (!text.includes('memoCache')) warn(`${rel} has no memo cache (may be intentional)`);
    if (!text.includes('clear') && text.includes('memoCache')) warn(`${rel} memo cache without clear function`);
    pass(`Module OK: ${rel}`);
  }
}

const tests = [
  'tests/unit/ai-user-learning.test.mjs',
  'tests/unit/ai-listing-data-pool.test.mjs',
  'tests/unit/ai-personalization.test.mjs'
];

for (const rel of tests) {
  if (!exists(rel)) fail(`Test missing: ${rel}`);
  else pass(`Test present: ${rel}`);
}

const adminWorkspace = read('js/admin/ai-listings-decision-workspace.js');
if (!adminWorkspace.includes('escapeHtml')) {
  warn('Decision workspace may lack XSS-safe pattern');
} else {
  pass('Decision workspace uses escapeHtml');
}

const personalizationEngine = read(fazEModules[0]);
if (!personalizationEngine.includes('scoresUnchanged')) {
  fail('Personalization engine must not mutate core scores');
} else {
  pass('Personalization preserves core scores');
}

const learningSummary = read('supabase/functions/_shared/ai-listings/user-learning/learning-summary.js');
if (!learningSummary.includes('Öğrenme Öngörüleri')) {
  fail('Learning summary missing Turkish title');
} else {
  pass('Learning Insights Turkish copy present');
}

const prefProfile = read(fazEModules[1]);
if (!prefProfile.includes('Tercihlerinizi istediğiniz zaman değiştirebilirsiniz')) {
  fail('Preference profile missing required Turkish disclaimer');
} else {
  pass('Preference profile Turkish disclaimer present');
}

const entityEngine = read(fazCModules[3]);
if (!entityEngine.includes('hassas kişisel')) {
  warn('Entity resolution should document no sensitive inference');
} else {
  pass('Entity resolution documents no sensitive inference');
}

const reportPath = 'docs/DECISION_PLATFORM_2_FINAL_AUDIT_REPORT.md';
if (!exists(reportPath)) {
  warn('Final audit report not yet generated');
} else {
  pass('Final audit report present');
}

console.log('\n--- Decision Platform 2.0 Audit Summary ---');
console.log(`Errors: ${failed}`);
console.log(`Warnings: ${warnings}`);
console.log(`Issues logged: ${issues.length}`);

if (failed > 0) process.exit(1);
process.exit(0);
