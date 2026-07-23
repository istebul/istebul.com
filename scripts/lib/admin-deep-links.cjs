/**
 * Admin panel deep-link slugs — physical dist/admin/<slug>/index.html shells.
 * Parsed from js/admin/admin-page-routing.js (single source of truth for page ids).
 */
const fs = require('fs');
const path = require('path');

const ROUTING_PATH = path.join(process.cwd(), 'js/admin/admin-page-routing.js');

function parseQuotedList(block) {
  return [...String(block).matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
}

function parseAdminPageIds() {
  const src = fs.readFileSync(ROUTING_PATH, 'utf8');
  const match = src.match(/export const ADMIN_PAGE_IDS = \[([\s\S]*?)\];/);
  if (!match) throw new Error('ADMIN_PAGE_IDS block missing in admin-page-routing.js');
  return parseQuotedList(match[1]);
}

function parseAdminPathAliases() {
  const src = fs.readFileSync(ROUTING_PATH, 'utf8');
  const anchor = src.indexOf('export const ADMIN_PATH_ALIASES');
  if (anchor === -1) return {};
  const open = src.indexOf('{', anchor);
  if (open === -1) return {};
  let depth = 0;
  let close = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close === -1) return {};
  const block = src.slice(open + 1, close);
  const aliases = {};
  for (const m of block.matchAll(/'([^']+)':\s*'([^']+)'/g)) {
    aliases[m[1]] = m[2];
  }
  return aliases;
}

/** Slugs that must have physical dist/admin/<slug>/index.html (no _redirects). */
function getAdminDeepLinkSlugs() {
  const aliases = parseAdminPathAliases();
  return [...new Set([...parseAdminPageIds(), ...Object.keys(aliases)])].sort();
}

/** CI-critical admin paths that must not fall through to public SPA index.html */
const REQUIRED_ADMIN_DEEP_LINK_SLUGS = ['listings', 'decision-center'];

function assertAdminShellHtml(html, label) {
  if (!html.includes('/js/admin-panel.js')) {
    throw new Error(`${label} must load /js/admin-panel.js`);
  }
  if (/app\.bundle-[A-Z0-9]+\.js/.test(html)) {
    throw new Error(`${label} must not be public SPA index.html`);
  }
}

module.exports = {
  REQUIRED_ADMIN_DEEP_LINK_SLUGS,
  getAdminDeepLinkSlugs,
  parseAdminPageIds,
  parseAdminPathAliases,
  assertAdminShellHtml
};
