#!/usr/bin/env node
/**
 * HTTP smoke after production build (Phase A).
 * Default: static dist checks. Set SMOKE_LIVE=1 to hit local server.
 *
 *   npm run build && node scripts/load/smoke-http.cjs
 *   SMOKE_LIVE=1 SMOKE_BASE_URL=http://127.0.0.1:3000 node scripts/load/smoke-http.cjs
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '../..');
const dist = path.join(root, 'dist');

function assert(cond, msg) {
  if (!cond) {
    console.error('SMOKE FAIL:', msg);
    process.exit(1);
  }
}

function checkDist() {
  assert(fs.existsSync(dist), 'dist/ missing — run npm run build');
  assert(fs.existsSync(path.join(dist, 'index.html')), 'dist/index.html missing');
  const jsDir = path.join(dist, 'js');
  assert(fs.existsSync(jsDir), 'dist/js missing');
  const bundle = fs.readdirSync(jsDir).find((n) => /^app\.bundle-/.test(n));
  assert(bundle, 'app bundle missing in dist/js');
  assert(fs.existsSync(path.join(dist, 'auto/index.html')), 'dist/auto/index.html missing');
  console.log('dist artifacts OK:', bundle);
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

async function liveSmoke(baseUrl) {
  const base = baseUrl.replace(/\/$/, '');
  const paths = ['/', '/auto/', '/env.js'];
  for (const p of paths) {
    const { status, body } = await fetchUrl(base + p);
    assert(status >= 200 && status < 400, `${p} returned ${status}`);
    if (p.endsWith('.html') || p === '/' || p === '/auto/') {
      assert(body.includes('isteBul') || body.includes('ib-enterprise'), `${p} body unexpected`);
    }
  }
  console.log('live HTTP smoke OK:', base);
}

async function main() {
  checkDist();

  if (process.env.SMOKE_LIVE !== '1') {
    console.log('Static smoke passed (set SMOKE_LIVE=1 for HTTP probes).');
    return;
  }

  const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
  if (process.env.SMOKE_START_SERVER === '1') {
    const server = spawn(process.execPath, ['server.cjs'], {
      cwd: root,
      env: { ...process.env, PORT: '3000', HOST: '127.0.0.1' },
      stdio: 'ignore'
    });
    await new Promise((r) => setTimeout(r, 800));
    try {
      await liveSmoke(base);
    } finally {
      server.kill('SIGTERM');
    }
  } else {
    await liveSmoke(base);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
