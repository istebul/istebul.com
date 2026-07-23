#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

const REQUIRED_IN_SITEMAP = [
  'https://www.istebul.com/ai/',
  'https://www.istebul.com/planlar',
  'https://www.istebul.com/blog',
  'https://www.istebul.com/duyurular',
  'https://www.istebul.com/kampanyalar',
  'https://www.istebul.com/karar-asistani/',
  'https://www.istebul.com/en/',
  'https://www.istebul.com/de/'
];

let failed = 0;

function fail(msg) {
  console.error('FAIL:', msg);
  failed += 1;
}

if (!fs.existsSync(path.join(dist, 'sitemap.xml'))) {
  fail('dist/sitemap.xml missing — run npm run build');
  process.exit(1);
}

const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const locs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));

for (const loc of REQUIRED_IN_SITEMAP) {
  if (!locs.has(loc)) fail(`sitemap missing ${loc}`);
}

const manifestPath = path.join(dist, 'blog-posts-manifest.json');
if (fs.existsSync(manifestPath)) {
  const posts = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).posts || [];
  posts.forEach(({ path: postPath }) => {
    const loc = `https://www.istebul.com${postPath.endsWith('/') ? postPath : `${postPath}/`}`;
    if (!locs.has(loc) && !locs.has(loc.replace(/\/$/, ''))) {
      fail(`sitemap missing blog post ${loc}`);
    }
  });
  console.log(`audit-sitemap-coverage: ${posts.length} blog post(s) checked`);
}

for (const locale of ['en', 'de', 'ar']) {
  const file = path.join(dist, locale, 'index.html');
  if (!fs.existsSync(file)) fail(`missing locale shell ${locale}/index.html`);
}

if (failed) process.exit(1);
console.log('audit-sitemap-coverage: OK');
