'use strict';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getGa4MeasurementId(processEnv = process.env, rootDir = process.cwd()) {
  const { buildPublicEnv, withCiBuildPublicEnvFallback } = require('./public-env.cjs');
  const env = withCiBuildPublicEnvFallback(buildPublicEnv(processEnv, rootDir), processEnv);
  return String(env.GA4_MEASUREMENT_ID || '').trim();
}

function ga4ConsentHeadSnippet(measurementId) {
  if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) return '';
  const id = escapeHtml(measurementId);
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});
gtag('config','${id}',{anonymize_ip:true});
</script>`;
}

function isNoIndexHtml(html) {
  return /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html);
}

function injectGa4ConsentHead(html, measurementId) {
  if (!measurementId || !html || !html.includes('<head')) return html;
  if (html.includes('googletagmanager.com/gtag/js')) return html;
  if (isNoIndexHtml(html)) return html;

  const snippet = ga4ConsentHeadSnippet(measurementId);
  if (!snippet) return html;

  if (/<meta\s+charset/i.test(html)) {
    return html.replace(/(<meta\s+charset[^>]*>)/i, `$1\n    ${snippet}`);
  }
  return html.replace(/<head([^>]*)>/i, `<head$1>\n    ${snippet}`);
}

function applyGa4ConsentHeadToHtmlFiles(rootDir, { measurementId } = {}) {
  if (!measurementId) return { injected: 0, skipped: 0 };

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
      const after = injectGa4ConsentHead(before, measurementId);
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
  getGa4MeasurementId,
  ga4ConsentHeadSnippet,
  injectGa4ConsentHead,
  applyGa4ConsentHeadToHtmlFiles
};
