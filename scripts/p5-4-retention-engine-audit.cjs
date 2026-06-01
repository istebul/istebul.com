#!/usr/bin/env node
/**
 * P5.4 — Retention LTV engine audit.
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
  'docs/P5_4_RETENTION_ENGINE.md',
  'data/growth/retention-framework.json',
  'js/features/growth/retention-ltv.js',
  'js/features/growth/retention-saved-decisions.js',
  'js/features/growth/retention-habits.js',
  'js/features/growth/retention-reactivation.js',
  'js/features/growth/retention-revisit.js',
  'js/features/growth/retention-lifecycle-optimizer.js',
  'js/features/growth/retention-prompt-ui.js',
  'css/growth-retention.css',
  'js/runtime/growth-ops.js'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const framework = JSON.parse(
  fs.readFileSync(path.join(root, 'data/growth/retention-framework.json'), 'utf8')
);
if (framework.version !== 'p5.4') fail('retention-framework.json must declare version p5.4');
if (!framework.habitLoop?.streakMilestones?.length) {
  fail('retention-framework.json must define habitLoop.streakMilestones');
}
if (!framework.revisitTriggers?.inactiveDaysSoft) {
  fail('retention-framework.json must define revisitTriggers');
}

const flows = framework.lifecycleFlows || {};
for (const key of ['reactivation', 'habitReminder', 'savedDecision']) {
  if (!flows[key]) fail(`lifecycleFlows missing ${key}`);
}

const edgeFlows = fs.readFileSync(
  path.join(root, 'supabase/functions/_shared/lifecycle-flows.ts'),
  'utf8'
);
for (const id of ['reactivation_ltv', 'habit_loop_reminder', 'saved_decision_revisit']) {
  if (!edgeFlows.includes(`id: "${id}"`)) fail(`lifecycle-flows.ts missing ${id}`);
}
if (!edgeFlows.includes('"reactivation_ltv"') || !edgeFlows.includes('PUBLIC_ENROLL_FLOWS')) {
  fail('PUBLIC_ENROLL_FLOWS must include P5.4 flows');
}

const analytics = fs.readFileSync(
  path.join(root, 'supabase/functions/_shared/platform-analytics.ts'),
  'utf8'
);
for (const ev of [
  'retention_decision_saved',
  'retention_reactivation_land',
  'retention_habit_milestone'
]) {
  if (!analytics.includes(`"${ev}"`)) fail(`platform-analytics missing ${ev}`);
}

const ops = fs.readFileSync(path.join(root, 'js/runtime/growth-ops.js'), 'utf8');
if (!ops.includes('initRetentionLtvEngine')) {
  fail('growth-ops must bootstrap initRetentionLtvEngine');
}

const auto = fs.readFileSync(path.join(root, 'js/auto/auto-app.js'), 'utf8');
if (!auto.includes('notifyDecisionSaved')) {
  fail('auto-app must save retention decisions after results');
}

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const homepageBundlePath = path.join(root, 'css/bundles/homepage.bundle.css');
const homepageBundle = fs.existsSync(homepageBundlePath)
  ? fs.readFileSync(homepageBundlePath, 'utf8')
  : '';
const hasRetentionStyles =
  index.includes('growth-retention.css') || homepageBundle.includes('growth-retention');
if (!hasRetentionStyles) {
  fail('index must include growth-retention styles (direct link or homepage bundle)');
}

if (failed) process.exit(1);
console.log('P5.4 retention engine audit OK');
