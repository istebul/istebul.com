#!/usr/bin/env node
'use strict';

/**
 * Site-wide corporate/partner footer: structure, assets, social boot.
 */
const fs = require('fs');
const path = require('path');
const {
  renderCorporateFooter,
  replaceLegacyKvkkAnchor
} = require('./lib/legal-footer.cjs');
const { FOOTER_STYLESHEETS_HTML } = require('./lib/footer-assets.cjs');
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
  'admin-panel.html',
  'auto/index.html'
];

const PARTNER_TAGLINES = {
  'partner-olun.html':
    'Araç alım karar altyapısı ve nitelikli lead teslimatı. Bilgilendirme amaçlıdır; finansal taahhüt içermez.',
  'partner-guven.html': 'Bilgilendirme amaçlıdır; hukuki danışmanlık yerine geçmez.',
  'partner-planlar.html': 'Partner planları ve lead teslimat koşulları — bilgilendirme amaçlıdır.',
  'partner-basvuru.html': 'Partner başvuru süreci KVKK ve sözleşme metinleriyle uyumludur.',
  'partner-docs.html': 'API ve webhook dokümantasyonu — production davranışını yansıtır.',
  'partner-closing-kit.html': 'Kurumsal satış materyalleri — bilgilendirme amaçlıdır.'
};

const COOKIE_CSS = '<link rel="stylesheet" href="/css/static-cookie-consent-v1.css?v=1">';
const COOKIE_BANNER = `<div class="static-cookie-consent" id="static-cookie-consent" role="region" aria-label="Çerez tercihi" hidden>
  <p>Çerez ve analitik tercihinizi yönetin. <a href="/cerez-politikasi.html">Çerez politikası</a> · Ana sitede <a href="/">tam tercih paneli</a>.</p>
  <div class="static-cookie-consent__actions">
    <button type="button" class="btn btn-primary btn-sm" data-static-cookie-accept>Kabul et</button>
    <button type="button" class="btn btn-outline btn-sm" data-static-cookie-decline>Reddet</button>
  </div>
</div>`;

function injectFooterAssets(html) {
  let out = html;
  if (!out.includes('corporate-footer-v1.css')) {
    if (out.includes('corporate-shell.css')) {
      out = out.replace(
        /<link rel="stylesheet" href="\/css\/corporate-shell\.css[^"]*">/,
        `$&\n  ${FOOTER_STYLESHEETS_HTML}`
      );
    } else if (out.includes('/css/bundles/auto-page.bundle.css')) {
      out = out.replace(
        /<link rel="stylesheet" href="\/css\/bundles\/auto-page\.bundle\.css[^"]*">/,
        `$&\n  ${FOOTER_STYLESHEETS_HTML}`
      );
    } else if (out.includes('corporate-pages.css')) {
      out = out.replace(
        /<link rel="stylesheet" href="\/css\/corporate-pages\.css[^"]*">/,
        `${FOOTER_STYLESHEETS_HTML}\n  $&`
      );
    } else {
      out = out.replace('</head>', `  ${FOOTER_STYLESHEETS_HTML}\n</head>`);
    }
  } else if (out.includes('corporate-footer-v1.css?v=1')) {
    out = out.replace(/corporate-footer-v1\.css\?v=1/g, 'corporate-footer-v1.css?v=2');
    out = out.replace(/site-social-links-v1\.css\?v=1/g, 'site-social-links-v1.css?v=2');
  }
  return out;
}

function syncCorporateFooter(html, rel) {
  const tagline = PARTNER_TAGLINES[rel];
  const footerHtml = renderCorporateFooter(tagline ? { tagline } : {});

  if (html.includes('corporate-footer__nav')) {
    const footerRe = /<footer class="corporate-footer">[\s\S]*?<\/footer>/;
    if (footerRe.test(html)) {
      return html.replace(footerRe, footerHtml);
    }
    return html;
  }

  if (html.includes('class="corporate-footer"')) {
    const footerRe = /<footer class="corporate-footer">[\s\S]*?<\/footer>/;
    return html.replace(footerRe, footerHtml);
  }

  if (
    rel.startsWith('partner-') ||
    rel === 'karar-moat.html' ||
    rel === 'auto/index.html'
  ) {
    return html.replace(
      /(\s*<script src="\/env\.js"|<\s*script type="module" src="\/js\/corporate)/,
      `\n  ${footerHtml}\n$1`
    );
  }

  return html;
}

function stripSeoFooterLinks(html) {
  return html.replace(
    /<nav class="seo-footer-links"[\s\S]*?<\/nav>\s*(?=<\/footer>)/,
    ''
  );
}

function normalizeBodyScripts(html) {
  let out = html;
  out = out.replace(
    /<link rel="stylesheet" href="\/css\/site-social-links-v1\.css[^"]*">\s*<script src="\/env\.js" defer><\/script>\s*<script type="module" src="\/js\/runtime\/site-social-init\.js"><\/script>\s*$/m,
    ''
  );
  if (out.includes('data-site-social-links') && !out.includes('site-social-init.js')) {
    out = out.replace(
      /(<script src="\/env\.js" defer><\/script>)/,
      `$1\n  <script type="module" src="/js/runtime/site-social-init.js"></script>`
    );
  }
  return out;
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
  html = normalizeBodyScripts(html);
  if (html !== before) {
    fs.writeFileSync(filePath, html);
    console.log('[sync]', rel);
    updated += 1;
  }
}

console.log(`sync-corporate-footers: ${updated} file(s) updated`);
