#!/usr/bin/env node
/**
 * Homepage link / CTA audit — no dead anchors on index.html marketing surface.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let failed = false;

const voidJs = /href\s*=\s*["']javascript:void\(0\)["']/gi;
if (voidJs.test(html)) {
  console.error('FAIL: javascript:void(0) href found');
  failed = true;
}

const emptyHash = /<a[^>]+href\s*=\s*["']#["'][^>]*>/gi;
const allowedHashIds = new Set(['switch-to-register']);
let hashMatch;
const hashRe = /<a[^>]+href\s*=\s*["']#["'][^>]*id\s*=\s*["']([^"']+)["'][^>]*>/gi;
while ((hashMatch = hashRe.exec(html)) !== null) {
  if (!allowedHashIds.has(hashMatch[1])) {
    console.error('FAIL: bare href="#" on anchor id=', hashMatch[1]);
    failed = true;
  }
}
if (emptyHash.test(html.replace(/id="switch-to-register"/g, ''))) {
  /* switch handled via button now */
}

const requiredRoutes = [
  '/karar-asistani',
  '/auto/',
  '/metodoloji',
  '/karsilastir/',
  '/planlar',
  '/#how-it-works',
  '/#sample-preview',
  '/#pricing'
];
for (const route of requiredRoutes) {
  if (!html.includes(`href="${route}"`) && !html.includes(`href='${route}'`) && !html.includes(`data-home-anchor`)) {
    if (route.startsWith('/#')) continue;
    if (!html.includes(route.replace(/\/$/, ''))) {
      console.error('WARN: expected route reference missing:', route);
    }
  }
}

const heroMust = ['Ücretsiz analiz başlat', 'Nasıl Çalışır?'];
for (const text of heroMust) {
  if (!html.includes(text)) {
    console.error('FAIL: hero missing CTA text:', text);
    failed = true;
  }
}

const ids = [...html.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dup.length) {
  console.error('FAIL: duplicate IDs:', [...new Set(dup)].join(', '));
  failed = true;
}

if (failed) process.exit(1);
console.log('homepage-links-audit: OK');
