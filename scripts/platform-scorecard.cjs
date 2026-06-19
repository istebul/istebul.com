#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outPath = path.join(root, 'dist', 'platform-scorecard.json');

const audits = [
  { id: 'production-health', script: 'scripts/production-health-audit.cjs' },
  { id: 'footer-links', script: 'scripts/audit-footer-links.cjs' },
  { id: 'seo', script: 'scripts/audit-seo.cjs' },
  { id: 'compliance', script: 'scripts/compliance-audit-check.cjs' },
  { id: 'admin-stability', script: 'scripts/admin-panel-stability-audit.cjs' },
  { id: 'analytics-readiness', script: 'scripts/analytics-deploy-readiness-audit.cjs' },
  { id: 'site-excellence', script: 'scripts/site-excellence-audit.cjs' },
  { id: 'rehber-sitemap', script: 'scripts/audit-rehber-sitemap.cjs' }
];

function runAudit(script) {
  const r = spawnSync('node', [script], { cwd: root, encoding: 'utf8' });
  return {
    ok: r.status === 0,
    status: r.status,
    stdout: (r.stdout || '').trim().slice(-500),
    stderr: (r.stderr || '').trim().slice(-500)
  };
}

const results = audits.map(({ id, script }) => ({ id, script, ...runAudit(script) }));
const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);

const scorecard = {
  generatedAt: new Date().toISOString(),
  passed,
  total: results.length,
  overall: failed.length === 0 ? 'GREEN' : failed.length <= 2 ? 'YELLOW' : 'RED',
  results
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(scorecard, null, 2));

console.log(`platform-scorecard: ${passed}/${results.length} OK → ${outPath}`);
if (failed.length) {
  failed.forEach((f) => console.error(`  FAIL ${f.id}`));
  process.exit(1);
}
