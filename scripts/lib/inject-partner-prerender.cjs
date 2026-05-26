'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBlock(pageKey, data) {
  const sections = (data.sections || [])
    .map(
      (s) => `
        <section class="ib-partner-prerender-section">
          <h2>${escapeHtml(s.h2)}</h2>
          <p>${escapeHtml(s.p)}</p>
        </section>`
    )
    .join('');

  const bullets = (data.bullets || [])
    .map((b) => `<li>${escapeHtml(b)}</li>`)
    .join('');

  const actions = (data.actions || [])
    .map((a) => {
      const cls = a.primary ? 'btn primary' : 'btn secondary';
      return `<a class="${cls}" href="${escapeHtml(a.href)}">${escapeHtml(a.label)}</a>`;
    })
    .join('');

  return `
    <div class="ib-partner-prerender" data-partner-prerender="${escapeHtml(pageKey)}" data-corporate-loading>
      <header class="ib-partner-prerender-hero">
        <p class="kicker">${escapeHtml(data.kicker)}</p>
        <h1>${escapeHtml(data.h1)}</h1>
        <p class="lead">${escapeHtml(data.lead)}</p>
        ${bullets ? `<ul class="ib-check-list">${bullets}</ul>` : ''}
      </header>
      ${sections}
      <div class="ib-partner-prerender-actions">${actions}</div>
      <p class="text-muted-sm ib-partner-prerender-note">Tam etkileşimli sürüm yükleniyor…</p>
    </div>`;
}

function injectPartnerPrerender(html, pageKey, data) {
  const shellId = data.shellId;
  const marker = `id="${shellId}"`;
  const idx = html.indexOf(marker);
  if (idx === -1) {
    throw new Error(`Partner shell not found: ${shellId} (${pageKey})`);
  }

  const openEnd = html.indexOf('>', idx) + 1;
  const closeTag = data.nested ? `</div>` : `</main>`;
  const closeIdx = html.indexOf(closeTag, openEnd);
  if (closeIdx === -1) {
    throw new Error(`Partner shell close not found: ${pageKey}`);
  }

  const block = renderBlock(pageKey, data);
  const inner = html.slice(openEnd, closeIdx).trim();
  if (inner.includes('data-partner-prerender=')) {
    return html;
  }

  return html.slice(0, openEnd) + block + html.slice(closeIdx);
}

function injectAllPartnerPrerenders(html, config) {
  let out = html;
  Object.entries(config).forEach(([pageKey, data]) => {
    if (pageKey.endsWith('.html')) return;
    out = injectPartnerPrerender(out, pageKey, data);
  });
  return out;
}

function injectPartnerHtmlFiles(distDir) {
  const config = JSON.parse(
    fs.readFileSync(path.join(root, 'data/seo/partner-pages-prerender.json'), 'utf8')
  );

  const fileMap = {
    'partner-docs': 'partner-docs.html',
    'partner-planlar': 'partner-planlar.html',
    'partner-guven': 'partner-guven.html'
  };

  Object.entries(fileMap).forEach(([key, file]) => {
    const target = path.join(distDir, file);
    if (!fs.existsSync(target)) return;
    const data = config[key];
    if (!data) return;
    let html = fs.readFileSync(target, 'utf8');
    html = injectPartnerPrerender(html, key, data);
    fs.writeFileSync(target, html);
  });
}

module.exports = { injectPartnerPrerender, injectAllPartnerPrerenders, injectPartnerHtmlFiles };
