'use strict';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getGoogleSiteVerificationCode(processEnv = process.env) {
  const raw = processEnv.GOOGLE_SITE_VERIFICATION || processEnv.GOOGLE_SITE_VERIFICATION_CODE || '';
  const code = String(raw).trim();
  if (!code || code === 'placeholder') return '';
  return code;
}

function googleSiteVerificationMetaHtml(code) {
  if (!code) return '';
  return `<meta name="google-site-verification" content="${escapeHtml(code)}">`;
}

function isNoIndexHtml(html) {
  return /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html);
}

function injectGoogleSiteVerification(html, code) {
  if (!code || !html || !html.includes('<head')) return html;
  if (html.includes('google-site-verification')) return html;
  if (isNoIndexHtml(html)) return html;

  const meta = googleSiteVerificationMetaHtml(code);
  if (/<meta\s+name=["']googlebot["']/i.test(html)) {
    return html.replace(/(<meta\s+name=["']googlebot["'][^>]*>)/i, `$1\n    ${meta}`);
  }
  if (/<meta\s+charset/i.test(html)) {
    return html.replace(/(<meta\s+charset[^>]*>)/i, `$1\n    ${meta}`);
  }
  return html.replace(/<head([^>]*)>/i, `<head$1>\n    ${meta}`);
}

function applyGoogleSiteVerificationToHtmlFiles(rootDir, { code, skipRelPaths = [] } = {}) {
  if (!code) return { injected: 0, skipped: 0 };

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

      const rel = path.relative(rootDir, file).replace(/\\/g, '/');
      if (skipRelPaths.some((p) => rel === p || rel.startsWith(`${p}/`))) {
        skipped += 1;
        continue;
      }

      const before = fs.readFileSync(file, 'utf8');
      const after = injectGoogleSiteVerification(before, code);
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
  getGoogleSiteVerificationCode,
  googleSiteVerificationMetaHtml,
  injectGoogleSiteVerification,
  applyGoogleSiteVerificationToHtmlFiles,
  isNoIndexHtml
};
