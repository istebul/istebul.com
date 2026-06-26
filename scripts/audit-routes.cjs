#!/usr/bin/env node
/**
 * Critical route surfaces exist in source and post-build dist.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

function fail(msg) {
  console.error('FAIL:', msg);
  failed = true;
}

const criticalSource = [
  'index.html',
  'auto/index.html',
  'admin-panel.html',
  'robots.txt',
  'sitemap.xml',
  '_headers',
  '_redirects'
];

for (const rel of criticalSource) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
    fail(`missing source artifact: ${rel}`);
  }
}

const distDir = path.join(root, 'dist');
if (fs.existsSync(distDir)) {
  const distRequired = [
    'index.html',
    'auto/index.html',
    'robots.txt',
    'sitemap.xml',
    'build-manifest.json',
    'karar-asistani/index.html',
    'secenekler/index.html',
    'karsilastir/index.html'
  ];
  for (const rel of distRequired) {
    const full = path.join(distDir, rel);
    if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
      fail(`missing dist artifact: ${rel} (run npm run build)`);
    }
  }
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const routeSections = [
  'id="home"',
  'id="how-it-works"',
  'id="page-karar-analizi"',
  'id="ilanlar"',
  'id="compare"',
  'id="profil"'
];
for (const marker of routeSections) {
  if (!indexHtml.includes(marker)) fail(`index.html missing section ${marker}`);
}

const bootstrapFile = path.join(root, 'js/runtime/route-bootstrap-head.js');
if (!fs.existsSync(bootstrapFile)) {
  fail('js/runtime/route-bootstrap-head.js missing — run npm run generate:route-bootstrap');
}
const bootstrapSource = fs.readFileSync(bootstrapFile, 'utf8');
if (!bootstrapSource.includes('karar-asistani')) {
  fail('route bootstrap missing /karar-asistani alias');
}

const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');
for (const rule of [
  '/finansman /finans/ 301',
  '/finansman/ /finans/ 301',
  '/araba /auto/ 301',
  '/araba/ /auto/ 301'
]) {
  if (!redirects.includes(rule)) fail(`_redirects missing legacy vertical rule: ${rule}`);
}
if (!indexHtml.includes('route-bootstrap-head.js')) {
  fail('index.html must reference route-bootstrap-head.js');
}

if (failed) process.exit(1);
console.log('routes-audit: OK');
