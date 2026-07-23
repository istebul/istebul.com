#!/usr/bin/env node
'use strict';

/**
 * Final production launch gate — static checks on dist/ and source invariants.
 *
 * EPIC-002 / PR-568: root `/` is Platform Landing; İSTEBUL AI marketing lives on `/ai/`.
 * Social-proof disclaimer + AI hero metric guards apply to AI Landing, not Platform Landing.
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
const aiHtmlPath = path.join(dist, 'ai/index.html');
if (!fs.existsSync(aiHtmlPath)) {
  fail('dist/ai/index.html missing — AI product entry required after Platform Cutover');
} else {
  ok('dist has ai/index.html');
}
const aiHtml = fs.existsSync(aiHtmlPath) ? fs.readFileSync(aiHtmlPath, 'utf8') : '';

/* Platform Landing (root `/`) + AI Landing (`/ai/`) — EPIC-002 release contract */
const { collectPlatformAiSurfaceFailures } = require('./lib/platform-landing-surface-contract.cjs');
for (const msg of collectPlatformAiSurfaceFailures(indexHtml, aiHtml)) {
  fail(msg);
}
if (!indexHtml.includes('href="/ai/"') && !indexHtml.includes("href='/ai/'")) {
  fail('index.html Platform Landing chrome should link to /ai/');
} else {
  ok('index.html links to İSTEBUL AI at /ai/');
}
if (indexHtml.includes('data-social-proof-disclaimer')) {
  fail('index.html Platform Landing should not host AI social-proof disclaimer (belongs on /ai)');
} else {
  ok('index.html does not require AI social-proof disclaimer');
}

/* AI Landing (`/ai/`) — marketing / social-proof contracts */
if (aiHtml) {
  if (!aiHtml.includes('data-social-proof-disclaimer') || /data-social-proof-disclaimer[^>]*\bhidden\b/.test(aiHtml)) {
    fail('ai/index.html social proof disclaimer should be visible by default');
  } else {
    ok('ai/index.html social proof disclaimer visible');
  }

  if (aiHtml.match(/data-metric="analyses"[^>]*>12\.400/)) {
    fail('ai/index.html hero metrics still show inflated analyses count');
  } else {
    ok('ai/index.html hero metrics use safe example labels');
  }

  ok('ai/index.html keeps AI Landing H1');
}

const requiredDist = [
  'auto/index.html',
  'ai/index.html',
  'env.js',
  'admin-panel.html'
];

const autoRuntimeDir = path.join(root, 'dist/assets/auto-runtime');
if (!fs.existsSync(autoRuntimeDir)) {
  fail('dist/assets/auto-runtime missing');
} else {
  const autoFiles = fs.readdirSync(autoRuntimeDir);
  if (!autoFiles.some((name) => /^auto-app\.[a-f0-9]+\.js$/.test(name))) {
    fail('dist/assets/auto-runtime/auto-app.[hash].js missing');
  }
}

const requiredSource = ['functions/api/public-stats.js', 'functions/api/analytics-ingest.js'];
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
