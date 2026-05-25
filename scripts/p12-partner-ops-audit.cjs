#!/usr/bin/env node
/**
 * P12 — Partner ops automation audit.
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
  'data/partner/partner-ops.json',
  'docs/PARTNER_OPS_AUTOMATION.md',
  'js/features/partner/partner-ops-monitor.js',
  'scripts/partner-ops-snapshot.cjs',
  'scripts/partner-ops-automation-run.cjs',
  '.github/workflows/partner-ops-monitor.yml',
  '.github/workflows/partner-retry.yml'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const config = JSON.parse(
  fs.readFileSync(path.join(root, 'data/partner/partner-ops.json'), 'utf8')
);
if (config.version !== 'p12.0') fail('partner-ops.json must be p12.0');
for (const key of [
  'lead_dispatch_monitoring',
  'retry_automation',
  'failure_alerting',
  'partner_sla_monitoring',
  'partner_inactivity_alerts',
  'webhook_health_monitoring'
]) {
  if (!config.automations?.includes(key)) fail(`partner-ops.json missing automation ${key}`);
}

const rules = JSON.parse(fs.readFileSync(path.join(root, 'data/ops/alert-rules.json'), 'utf8'));
const partnerRuleIds = [
  'partner_dispatch_fails',
  'partner_dispatch_rate_low',
  'partner_sla_p95_breach',
  'partner_retry_backlog',
  'partner_webhook_unhealthy',
  'partner_inactive_endpoints',
  'partner_circuit_open'
];
for (const id of partnerRuleIds) {
  if (!rules.rules?.some((r) => r.id === id)) fail(`alert-rules missing ${id}`);
}

const monitorJs = fs.readFileSync(
  path.join(root, 'js/features/partner/partner-ops-monitor.js'),
  'utf8'
);
if (!monitorJs.includes('buildPartnerOpsSnapshot')) {
  fail('partner-ops-monitor.js must export buildPartnerOpsSnapshot');
}

const opsCenter = fs.readFileSync(
  path.join(root, 'js/features/ops/ops-command-center.js'),
  'utf8'
);
if (!opsCenter.includes('partnerOps')) fail('ops-command-center must accept partnerOps');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['metrics:partner:ops', 'partner:ops:run']) {
  if (!pkg.scripts[script]) fail(`package.json missing ${script}`);
}
if (!pkg.scripts.test?.includes('p12-partner-ops-audit')) {
  fail('package.json test must include p12-partner-ops-audit');
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/automation-manifest.json'), 'utf8')
);
if (!manifest.scheduledJobs?.some((j) => j.id === 'partner_ops_monitor')) {
  fail('automation-manifest needs partner_ops_monitor job');
}

if (failed) process.exit(1);
console.log('P12 partner ops automation audit OK');
