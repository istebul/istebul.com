#!/usr/bin/env node
/**
 * Verify public bot / monitor access to isteBul (Cloudflare WAF sanity).
 * Exit 0 when smoke UA reaches SEO paths; warn on homepage / Googlebot / Chrome 403.
 */
const base = (process.argv[2] || 'https://www.istebul.com').replace(/\/$/, '');

const PROBES = [
  {
    name: 'production-smoke',
    ua: 'Mozilla/5.0 (compatible; isteBul-production-smoke/1.0; +https://www.istebul.com)',
    requiredPaths: ['/planlar', '/blog', '/auto/']
  },
  {
    name: 'googlebot',
    ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    requiredPaths: []
  },
  {
    name: 'chrome-desktop',
    ua:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    requiredPaths: []
  }
];

const PATHS = ['/', '/planlar', '/blog', '/auto/'];

let failed = 0;
let warned = 0;

function isChallenge(body, res) {
  return (
    res.status === 403 ||
    body.includes('Just a moment') ||
    body.includes('cf-mitigated') ||
    body.includes('challenges.cloudflare.com')
  );
}

async function probe({ name, ua, requiredPaths }, path) {
  const url = `${base}${path}`;
  const res = await fetch(url, { headers: { 'User-Agent': ua, Accept: 'text/html,*/*' } });
  const body = await res.text();
  const challenge = isChallenge(body, res);
  const ok = res.status === 200 && !challenge;

  if (ok) {
    console.log(`OK  ${name} ${path}`);
    return;
  }

  const msg = `${name} ${path} HTTP ${res.status}${challenge ? ' (CF challenge)' : ''}`;
  const docHint = 'configure Cloudflare Verified Bots / WAF skip (see docs/CLOUDFLARE_BOT_ACCESS.md)';

  if (requiredPaths.includes(path)) {
    console.error(`FAIL ${msg}`);
    failed += 1;
    return;
  }

  if (name === 'production-smoke' && path === '/' && challenge) {
    console.warn(`WARN ${msg} — homepage CF challenge until WAF tuning; ${docHint}`);
    warned += 1;
    return;
  }

  console.warn(`WARN ${msg} — ${docHint}`);
  warned += 1;
}

async function main() {
  console.log(`\nverify-bot-access → ${base}\n`);
  for (const p of PROBES) {
    for (const path of PATHS) {
      await probe(p, path);
    }
  }
  console.log(`\nDone. failed=${failed} warned=${warned}\n`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
