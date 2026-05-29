#!/usr/bin/env node
/**
 * P4.5 perceived performance audit.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const mustExist = [
  'js/core/loading-skeleton.js',
  'js/runtime/perceived-performance.js',
  'css/p4-5-perceived-performance.css',
  'docs/P4_5_PERCEIVED_PERFORMANCE.md'
];

const mustContain = [
  ['css/style.css', 'p4-5-perceived-performance.css'],
  ['js/runtime/enterprise-ux.js', 'initPerceivedPerformance'],
  ['js/ui/ui.js', 'renderListingSkeletonGrid'],
  ['js/ui/listings-ui.js', 'loading="lazy"'],
  ['js/core/router.js', 'pulseRouteSection'],
  ['index.html', 'perf:preload-style'],
  ['!index.html', 'enterprise-polish.css'],
  ['scripts/production-build.cjs', 'perf:preload-style'],
  ['sw.js', 'v51'],
  ['js/auto/auto-app.js', 'initPerceivedPerformance'],
  ['js/runtime/corporate-ux.js', 'initPerceivedPerformance'],
  ['scripts/production-build.cjs', 'p4-5-perceived-performance.css']
];

let failed = false;

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error('MISSING:', rel);
    failed = true;
  }
}

for (const [rel, needle] of mustContain) {
  const neg = rel.startsWith('!');
  const file = neg ? rel.slice(1) : rel;
  const content = read(file);
  const hit = content.includes(needle);
  if (neg ? hit : !hit) {
    console.error('ASSERT FAILED:', file, neg ? 'must NOT contain' : 'must contain', needle);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('P4.5 perceived performance audit passed.');
