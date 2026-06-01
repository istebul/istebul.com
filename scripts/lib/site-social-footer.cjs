'use strict';

/** Shared footer markup + boot scripts for site_settings social links. */

function renderSiteSocialFooterNav() {
  return `<nav class="ib-site-social ib-site-social--footer" data-site-social-links aria-label="Sosyal medya" hidden></nav>`;
}

function renderSiteSocialBootScripts() {
  return `<link rel="stylesheet" href="/css/site-social-links-v1.css?v=1">
<script src="/env.js" defer></script>
<script type="module" src="/js/runtime/site-social-init.js"></script>`;
}

function renderSiteSocialBootScriptsNoEnv() {
  return `<link rel="stylesheet" href="/css/site-social-links-v1.css?v=1">
<script type="module" src="/js/runtime/site-social-init.js"></script>`;
}

/**
 * Inject social nav + init script into static HTML (idempotent).
 * @param {string} html
 */
function injectSiteSocialIntoHtml(html) {
  if (!html || html.includes('data-site-social-links')) {
    return html;
  }

  const nav = renderSiteSocialFooterNav();
  let next = html;

  const injectPoints = [
    /(<footer class="seo-footer">[\s\S]*?<div>\s*<strong>[^<]+<\/strong>\s*<p>[^<]*<\/p>)/,
    /(<footer class="corporate-footer">[\s\S]*?<div>\s*<strong>[^<]+<\/strong>\s*<p[^>]*>[^<]*<\/p>)/,
    /(<footer class="corporate-footer">[\s\S]*?<div>\s*<strong>[^<]+<\/strong>\s*<p class="[^"]*">[^<]*<\/p>)/,
    /(<footer class="vacation-footer">[\s\S]*?<p>isteBul[^<]*<\/p>)/,
    /(<footer class="housing-locale-footer">[\s\S]*?<div class="housing-container">)/
  ];

  for (const re of injectPoints) {
    if (re.test(next)) {
      next = next.replace(re, `$1\n        ${nav}`);
      break;
    }
  }

  if (!next.includes('data-site-social-links')) {
    return html;
  }

  if (!next.includes('site-social-init')) {
    const hasEnv = /<script[^>]+src="[^"]*env\.js"/i.test(next);
    const boot = hasEnv ? renderSiteSocialBootScriptsNoEnv() : renderSiteSocialBootScripts();
    next = next.replace(/<\/body>/i, `${boot}\n</body>`);
  }

  if (!next.includes('site-social-links-v1.css')) {
    next = next.replace(/<\/head>/i, `  <link rel="stylesheet" href="/css/site-social-links-v1.css?v=1">\n</head>`);
  }

  return next;
}

module.exports = {
  renderSiteSocialFooterNav,
  renderSiteSocialBootScripts,
  renderSiteSocialBootScriptsNoEnv,
  injectSiteSocialIntoHtml
};
