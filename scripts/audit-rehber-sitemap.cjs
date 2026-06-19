#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { loadJson } = require('./lib/seo.cjs');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const landing = loadJson('data/seo/landing-pages.json');
const prefix = landing.prefix || '/rehber/';
let failed = false;

function fail(msg) {
  console.error('FAIL:', msg);
  failed = true;
}

for (const page of landing.pages) {
  const rel = `rehber/${page.slug}/index.html`;
  const distFile = path.join(dist, rel);
  if (!fs.existsSync(distFile)) {
    fail(`missing dist guide: ${rel}`);
    continue;
  }
  const html = fs.readFileSync(distFile, 'utf8');
  if (!html.includes(page.h1.slice(0, Math.min(20, page.h1.length)))) {
    fail(`guide content mismatch: ${page.slug}`);
  }
}

const sitemapPath = path.join(dist, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  fail('dist/sitemap.xml missing — run npm run build');
} else {
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const missingInSitemap = landing.pages.filter((p) => !sitemap.includes(`${prefix}${p.slug}/`));
  if (missingInSitemap.length) {
    fail(`sitemap missing guides: ${missingInSitemap.map((p) => p.slug).join(', ')}`);
  }
}

const hubIndex = path.join(dist, 'rehber/index.html');
if (!fs.existsSync(hubIndex)) {
  fail('dist/rehber/index.html missing');
}

if (failed) process.exit(1);
console.log(`rehber-sitemap-audit: OK (${landing.pages.length} guides)`);
