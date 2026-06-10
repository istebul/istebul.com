import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  resolveAdminPanelAccess,
  verifyAdminSessionAccess
} = await import('../../js/admin/ai-listings-admin-access.js');

const {
  ADMIN_ENABLE_KEY,
  ADMIN_SECRET_KEY
} = await import('../../js/admin/ai-listings-admin-core.js');

const {
  ADMIN_LISTING_MANAGEMENT_HREF,
  injectAdminListingManagementNav
} = await import('../../js/admin/admin-decision-nav.js');

const {
  ADMIN_LOGIN_PATH,
  ADMIN_FORBIDDEN_PATH,
  PUBLIC_DECISION_CENTER_PATH,
  isAdminRoutePath,
  isAdminProfile
} = await import('../../js/admin/admin-route-guard.js');

test('resolveAdminPanelAccess requires admin session', () => {
  const storage = { getItem: () => null };
  assert.equal(resolveAdminPanelAccess(storage, { sessionIsAdmin: false }), 'disabled');
  assert.equal(resolveAdminPanelAccess(storage, { sessionIsAdmin: true }), 'ready');
  assert.equal(
    resolveAdminPanelAccess(
      { getItem: (key) => (key === ADMIN_SECRET_KEY ? 'secret' : null) },
      { sessionIsAdmin: true }
    ),
    'ready'
  );
});

test('localStorage alone cannot unlock admin listing UI without session', () => {
  const storage = {
    getItem: (key) => {
      if (key === ADMIN_ENABLE_KEY) return 'on';
      if (key === ADMIN_SECRET_KEY) return 'secret';
      return null;
    }
  };
  assert.equal(resolveAdminPanelAccess(storage, { sessionIsAdmin: false }), 'disabled');
});

test('verifyAdminSessionAccess returns boolean session flag', async () => {
  const result = await verifyAdminSessionAccess();
  assert.equal(typeof result.sessionIsAdmin, 'boolean');
});

test('admin listing management href targets AI listings panel (not CRM listings)', () => {
  assert.equal(ADMIN_LISTING_MANAGEMENT_HREF, '/admin/ai-listings/');
  assert.notEqual(ADMIN_LISTING_MANAGEMENT_HREF, '/admin/listings');
});

test('injectAdminListingManagementNav module defines admin-only nav contract', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'js/admin/admin-decision-nav.js'), 'utf8');
  assert.match(src, /nav-item--admin-only/);
  assert.match(src, /AI İlan Yönetimi/);
  assert.match(src, /ADMIN_LISTING_MANAGEMENT_HREF/);
  assert.match(src, /bindAdminExternalNavLinks/);
  assert.doesNotMatch(src, /DECISION_CENTER_HREF/);
});

test('admin-panel.html includes static AI İlan Yönetimi link', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'admin-panel.html'), 'utf8');
  assert.match(html, /href="\/admin\/ai-listings\/"/);
  assert.match(html, /data-admin-listing-nav-injected="ai-listings"/);
  assert.match(html, />AI İlan Yönetimi</);
  assert.match(html, /data-page-target="listings"/);
  assert.match(html, />Karar Seçenekleri</);
  assert.doesNotMatch(html, /data-page-target="decision-center"/);
});

test('Karar Seçenekleri and AI İlan Yönetimi titles distinguish classic CRM from AI engine', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'admin-panel.html'), 'utf8');
  const listingsNav = html.match(/data-page-target="listings"[^>]*title="([^"]+)"/);
  assert.ok(listingsNav, 'listings nav has title tooltip');
  assert.match(listingsNav[1], /AI İlan Yönetimi/);
  const aiNav = html.match(/href="\/admin\/ai-listings\/"[^>]*title="([^"]+)"/);
  assert.ok(aiNav, 'AI listings nav has title tooltip');
  assert.match(aiNav[1], /Karar Seçenekleri/);
});

test('public decision center routes redirect to profil', () => {
  const redirects = fs.readFileSync(path.join(process.cwd(), '_redirects'), 'utf8');
  assert.match(redirects, /\/karar-merkezi \/profil\/ 301/);
  assert.match(redirects, /\/decision-center \/profil\/ 301/);
  assert.doesNotMatch(redirects, /^\/admin\/karar-merkezi/m);
  assert.doesNotMatch(redirects, /^\/admin\/decision-center/m);
});

test('admin listing routes are static (no _redirects under /admin)', () => {
  const redirects = fs.readFileSync(path.join(process.cwd(), '_redirects'), 'utf8');
  assert.doesNotMatch(redirects, /^\/admin\//m);
  const buildScript = fs.readFileSync(path.join(process.cwd(), 'scripts/production-build.cjs'), 'utf8');
  assert.match(buildScript, /admin\/ai-listings\/index\.html/);
  assert.doesNotMatch(buildScript, /admin\/listings\/index\.html',\s*'admin\/ai-listings/);
});

test('admin route guard paths', () => {
  assert.equal(isAdminRoutePath('/admin/listings'), true);
  assert.equal(isAdminRoutePath('/admin/ai-listings.html'), true);
  assert.equal(isAdminRoutePath('/admin-panel.html'), true);
  assert.equal(isAdminRoutePath('/profil/'), false);
  assert.equal(isAdminProfile({ role: 'admin' }), true);
  assert.equal(isAdminProfile({ role: 'user' }), false);
  assert.equal(PUBLIC_DECISION_CENTER_PATH, '/profil/');
  assert.equal(ADMIN_LOGIN_PATH, '/admin-panel.html');
  assert.equal(ADMIN_FORBIDDEN_PATH, '/admin/forbidden.html');
});

test('admin-panel injects listing management nav after auth', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'js/admin-panel.js'), 'utf8');
  assert.match(src, /injectAdminListingManagementNav/);
  assert.match(src, /returnTo/);
});

test('ai-listings bootstrap enforces admin route guard', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'js/admin/ai-listings-admin.js'), 'utf8');
  assert.match(src, /enforceAdminRoute/);
  assert.match(src, /PUBLIC_DECISION_CENTER_PATH/);
});

test('forbidden page exists for 403 redirect', () => {
  assert.ok(fs.existsSync(path.join(process.cwd(), 'admin/forbidden.html')));
});
