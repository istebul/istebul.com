#!/usr/bin/env node
/**
 * Ensures CSS bundles exist and key pages reference consolidated stylesheets.
 */
const fs = require('fs');
const path = require('path');
const { BUNDLES } = require('./lib/css-bundles.cjs');

const root = process.cwd();
let failed = false;
const fail = (msg) => {
  console.error(msg);
  failed = true;
};

for (const bundlePath of Object.keys(BUNDLES)) {
  const abs = path.join(root, bundlePath);
  if (!fs.existsSync(abs)) fail(`MISSING bundle: ${bundlePath}`);
}

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!index.includes('css/bundles/homepage.bundle.css')) {
  fail('index.html must link css/bundles/homepage.bundle.css');
}
const linkCount = (index.match(/<link rel="stylesheet"/g) || []).length;
if (linkCount > 4) {
  fail(`index.html has ${linkCount} stylesheets; expected ≤4 after consolidation`);
}

const sigorta = fs.readFileSync(path.join(root, 'sigorta/index.html'), 'utf8');
if (!sigorta.includes('vertical-decision.bundle.css')) {
  fail('sigorta/index.html must use vertical-decision.bundle.css');
}
if (sigorta.includes('istebul-premium-final-v7.css')) {
  fail('sigorta/index.html must not duplicate istebul-premium-final-v7.css');
}

const auto = fs.readFileSync(path.join(root, 'auto/index.html'), 'utf8');
if (!auto.includes('css/bundles/auto-page.bundle.css')) {
  fail('auto/index.html must link css/bundles/auto-page.bundle.css');
}
const autoLinks = (auto.match(/<link rel="stylesheet"[^>]*href/g) || []).length;
const autoNoscriptDupes = (auto.match(/<noscript>[\s\S]*?<link rel="stylesheet"/g) || []).length;
const autoStylesheetCount = autoLinks - autoNoscriptDupes;
if (autoStylesheetCount > 5) {
  fail(
    `auto/index.html has ${autoStylesheetCount} stylesheets; expected ≤5 after consolidation`
  );
}

const konut = fs.readFileSync(path.join(root, 'konut/index.html'), 'utf8');
if (!konut.includes('css/bundles/konut-page.bundle.css')) {
  fail('konut/index.html must link css/bundles/konut-page.bundle.css');
}

if (failed) process.exit(1);
console.log('css-bundles-audit: OK');
