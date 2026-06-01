#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  CORPORATE_FOOTER_NAV_HTML,
  replaceLegacyKvkkAnchor,
  LEGAL_INLINE_LINKS_HTML
} = require('./lib/legal-footer.cjs');
const { renderSiteSocialBootScripts } = require('./lib/site-social-footer.cjs');

const root = path.join(__dirname, '..');

const CORPORATE_HTML = [
  'gizlilik.html',
  'kullanim-sartlari.html',
  'cerez-politikasi.html',
  'kvkk.html',
  'hakkimizda.html',
  'iletisim.html',
  'yardim.html',
  'partner-olun.html',
  'partner-guven.html',
  'partner-planlar.html',
  'partner-basvuru.html',
  'partner-docs.html',
  'karar-moat.html',
  'auto/index.html',
  'index.html'
];

const COOKIE_CSS = '<link rel="stylesheet" href="/css/static-cookie-consent-v1.css?v=1">';
const COOKIE_BANNER = `<div class="static-cookie-consent" id="static-cookie-consent" role="region" aria-label="Çerez tercihi" hidden>
  <p>Çerez ve analitik tercihinizi yönetin. <a href="/cerez-politikasi.html">Çerez politikası</a> · Ana sitede <a href="/">tam tercih paneli</a>.</p>
  <div class="static-cookie-consent__actions">
    <button type="button" class="btn btn-primary btn-sm" data-static-cookie-accept>Kabul et</button>
    <button type="button" class="btn btn-outline btn-sm" data-static-cookie-decline>Reddet</button>
  </div>
</div>`;

function syncCorporateNav(html) {
  const navRe = /<nav>\s*<a href="\/hakkimizda\.html">[\s\S]*?<\/nav>/;
  if (navRe.test(html) && html.includes('corporate-footer')) {
    return html.replace(navRe, CORPORATE_FOOTER_NAV_HTML);
  }
  const shortNavRe = /<nav>\s*<a href="\/gizlilik\.html">[\s\S]*?<\/nav>/;
  if (shortNavRe.test(html) && html.includes('corporate-footer')) {
    return html.replace(shortNavRe, CORPORATE_FOOTER_NAV_HTML);
  }
  return html;
}

function injectCookieAssets(html) {
  let out = replaceLegacyKvkkAnchor(html);
  if (!out.includes('static-cookie-consent-v1.css')) {
    out = out.replace('</head>', `  ${COOKIE_CSS}\n</head>`);
  }
  if (!out.includes('id="static-cookie-consent"') && !out.includes('id="cookie-consent"')) {
    out = out.replace('</body>', `  ${COOKIE_BANNER}\n  <script src="/js/runtime/static-cookie-consent.js" defer></script>\n</body>`);
  }
  if (!out.includes('site-social-init.js') && out.includes('data-site-social-links')) {
    out = out.replace(
      '</body>',
      `  <link rel="stylesheet" href="/css/site-social-links-v1.css?v=1">\n${renderSiteSocialBootScripts()}\n</body>`
    );
  }
  return out;
}

function syncPartnerLegalLine(html) {
  return html.replace(
    /<p class="partner-footer-legal">[\s\S]*?<\/p>/,
    `<p class="partner-footer-legal">${LEGAL_INLINE_LINKS_HTML} · <a href="/cerez-politikasi.html">Çerez</a></p>`
  );
}

let updated = 0;
for (const rel of CORPORATE_HTML) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) {
    console.warn('[skip]', rel);
    continue;
  }
  let html = fs.readFileSync(filePath, 'utf8');
  const before = html;
  html = syncCorporateNav(html);
  html = injectCookieAssets(html);
  if (rel === 'partner-olun.html') html = syncPartnerLegalLine(html);
  if (html !== before) {
    fs.writeFileSync(filePath, html);
    console.log('[sync]', rel);
    updated += 1;
  }
}

console.log(`sync-corporate-footers: ${updated} file(s) updated`);
