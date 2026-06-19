#!/usr/bin/env node
/**
 * Cloudflare Pages _redirects compatibility — dynamic rule budget + loop safety.
 */
const fs = require('fs');
const path = require('path');
const {
  REQUIRED_ADMIN_DEEP_LINK_SLUGS,
  assertAdminShellHtml
} = require('./lib/admin-deep-links.cjs');

const root = process.cwd();
const redirectsPath = path.join(root, 'dist', '_redirects');
const errors = [];

if (!fs.existsSync(redirectsPath)) {
  console.error('cloudflare-redirects-audit: dist/_redirects missing — run npm run build');
  process.exit(1);
}

const raw = fs.readFileSync(redirectsPath, 'utf8');
const lines = raw.split('\n');

const rules = [];
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) continue;
  rules.push({
    source: parts[0],
    destination: parts[1],
    code: parts[2] || '302',
    raw: trimmed
  });
}

const isDynamic = (source) => source.includes('*') || source.includes(':');
const dynamicRules = rules.filter((r) => isDynamic(r.source));
const staticRules = rules.filter((r) => !isDynamic(r.source));

const infiniteLoops = rules.filter((r) => r.source === r.destination);

const adminRedirectRules = rules.filter((r) =>
  /^\/admin/.test(r.source) || /admin-panel/.test(r.source) || /admin-panel/.test(r.destination)
);
if (adminRedirectRules.length) {
  errors.push(
    `admin must not use _redirects (serve dist/admin/index.html statically): ${adminRedirectRules
      .map((r) => r.raw)
      .join('; ')}`
  );
}

const adminIndexPath = path.join(root, 'dist', 'admin', 'index.html');
if (!fs.existsSync(adminIndexPath) || fs.statSync(adminIndexPath).size === 0) {
  errors.push('dist/admin/index.html missing — run npm run build');
} else {
  try {
    assertAdminShellHtml(fs.readFileSync(adminIndexPath, 'utf8'), 'dist/admin/index.html');
  } catch (err) {
    errors.push(err.message);
  }
}

for (const slug of REQUIRED_ADMIN_DEEP_LINK_SLUGS) {
  const shellPath = path.join(root, 'dist', 'admin', slug, 'index.html');
  if (!fs.existsSync(shellPath) || fs.statSync(shellPath).size === 0) {
    errors.push(
      `dist/admin/${slug}/index.html missing — admin deep links must be static (not /* SPA fallback)`
    );
    continue;
  }
  try {
    assertAdminShellHtml(fs.readFileSync(shellPath, 'utf8'), `dist/admin/${slug}/index.html`);
  } catch (err) {
    errors.push(err.message);
  }
}

const spaFallback = rules.find((r) => r.source === '/*');
if (spaFallback?.destination === '/admin/index.html') {
  errors.push('SPA fallback must not target admin — use physical dist/admin/*/index.html shells');
}

const spaIdx = rules.findIndex((r) => r.source === '/*');
if (spaIdx === -1) {
  errors.push('missing SPA fallback: /* /index.html 200');
} else if (spaIdx !== rules.length - 1) {
  errors.push('SPA fallback /* must be the last active rule');
}

if (dynamicRules.length >= 100) {
  errors.push(`dynamic rule count ${dynamicRules.length} exceeds Cloudflare limit (max 99)`);
}

if (infiniteLoops.length) {
  errors.push(
    `infinite-loop rules detected (${infiniteLoops.length}): ${infiniteLoops
      .slice(0, 5)
      .map((r) => r.raw)
      .join('; ')}`
  );
}

const removedPatterns = [
  /^\/env\.js\s/,
  /^\/hakkimizda\.html\s+\/hakkimizda\.html/,
  /^\/auto\s+\/auto\/index\.html/,
  /^\/en\/auto\s/,
  /^\/karar-asistani\s+\/karar-asistani\/index\.html/,
  /^\/sigorta\/\*\s/
];

for (const pattern of removedPatterns) {
  const hit = rules.find((r) => pattern.test(r.raw));
  if (hit) {
    errors.push(`removed rule pattern still present: ${hit.raw}`);
  }
}

console.log('cloudflare-redirects-audit:');
console.log(`  total active rules: ${rules.length}`);
console.log(`  static rules: ${staticRules.length}`);
console.log(`  dynamic rules: ${dynamicRules.length} (limit 100)`);
console.log(`  file lines: ${lines.length}`);
console.log(`  infinite-loop rules: ${infiniteLoops.length}`);

if (errors.length) {
  errors.forEach((e) => console.error(`  FAIL: ${e}`));
  process.exit(1);
}

console.log('cloudflare-redirects-audit: OK');
