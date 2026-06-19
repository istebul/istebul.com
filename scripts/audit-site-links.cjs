#!/usr/bin/env node
/**
 * Site-wide static link audit (HTML + key JS templates).
 * Fails on dead href="#", javascript:void(0) in user-facing surfaces.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const htmlFiles = [
  'index.html',
  'auto/index.html',
  'admin-panel.html',
  'partner-olun.html',
  'iletisim.html',
  'hakkimizda.html',
  'offline.html'
];

const allowHashInFile = {
  'js/features/auth/auth.js': false
};

let failed = false;

function fail(msg) {
  console.error('FAIL:', msg);
  failed = true;
}

function scanHtml(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fail(`missing HTML: ${rel}`);
    return;
  }
  const html = fs.readFileSync(full, 'utf8');
  const voidJs = /href\s*=\s*["']javascript:void\(0\)["']/gi;
  if (voidJs.test(html)) fail(`${rel}: javascript:void(0) href`);

  const bareHash = /<a[^>]+href\s*=\s*["']#["'][^>]*>/gi;
  if (bareHash.test(html)) fail(`${rel}: bare href="#" anchor`);

  const brokenHashOnly = /href\s*=\s*["']#([a-z0-9-]+)["']/gi;
  let m;
  while ((m = brokenHashOnly.exec(html)) !== null) {
    const id = m[1];
    if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
      if (rel === 'index.html' && ['how-it-works', 'sample-preview', 'pricing', 'home'].includes(id)) {
        fail(`${rel}: hash-only link #${id} should use /#${id} or data-home-anchor`);
      }
    }
  }
}

htmlFiles.forEach(scanHtml);

const jsScan = ['js/features/auth/auth.js', 'js/corporate/partner-basvuru.js'];
for (const rel of jsScan) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  const src = fs.readFileSync(full, 'utf8');
  if (/href\s*=\s*["']javascript:void\(0\)["']/i.test(src)) {
    fail(`${rel}: javascript:void(0)`);
  }
  const allowed = allowHashInFile[rel];
  if (allowed === false && /href\s*=\s*["']#["']/i.test(src)) {
    fail(`${rel}: bare href="#" (use button.auth-inline-link)`);
  }
}

if (failed) process.exit(1);
console.log('site-links-audit: OK');
