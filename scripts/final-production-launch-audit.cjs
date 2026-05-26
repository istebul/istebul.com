#!/usr/bin/env node
'use strict';

/**
 * Final production launch gate — static checks on dist/ and source invariants.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dist = path.join(root, 'dist');
const failures = [];

function fail(msg) {
  failures.push(msg);
  console.error('FAIL:', msg);
}

function ok(msg) {
  console.log('OK:', msg);
}

if (!fs.existsSync(dist)) {
  fail('dist/ missing — run npm run build first');
  process.exit(1);
}

const partnerPages = ['partner-docs.html', 'partner-planlar.html', 'partner-guven.html'];
partnerPages.forEach((file) => {
  const html = fs.readFileSync(path.join(dist, file), 'utf8');
  if (!html.includes('data-partner-prerender=')) {
    fail(`${file} missing partner prerender block`);
  } else {
    ok(`${file} has SEO/NO-JS prerender`);
  }
  if (!html.includes('mountCorporatePage') && !html.includes('partner-docs.js') && !html.includes('partner-planlar.js')) {
    /* bundled — check script src exists */
  }
  const scriptMatch = html.match(/src="([^"]+partner-[^"]+\.js)"/);
  if (scriptMatch) {
    const scriptPath = scriptMatch[1].replace(/^\//, '');
    if (!fs.existsSync(path.join(dist, scriptPath))) {
      fail(`${file} script missing: ${scriptPath}`);
    }
  }
});

const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!indexHtml.includes('data-social-proof-disclaimer') || indexHtml.includes('data-social-proof-disclaimer hidden')) {
  fail('index.html social proof disclaimer should be visible by default');
} else {
  ok('index.html social proof disclaimer visible');
}

if (indexHtml.match(/data-metric="analyses"[^>]*>12\.400/)) {
  fail('index.html hero metrics still show inflated analyses count');
} else {
  ok('index.html hero metrics use safe example labels');
}

const requiredDist = [
  'auto/index.html',
  'assets/auto-runtime/auto-app.js',
  'env.js',
  'admin-panel.html'
];

const requiredSource = ['functions/api/public-stats.js'];
requiredSource.forEach((rel) => {
  if (!fs.existsSync(path.join(root, rel))) {
    fail(`source missing ${rel}`);
  } else {
    ok(`source has ${rel}`);
  }
});
requiredDist.forEach((rel) => {
  if (!fs.existsSync(path.join(dist, rel))) {
    fail(`dist missing ${rel}`);
  } else {
    ok(`dist has ${rel}`);
  }
});

if (failures.length) {
  console.error(`\nfinal-production-launch-audit: ${failures.length} failure(s)`);
  process.exit(1);
}

console.log('\nfinal-production-launch-audit: PASS');
