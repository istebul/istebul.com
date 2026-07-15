#!/usr/bin/env node
/**
 * One-shot production go-live verification (runs locally or in CI).
 * Full deploy to Cloudflare/Supabase is triggered by push → production-deploy.yml.
 *
 * EPIC-002: Same post-build contract as npm test SEO/GSC gates (dist-preferred sitemap,
 * platform-landing-surface-contract). Pass --skip-build when dist/ is already fresh.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const skipBuild = process.argv.includes('--skip-build');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, ...opts.env }
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

console.log('\n=== isteBul go-live production verification ===\n');

if (!skipBuild) {
  run('node', ['scripts/generate-locale-bundles.cjs']);
  run('node', ['scripts/generate-css-bundles.cjs']);
  run('npm', ['run', 'build'], {
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL || 'https://hjfrcdstbyonmgatgwcc.supabase.co',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
    }
  });
} else {
  console.log('Skipping build (--skip-build); using existing dist/\n');
  if (!fs.existsSync(path.join(root, 'dist', 'sitemap.xml'))) {
    console.error('dist/sitemap.xml missing — run a full build before --skip-build');
    process.exit(1);
  }
}

const { collectReleaseContractFailures } = require('./lib/platform-landing-surface-contract.cjs');
const contractFailures = collectReleaseContractFailures(root);
if (contractFailures.length) {
  contractFailures.forEach((msg) => console.error('FAIL:', msg));
  process.exit(1);
}
console.log('release-contract: OK (Platform `/` + AI `/ai/` + sitemap SoT)\n');

const checks = [
  'scripts/css-bundles-audit.cjs',
  'scripts/gsc-index-readiness-audit.cjs',
  'scripts/analytics-deploy-readiness-audit.cjs',
  'scripts/audit-seo.cjs',
  'scripts/seo-indexability-report.cjs',
  'scripts/audit-footer-links.cjs',
  'scripts/audit-rehber-sitemap.cjs',
  'scripts/audit-sitemap-coverage.cjs',
  'scripts/verify-bot-access.cjs',
  'scripts/compliance-audit-check.cjs',
  'scripts/platform-scorecard.cjs',
  'scripts/live-data-readiness-audit.cjs'
];
for (const script of checks) {
  run('node', [script]);
}

const distSigorta = path.join(root, 'dist/sigorta/index.html');
if (!fs.existsSync(distSigorta)) {
  console.error('dist/sigorta/index.html missing after build');
  process.exit(1);
}

const distHtml = fs.readFileSync(distSigorta, 'utf8');
if (!distHtml.includes('sigorta-wizard') && !distHtml.includes('sigorta-app')) {
  console.warn('⚠ dist/sigorta may be stale shell — verify hashed JS bundle');
}

run('npm', ['run', 'test:router']);

console.log('\n✓ Go-live verification passed.');
console.log('→ Push main triggers: .github/workflows/production-deploy.yml');
console.log('→ Optional live check: node scripts/smoke-live.cjs https://www.istebul.com\n');
