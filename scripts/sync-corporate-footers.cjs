#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  renderCorporateFooter,
  replaceLegacyKvkkAnchor
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
  'partner-onboarding.html',
  'partner-closing-kit.html',
  'karar-moat.html',
  'abonelik-iptal.html',
  'offline.html',
  'admin-panel.html'
];

const FOOTER_CSS = '<link rel="stylesheet" href="/css/corporate-footer-v1.css?v=1">';
const SOCIAL_CSS = '<link rel="stylesheet" href="/css/site-social-links-v1.css?v=1">';
const COOKIE_CSS = '<link rel="stylesheet" href="/css/static-cookie-consent-v1.css?v=1">';
const COOKIE_BANNER = `<div class="static-cookie-consent" id="static-cookie-consent" role="region" aria-label="Çerez tercihi" hidden>
  <p>Çerez ve analitik tercihinizi yönetin. <a href="/cerez-politikasi.html">Çerez politikası</a> · Ana sitede <a href="/">tam tercih paneli</a>.</p>
  <div class="static-cookie-consent__actions">
    <button type="button" class="btn btn-primary btn-sm" data-static-cookie-accept>Kabul et</button>
    <button type="button" class="btn btn-outline btn-sm" data-static-cookie-decline>Reddet</button>
  </div>
</div>`;

const PARTNER_TAGLINES = {
  'partner-olun.html':
    'Araç alım karar altyapısı ve nitelikli lead teslimatı. Bilgilendirme amaçlıdır; finansal taahhüt içermez.',
  'partner-guven.html': 'Bilgilendirme amaçlıdır; hukuki danışmanlık yerine geçmez.',
  'partner-planlar.html': 'Partner planları ve lead teslimat koşulları — bilgilendirme amaçlıdır.',
  'partner-basvuru.html': 'Partner başvuru süreci KVKK ve sözleşme metinleriyle uyumludur.',
  'partner-docs.html': 'API ve webhook dokümantasyonu — production davranışını yansıtır.',
  'partner-onboarding.html': 'Self-serve partner onboarding — bilgilendirme amaçlıdır.',
  'partner-closing-kit.html': 'Kurumsal satış ve kapanış materyalleri — bilgilendirme amaçlıdır.'
};

function injectFooterAssets(html) {
  let out = html;
  if (!out.includes('corporate-footer-v1.css')) {
    if (out.includes('corporate-shell.css')) {
      out = out.replace(
        /<link rel="stylesheet" href="\/css\/corporate-shell\.css[^"]*">/,
        `$&\n  ${FOOTER_CSS}\n  ${SOCIAL_CSS}`
      );
    } else if (out.includes('corporate-pages.css')) {
      out = out.replace(
        /<link rel="stylesheet" href="\/css\/corporate-pages\.css[^"]*">/,
        `${FOOTER_CSS}\n  ${SOCIAL_CSS}\n  $&`
      );
    } else {
      out = out.replace('</head>', `  ${FOOTER_CSS}\n  ${SOCIAL_CSS}\n</head>`);
    }
  }
  return out;
}

function syncCorporateFooter(html, rel) {
  if (!html.includes('corporate-footer')) return html;
  const tagline = PARTNER_TAGLINES[rel];
  const footerHtml = renderCorporateFooter(tagline ? { tagline } : {});
  const footerRe = /<footer class="corporate-footer">[\s\S]*?<\/footer>/;
  if (!footerRe.test(html)) return html;
  return html.replace(footerRe, footerHtml);
}

function stripSeoFooterLinks(html) {
  return html.replace(
    /<nav class="seo-footer-links"[\s\S]*?<\/nav>\s*(?=<\/footer>)/,
    ''
  );
}

function injectCookieAssets(html) {
  let out = replaceLegacyKvkkAnchor(html);
  if (!out.includes('static-cookie-consent-v1.css')) {
    out = out.replace('</head>', `  ${COOKIE_CSS}\n</head>`);
  }
  if (!out.includes('id="static-cookie-consent"') && !out.includes('id="cookie-consent"')) {
    out = out.replace('</body>', `  ${COOKIE_BANNER}\n  <script type="module" src="/js/runtime/static-cookie-consent.js"></script>\n</body>`);
  }
  if (!out.includes('src="/env.js"')) {
    out = out.replace('</body>', '  <script src="/env.js" defer></script>\n</body>');
  }
  if (!out.includes('site-social-init.js') && out.includes('data-site-social-links')) {
    out = out.replace('</body>', `  ${renderSiteSocialBootScripts()}\n</body>`);
  }
  return out;
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
  html = stripSeoFooterLinks(html);
  html = syncCorporateFooter(html, rel);
  html = injectFooterAssets(html);
  html = injectCookieAssets(html);
  if (rel !== 'index.html' && html !== before) {
    fs.writeFileSync(filePath, html);
    console.log('[sync]', rel);
    updated += 1;
  }
}

console.log(`sync-corporate-footers: ${updated} file(s) updated`);
