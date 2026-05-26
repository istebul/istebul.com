#!/usr/bin/env node
/**
 * Site excellence static audit — award-polish layer presence.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let failed = 0;

function ok(msg) {
  console.log('OK:', msg);
}

function fail(msg) {
  failed += 1;
  console.error('FAIL:', msg);
}

const style = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
if (!style.includes("award-polish.css")) {
  fail('style.css must import award-polish.css');
} else {
  ok('style.css imports award-polish');
}

const awardPath = path.join(root, 'css/award-polish.css');
if (!fs.existsSync(awardPath) || fs.statSync(awardPath).size < 500) {
  fail('css/award-polish.css missing or too small');
} else {
  ok('award-polish.css present');
}

const build = fs.readFileSync(path.join(root, 'scripts/production-build.cjs'), 'utf8');
if (!build.includes("'css/award-polish.css'")) {
  fail('production-build must bundle award-polish into Auto runtime');
} else {
  ok('Auto build includes award-polish');
}

const stack = path.join(root, 'css/enterprise-stack.css');
if (!fs.existsSync(stack)) {
  fail('enterprise-stack.css missing');
} else {
  ok('enterprise-stack.css for partner pages');
}

for (const html of ['partner-olun.html', 'karar-moat.html']) {
  const src = fs.readFileSync(path.join(root, html), 'utf8');
  if (!src.includes('enterprise-stack.css')) {
    fail(`${html} should use enterprise-stack.css`);
  }
}

if (failed) process.exit(1);
console.log('\nSite excellence audit passed.');
