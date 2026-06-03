'use strict';

const fs = require('fs');
const path = require('path');

/** dist/{folder}/index.html folder → route-document-meta surface key */
const SPA_SHELL_ROUTE_MAP = {
  profil: 'profil',
  favoriler: 'favoriler',
  gecmis: 'history',
  messages: 'messages',
  'ilan-ekle': 'add-listing'
};

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function canonicalUrl(siteOrigin, routePath) {
  const base = String(siteOrigin || '').replace(/\/$/, '');
  const p = routePath || '/';
  if (p === '/') return `${base}/`;
  return `${base}${p.startsWith('/') ? p : `/${p}`}`;
}

/**
 * Patch SPA shell HTML with route-specific document meta for crawlers without JS.
 */
function injectSpaShellDocumentMeta(html, { routeSurface, meta, siteOrigin }) {
  const url = canonicalUrl(siteOrigin, meta.path);

  let out = html;

  if (/\bdata-ib-route=/.test(out)) {
    out = out.replace(/\bdata-ib-route="[^"]*"/, `data-ib-route="${escapeAttr(routeSurface)}"`);
  } else {
    out = out.replace(
      /<html\s+lang="([^"]+)"/,
      `<html lang="$1" data-ib-route="${escapeAttr(routeSurface)}"`
    );
  }
  out = out.replace(/\bib-route-pending\b/g, '');

  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttr(meta.title)}</title>`);

  const replaceMetaById = (id, content) => {
    const re = new RegExp(`(<meta[^>]+id="${id}"[^>]+content=")[^"]*(")`, 'i');
    if (re.test(out)) out = out.replace(re, `$1${escapeAttr(content)}$2`);
  };

  replaceMetaById('meta-description', meta.description);
  replaceMetaById('meta-og-title', meta.title);
  replaceMetaById('meta-og-description', meta.description);
  replaceMetaById('meta-og-url', url);
  replaceMetaById('meta-twitter-title', meta.title);
  replaceMetaById('meta-twitter-description', meta.description);

  const canonRe = /(<link rel="canonical" id="meta-canonical" href=")[^"]*(")/i;
  if (canonRe.test(out)) out = out.replace(canonRe, `$1${escapeAttr(url)}$2`);

  return out;
}

function loadRouteMeta(rootDir = path.join(__dirname, '../..')) {
  return JSON.parse(
    fs.readFileSync(path.join(rootDir, 'data/route-document-meta.json'), 'utf8')
  );
}

function patchSpaShellHtml(html, folderName, routeMeta) {
  const surfaceKey = SPA_SHELL_ROUTE_MAP[folderName];
  if (!surfaceKey) return html;
  const meta = routeMeta.surfaces?.[surfaceKey];
  if (!meta) return html;
  return injectSpaShellDocumentMeta(html, {
    routeSurface: surfaceKey,
    meta,
    siteOrigin: routeMeta.siteOrigin
  });
}

module.exports = {
  SPA_SHELL_ROUTE_MAP,
  injectSpaShellDocumentMeta,
  patchSpaShellHtml,
  loadRouteMeta
};
