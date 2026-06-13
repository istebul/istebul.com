#!/usr/bin/env node
/**
 * Live + dist smoke — HTTP status and critical HTML markers.
 * Usage: node scripts/smoke-live.cjs [baseUrl]
 * Env: SMOKE_OPTIONAL=1 — treat HTML 403 as warn (Cloudflare bot challenge from CI).
 */
const fs = require('fs');
const path = require('path');

const base = (process.argv[2] || 'https://www.istebul.com').replace(/\/$/, '');
const optionalMode = process.env.SMOKE_OPTIONAL === '1';
const root = path.join(__dirname, '..');

const UA =
  'Mozilla/5.0 (compatible; isteBul-production-smoke/1.0; +https://www.istebul.com)';

const liveRoutes = [
  { path: '/', must: ['data-ib-route', 'Ön değerlendirmeye başla'], status: 200 },
  { path: '/auto/', must: ['auto-wizard', 'TCO'], status: 200 },
  { path: '/konut/', must: ['Konut Karar', 'housing-page', 'housing-flow'], status: 200, optional: true },
  { path: '/finans/', must: ['Finansman', 'finans-page', 'finans-flow'], status: 200, optional: true },
  { path: '/tatil/', must: ['Tatil', 'vacation-page', 'vacation-flow'], status: 200, optional: true },
  {
    path: '/sigorta/',
    must: ['sigorta-page', 'sigorta-wizard', 'Sigorta'],
    status: 200,
    optional: true
  },
  {
    path: '/kasko/',
    must: ['kasko-page', 'kasko-wizard', 'Kasko'],
    status: 200,
    optional: true
  },
  { path: '/karar-asistani/', must: ['Karar merkezi', 'seo-page'], status: 200, optional: true },
  { path: '/karsilastir/', must: ['Karşılaştır', 'seo-page'], status: 200, optional: true },
  { path: '/secenekler/', must: ['Seçenek', 'seo-page'], status: 200, optional: true },
  { path: '/planlar', must: ['Planlar ve fiyatlandırma', 'seo-page'], status: 200, optional: true },
  { path: '/blog', must: ['Karar rehberleri', 'seo-page'], status: 200, optional: true },
  { path: '/duyurular', must: ['isteBul duyuruları', 'seo-page'], status: 200, optional: true },
  { path: '/kampanyalar', must: ['Aktif kampanyalar', 'seo-page'], status: 200, optional: true },
  { path: '/profil/', must: ['data-ib-route="profil"', 'Hesabım'], status: 200, optional: true },
  { path: '/sitemap.xml', must: ['<urlset', 'www.istebul.com'], status: 200 },
  { path: '/robots.txt', must: ['Sitemap:', 'User-agent'], status: 200 }
];

let failed = 0;
let warned = 0;

function isCloudflareChallenge(body, res) {
  return (
    res.status === 403 ||
    body.includes('Just a moment') ||
    body.includes('cf-mitigated') ||
    body.includes('challenges.cloudflare.com')
  );
}

async function fetchRoute({ path, must, status: expectStatus, optional }) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xml,*/*' },
      redirect: 'follow'
    });
    const body = await res.text();
    if (isCloudflareChallenge(body, res)) {
      console.warn(`⚠ ${path} Cloudflare challenge (HTTP ${res.status})`);
      warned += 1;
      return;
    }
    const statusOk = res.status === expectStatus;
    if (!statusOk) {
      if (optional || optionalMode) {
        console.warn(`⚠ ${path} HTTP ${res.status} (optional)`);
        warned += 1;
        return;
      }
      console.error(`✗ ${path} HTTP ${res.status} (expected ${expectStatus})`);
      failed += 1;
      return;
    }
    const missing = (must || []).filter((n) => !body.includes(n));
    if (missing.length) {
      if (optional || optionalMode) {
        console.warn(`⚠ ${path} missing markers (SPA shell):`, missing.join(', '));
        warned += 1;
        return;
      }
      console.error(`✗ ${path} missing markers:`, missing.join(', '));
      failed += 1;
    } else {
      console.log(`✓ ${path}`);
    }
  } catch (err) {
    if (optional) {
      console.warn(`⚠ ${path}`, err.message);
      warned += 1;
      return;
    }
    console.error(`✗ ${path}`, err.message);
    failed += 1;
  }
}

function checkDist() {
  const dist = path.join(root, 'dist');
  if (!fs.existsSync(dist)) {
    console.warn('⚠ dist/ missing — run npm run build first');
    return;
  }
  const required = [
    'index.html',
    'auto/index.html',
    'sitemap.xml',
    'robots.txt',
    '_headers',
    '_redirects',
    'build-manifest.json'
  ];
  for (const rel of required) {
    const full = path.join(dist, rel);
    if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
      console.error(`✗ dist/${rel} missing or empty`);
      failed += 1;
    } else {
      console.log(`✓ dist/${rel}`);
    }
  }
}

async function main() {
  console.log(`\nsmoke-live → ${base}\n`);
  for (const route of liveRoutes) {
    await fetchRoute(route);
  }
  console.log('\ndist artifacts:\n');
  checkDist();
  console.log(`\nDone. failed=${failed} warned=${warned}\n`);
  if (failed) process.exit(1);
}

main();
