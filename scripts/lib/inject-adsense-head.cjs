'use strict';

const ADSENSE_CLIENT_ID = 'ca-pub-6412697542113702';

function adsenseHeadSnippet(clientId = ADSENSE_CLIENT_ID) {
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}"
     crossorigin="anonymous"></script>`;
}

function hasAdSenseHead(html) {
  return (
    /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i.test(html) &&
    html.includes(ADSENSE_CLIENT_ID)
  );
}

function injectAdSenseHead(html, clientId = ADSENSE_CLIENT_ID) {
  if (!html || !html.includes('<head')) return html;
  if (hasAdSenseHead(html)) return html;

  const snippet = adsenseHeadSnippet(clientId);
  if (/<meta\s+charset/i.test(html)) {
    return html.replace(/(<meta\s+charset[^>]*>)/i, `$1\n    ${snippet}`);
  }
  return html.replace(/<head([^>]*)>/i, `<head$1>\n    ${snippet}`);
}

function applyAdSenseHeadToHtmlFiles(rootDir, { clientId = ADSENSE_CLIENT_ID } = {}) {
  if (!clientId) return { injected: 0, skipped: 0 };

  const fs = require('fs');
  const path = require('path');
  let injected = 0;
  let skipped = 0;

  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name);
      const stat = fs.statSync(file);
      if (stat.isDirectory()) {
        walk(file);
        continue;
      }
      if (!name.endsWith('.html')) continue;

      const before = fs.readFileSync(file, 'utf8');
      const after = injectAdSenseHead(before, clientId);
      if (after === before) {
        skipped += 1;
        continue;
      }
      fs.writeFileSync(file, after);
      injected += 1;
    }
  };

  walk(rootDir);
  return { injected, skipped };
}

module.exports = {
  ADSENSE_CLIENT_ID,
  adsenseHeadSnippet,
  hasAdSenseHead,
  injectAdSenseHead,
  applyAdSenseHeadToHtmlFiles
};
