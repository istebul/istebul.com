'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

function monetizationEnv() {
  const verification = (process.env.GOOGLE_SITE_VERIFICATION || '').trim();
  const publisherId = (process.env.ADSENSE_PUBLISHER_ID || '').trim();
  const adSlot = (process.env.ADSENSE_AD_SLOT || '').trim();
  return { verification, publisherId, adSlot };
}

function renderGoogleSiteVerificationMeta(token) {
  if (!token) return '';
  return `<meta name="google-site-verification" content="${escapeHtml(token)}">`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function injectVerificationIntoHtml(html, token) {
  if (!token || html.includes('google-site-verification')) return html;
  const meta = renderGoogleSiteVerificationMeta(token);
  if (html.includes('<!-- seo:google-verification -->')) {
    return html.replace('<!-- seo:google-verification -->', meta);
  }
  return html.replace(/<head>/i, `<head>\n  ${meta}`);
}

function generateAdsTxt(publisherId) {
  const lines = [
    '# isteBul — Google AdSense ads.txt',
    '# Set ADSENSE_PUBLISHER_ID in Cloudflare Pages / GitHub Actions build env.'
  ];
  if (publisherId) {
    const pub = publisherId.replace(/^ca-pub-/i, '');
    lines.push(`google.com, pub-${pub}, DIRECT, f08c47fec0942fa0`);
  } else {
    lines.push('# google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0');
  }
  return `${lines.join('\n')}\n`;
}

function writeAdsTxt(distDir, publisherId) {
  const content = generateAdsTxt(publisherId);
  fs.writeFileSync(path.join(root, 'ads.txt'), content);
  if (distDir) {
    fs.writeFileSync(path.join(distDir, 'ads.txt'), content);
  }
}

function renderRehberEnvScript({ publisherId, adSlot }) {
  if (!publisherId) return '';
  const payload = { ADSENSE_PUBLISHER_ID: publisherId };
  if (adSlot) payload.ADSENSE_AD_SLOT = adSlot;
  return `<script>window.__env=Object.assign({},window.__env||{},${JSON.stringify(payload)});</script>`;
}

module.exports = {
  monetizationEnv,
  renderGoogleSiteVerificationMeta,
  injectVerificationIntoHtml,
  generateAdsTxt,
  writeAdsTxt,
  renderRehberEnvScript,
  escapeHtml
};
