#!/usr/bin/env node
/**
 * P19 — Scale architecture execution audit.
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
  'data/ops/scale-architecture-scenarios.json',
  'docs/SCALE_ARCHITECTURE_EXECUTION.md',
  'js/features/ops/scale-architecture-matrix.js',
  'js/features/ops/scale-architecture-views.js',
  'js/core/scale-tier-recommendations.js',
  'scripts/scale-architecture-snapshot.cjs',
  '.github/workflows/analytics-retention.yml'
];

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) fail(`MISSING: ${rel}`);
}

const config = JSON.parse(
  fs.readFileSync(path.join(root, 'data/ops/scale-architecture-scenarios.json'), 'utf8')
);
if (config.version !== 'p19.0') fail('scale-architecture-scenarios.json must be p19.0');
if ((config.dimensions || []).length < 12) fail('need 12+ dimensions');

for (const tier of ['10k', '100k', '1m']) {
  if (!config.volumeEstimates?.[tier]) fail(`volumeEstimates missing ${tier}`);
}

const matrixJs = fs.readFileSync(
  path.join(root, 'js/features/ops/scale-architecture-matrix.js'),
  'utf8'
);
for (const fn of ['buildScaleArchitectureReport', 'computeTierConfidence']) {
  if (!matrixJs.includes(fn)) fail(`scale-architecture-matrix missing ${fn}`);
}

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
if (!adminHtml.includes('scale-architecture')) fail('admin-panel needs scale-architecture page');

const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
if (!adminJs.includes('loadScaleArchitectureCenter')) {
  fail('admin-panel.js needs loadScaleArchitectureCenter');
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.scripts['metrics:scale:architecture']) {
  fail('package.json needs metrics:scale:architecture');
}
if (!pkg.scripts.test?.includes('p19-scale-architecture-audit')) {
  fail('package.json test must include p19-scale-architecture-audit');
}

const doc = fs.readFileSync(path.join(root, 'docs/SCALE_ARCHITECTURE_EXECUTION.md'), 'utf8');
for (const token of ['10,000', '100,000', '1,000,000', 'Cloudflare Pages', 'analytics_events']) {
  if (!doc.includes(token)) fail(`SCALE_ARCHITECTURE_EXECUTION missing: ${token}`);
}

if (failed) process.exit(1);
console.log('P19 scale architecture audit OK');
