'use strict';

/**
 * Inject favicon head + official nav logo into static corporate/partner/legal HTML.
 */
const fs = require('fs');
const path = require('path');
const { FAVICON_HEAD, CORPORATE_BRAND_LOGO } = require('./lib/favicon-head.cjs');

const root = path.resolve(__dirname, '..');

const TARGETS = [
  'gizlilik.html',
  'kvkk.html',
  'kullanim-sartlari.html',
  'cerez-politikasi.html',
  'karar-moat.html',
  'abonelik-iptal.html',
  'partner-olun.html',
  'partner-planlar.html',
  'partner-guven.html',
  'partner-docs.html',
  'partner-onboarding.html',
  'partner-basvuru.html',
  'partner-closing-kit.html',
  'offline.html',
  'admin-panel.html'
];

const LOGO_PATTERNS = [
  /<a class="logo(?: ib-partner-logo)?" href="\/">[\s\S]*?<\/a>/,
  /<a class="logo" href="\/">isteBul[\s\S]*?<\/a>/
];

function injectFavicon(html) {
  if (html.includes('istebul-icon.svg')) return html;
  if (html.includes('<link rel="manifest"')) {
    return html.replace(/<link rel="manifest"[^>]*>/, `${FAVICON_HEAD}\n  $&`);
  }
  if (html.includes('rel="canonical"')) {
    return html.replace(
      /(<link rel="canonical"[^>]*>)/,
      `$1\n  ${FAVICON_HEAD.trim().split('\n').join('\n  ')}`
    );
  }
  return html.replace(
    /(<meta name="viewport"[^>]*>)/,
    `$1\n  ${FAVICON_HEAD.trim().split('\n').join('\n  ')}`
  );
}

function injectBrandCss(html) {
  if (html.includes('ib-brand-logo-v1.css')) return html;
  if (html.includes('corporate-shell.css')) {
    let next = html.replace(
      /(<link rel="stylesheet" href="\/css\/corporate-shell\.css[^"]*">)/,
      `  <link rel="stylesheet" href="/css/ib-brand-logo-v1.css">\n  $1`
    );
    if (!next.includes('corporate-footer-v1.css')) {
      next = next.replace(
        /(<link rel="stylesheet" href="\/css\/corporate-shell\.css[^"]*">)/,
        `$1\n  <link rel="stylesheet" href="/css/corporate-footer-v1.css?v=1">\n  <link rel="stylesheet" href="/css/site-social-links-v1.css?v=1">`
      );
    }
    return next;
  }
  const sheet = html.match(/<link rel="stylesheet" href="\/css\/[^"]+\.css[^"]*">/);
  if (!sheet) return html;
  return html.replace(sheet[0], `  <link rel="stylesheet" href="/css/ib-brand-logo-v1.css">\n  ${sheet[0]}`);
}

function replaceLogo(html) {
  if (html.includes('ib-corporate-brand')) return html;
  for (const pattern of LOGO_PATTERNS) {
    if (pattern.test(html)) {
      return html.replace(pattern, CORPORATE_BRAND_LOGO.trim());
    }
  }
  return html;
}

let updated = 0;
for (const file of TARGETS) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) {
    console.warn(`[skip] missing ${file}`);
    continue;
  }
  const before = fs.readFileSync(target, 'utf8');
  let html = injectFavicon(before);
  html = injectBrandCss(html);
  html = replaceLogo(html);
  if (html !== before) {
    fs.writeFileSync(target, html);
    console.log(`[brand-shell] ${file}`);
    updated += 1;
  }
}

console.log(`[brand-shell] done (${updated} files updated)`);
