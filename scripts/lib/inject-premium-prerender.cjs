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

function renderPrerenderBlock(sectionId, data) {
  const bullets = (data.bullets || [])
    .map((b) => `<li>${escapeHtml(b)}</li>`)
    .join('\n                ');

  return `            <div class="ib-prerender-seo" data-prerender-for="${sectionId}">
                <div class="container ib-premium-noscript">
                    <p class="section-kicker">${escapeHtml(data.title)}</p>
                    <h1>${escapeHtml(data.h1)}</h1>
                    <p class="ib-premium-lead">${escapeHtml(data.lead)}</p>
                    <ul class="ib-check-list">${bullets}</ul>
                    <p class="ib-prerender-actions">
                        <a href="/karar-asistani/" class="btn btn-primary">Ön değerlendirmeye başla</a>
                        <a href="/metodoloji" class="btn btn-outline">Metodolojiyi incele</a>
                    </p>
                </div>
            </div>`;
}

function injectPremiumPrerender(html) {
  const config = JSON.parse(
    fs.readFileSync(path.join(root, 'data/seo/premium-prerender.json'), 'utf8')
  );

  let out = html;

  Object.entries(config).forEach(([sectionId, data]) => {
    const marker = `<section id="${sectionId}"`;
    const idx = out.indexOf(marker);
    if (idx === -1) {
      throw new Error(`Premium section not found: ${sectionId}`);
    }

    const insertAt = out.indexOf('>', idx) + 1;
    const block = `\n${renderPrerenderBlock(sectionId, data)}\n`;
    if (out.includes(`data-prerender-for="${sectionId}"`)) {
      return;
    }
    out = out.slice(0, insertAt) + block + out.slice(insertAt);
  });

  return out;
}

module.exports = { injectPremiumPrerender };
