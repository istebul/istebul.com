#!/usr/bin/env node
/**
 * Admin panel — every nav target has page DOM + registered handler.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(msg);
  failed = true;
};

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
const routing = fs.readFileSync(path.join(root, 'js/admin/admin-page-routing.js'), 'utf8');
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

const navTargets = [...adminHtml.matchAll(/data-page-target="([^"]+)"/g)].map((m) => m[1]);
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

for (const id of ['dashboard-ceo', 'category-dominance', 'ops-ai-assistant', 'users']) {
  if (!uniqueNav.includes(id)) fail(`expected nav target ${id}`);
}

if (failed) process.exit(1);
console.log(`admin-panel-pages-audit OK (${uniqueNav.length} pages)`);
