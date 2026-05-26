#!/usr/bin/env node
/**
 * Post-deploy smoke — production HTML markers (no browser).
 * Usage: node scripts/live-deploy-smoke.cjs [baseUrl]
 */
const base = (process.argv[2] || 'https://www.istebul.com').replace(/\/$/, '');

const checks = [
  { path: '/api/health', must: ['"ok":true'], json: true },
  { path: '/auto/', must: ['auto-wizard', 'TCO'] },
  { path: '/api/public-stats', must: ['"mode"', '"metrics"'], json: true },
  { path: '/metodoloji', must: ['Karar altyapısı metodolojisi', 'data-ib-route'], optional: true },
  { path: '/', must: ['TCO analizini başlat', 'landing-faq', 'data-ib-route'], optional: true }
];

let failed = 0;

async function run() {
  console.log(`\nLive deploy smoke → ${base}\n`);

  for (const { path, must, json, optional } of checks) {
    const url = `${base}${path}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'isteBul-deploy-smoke/1.0', Accept: '*/*' }
      });
      const body = await res.text();
      if (!res.ok) {
        if (optional) {
          console.warn(`⚠ ${path} HTTP ${res.status} (opsiyonel — Cloudflare challenge olabilir)`);
          continue;
        }
        console.error(`✗ ${path} HTTP ${res.status}`);
        failed += 1;
        continue;
      }
      const missing = must.filter((needle) => !body.includes(needle));
      if (json) {
        try {
          JSON.parse(body);
        } catch {
          missing.push('valid JSON');
        }
      }
      if (missing.length) {
        console.error(`✗ ${path} eksik:`, missing.join(', '));
        failed += 1;
      } else {
        console.log(`✓ ${path}`);
      }
    } catch (error) {
      console.error(`✗ ${path}`, error.message);
      failed += 1;
    }
  }

  if (failed) process.exit(1);
  console.log('\nSmoke tamam.\n');
}

run();
