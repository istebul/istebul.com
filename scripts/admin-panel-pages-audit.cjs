#!/usr/bin/env node
/**
 * Admin panel — every nav target has page DOM + registered handler + ADMIN_PAGE_IDS sync.
 */
const fs = require('fs');
const path = require('path');
const { parseAdminPageIds, parseAdminPathAliases } = require('./lib/admin-deep-links.cjs');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(msg);
  failed = true;
};

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
const routing = fs.readFileSync(path.join(root, 'js/admin/admin-page-routing.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'js/admin/admin-shell.js'), 'utf8');
const adminJs = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');

if (!routing.includes('registerAdminPageHandlers')) {
  fail('admin-page-routing must export registerAdminPageHandlers');
}
if (!adminJs.includes('registerAdminPageHandlers')) {
  fail('admin-panel.js must register page handlers');
}
if (!adminJs.includes('showAdminPage')) {
  fail('admin-panel.js must use showAdminPage');
}

const navBlockMatch = adminHtml.match(/<nav[^>]*id="admin-nav"[\s\S]*?<\/nav>/);
if (!navBlockMatch) {
  fail('admin-panel.html missing #admin-nav');
}
const navBlock = navBlockMatch[0];
const navTargets = [...navBlock.matchAll(/data-page-target="([^"]+)"/g)].map((m) => m[1]);
const uniqueNav = [...new Set(navTargets)];

for (const id of uniqueNav) {
  if (!adminHtml.includes(`id="page-${id}"`)) {
    fail(`admin-panel.html missing page-${id} for nav ${id}`);
  }
}

const registered = [...adminJs.matchAll(/['"]([a-z0-9-]+)['"]:\s*(?:async\s*)?\(\)\s*=>/g)]
  .map((m) => m[1])
  .filter((id) => id.includes('-') || ['dashboard', 'settings', 'content', 'announcements', 'faqs', 'blog', 'listings', 'users'].includes(id));

const handlerStart = adminJs.indexOf('registerAdminPageHandlers({');
const bindStart = adminJs.indexOf('function bindAdminPanelEvents');
const handlerBlock =
  handlerStart >= 0 && bindStart > handlerStart
    ? adminJs.slice(handlerStart, bindStart)
    : '';
for (const id of uniqueNav) {
  const hasKey =
    handlerBlock.includes(`${id}:`) ||
    handlerBlock.includes(`'${id}':`) ||
    handlerBlock.includes(`"${id}":`);
  if (!hasKey) fail(`registerAdminPageHandlers missing key: ${id}`);
}

for (const id of ['dashboard-ceo', 'category-dominance', 'ops-ai-assistant', 'users', 'home-news', 'vertical-leads', 'unified-funnel']) {
  if (!uniqueNav.includes(id)) fail(`expected nav target ${id}`);
}

const pageIds = parseAdminPageIds();
const aliases = parseAdminPathAliases();

for (const id of uniqueNav) {
  if (!pageIds.includes(id)) {
    fail(`ADMIN_PAGE_IDS missing nav target: ${id}`);
  }
}

for (const id of pageIds) {
  if (!uniqueNav.includes(id)) {
    fail(`admin nav missing ADMIN_PAGE_IDS entry: ${id}`);
  }
}

for (const [slug, targetId] of Object.entries(aliases)) {
  if (!pageIds.includes(targetId)) {
    fail(`ADMIN_PATH_ALIASES[${slug}] → ${targetId} is not in ADMIN_PAGE_IDS`);
  }
}

const navLabelsMatch = shell.match(/const NAV_LABELS = \{([\s\S]*?)\};/);
if (!navLabelsMatch) {
  fail('admin-shell.js must define NAV_LABELS');
} else {
  const navLabelsBlock = navLabelsMatch[1];
  for (const id of pageIds) {
    const quoted = `'${id}'`;
    const unquoted = `${id}:`;
    if (!navLabelsBlock.includes(quoted) && !navLabelsBlock.includes(unquoted)) {
      fail(`NAV_LABELS missing ADMIN_PAGE_IDS entry: ${id}`);
    }
  }
}

if (!adminHtml.includes('data-page-target="listings"')) {
  fail('admin nav must include listings (Karar Seçenekleri)');
}
if (!adminHtml.includes('>Karar Seçenekleri<')) {
  fail('admin nav label must be Karar Seçenekleri (not classic ilan site terminology drift)');
}
if (!adminHtml.includes('href="/admin/ai-listings/"')) {
  fail('admin nav must include AI İlan Yönetimi external link');
}
if (!adminHtml.includes('>AI İlan Yönetimi<')) {
  fail('admin nav must label external AI listings link as AI İlan Yönetimi');
}
if (routing.includes("'decision-center'") && !routing.includes('ADMIN_PATH_ALIASES')) {
  fail('decision-center must be a path alias, not a page id');
}

if (failed) process.exit(1);
console.log(`admin-panel-pages-audit OK (${uniqueNav.length} pages, ${pageIds.length} ADMIN_PAGE_IDS)`);
