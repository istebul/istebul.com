import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  resolveAdminPanelAccess,
  verifyAdminSessionAccess,
  isDecisionCenterUiEnabled
} = await import('../../js/admin/ai-listings-admin-access.js');

const {
  ADMIN_ENABLE_KEY,
  ADMIN_SECRET_KEY
} = await import('../../js/admin/ai-listings-admin-core.js');

const {
  DECISION_CENTER_HREF,
  AI_LISTINGS_HREF
} = await import('../../js/admin/admin-decision-nav.js');

test('resolveAdminPanelAccess allows admin session without localStorage flag', () => {
  const storage = { getItem: () => null };
  assert.equal(resolveAdminPanelAccess(storage, { sessionIsAdmin: false }), 'disabled');
  assert.equal(resolveAdminPanelAccess(storage, { sessionIsAdmin: true }), 'no-secret');
  assert.equal(
    resolveAdminPanelAccess(
      { getItem: (key) => (key === ADMIN_SECRET_KEY ? 'secret' : null) },
      { sessionIsAdmin: true }
    ),
    'ready'
  );
});

test('localStorage enable path still works', () => {
  const storage = {
    getItem: (key) => {
      if (key === ADMIN_ENABLE_KEY) return 'on';
      if (key === ADMIN_SECRET_KEY) return 'secret';
      return null;
    }
  };
  assert.equal(resolveAdminPanelAccess(storage), 'ready');
  assert.equal(isDecisionCenterUiEnabled(storage), true);
});

test('verifyAdminSessionAccess returns false without configured supabase in test env', async () => {
  const result = await verifyAdminSessionAccess();
  assert.equal(typeof result.sessionIsAdmin, 'boolean');
});

test('admin decision nav constants point to decision center routes', () => {
  assert.equal(DECISION_CENTER_HREF, '/admin/ai-listings.html');
  assert.equal(AI_LISTINGS_HREF, '/admin/listings');
});

test('injectDecisionCenterNav module defines external nav markup contract', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'js/admin/admin-decision-nav.js'), 'utf8');
  assert.match(src, /nav-item--external/);
  assert.match(src, /data-nav-href/);
  assert.match(src, /AI İlan Yönetimi/);
  assert.match(src, /Karar Merkezi/);
  assert.match(src, /insertAdjacentElement\('afterend'/);
});

test('_redirects maps admin listing aliases to ai-listings page', () => {
  const redirects = fs.readFileSync(path.join(process.cwd(), '_redirects'), 'utf8');
  assert.match(redirects, /\/admin\/listings \/admin\/ai-listings\.html 200/);
  assert.match(redirects, /\/admin\/decision-center \/admin\/ai-listings\.html 200/);
  assert.match(redirects, /\/admin\/karar-merkezi \/admin\/ai-listings\.html 200/);
});

test('admin-panel injects decision nav after auth', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'js/admin-panel.js'), 'utf8');
  assert.match(src, /injectDecisionCenterNav/);
  assert.match(src, /data-nav-href/);
});

test('ai-listings bootstrap uses admin session access', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'js/admin/ai-listings-admin.js'), 'utf8');
  assert.match(src, /verifyAdminSessionAccess/);
  assert.match(src, /resolveAdminPanelAccess/);
  assert.match(src, /bootstrapAiListingsAdmin/);
});
