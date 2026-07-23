import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  getDrawerHostId,
  getDrawerBodyClass
} = await import('../../js/admin/ai-listings-admin-drawer-state.js');

const adminJsPath = path.join(process.cwd(), 'js/admin/ai-listings-admin.js');

function readAdminSource() {
  return fs.readFileSync(adminJsPath, 'utf8');
}

function negotiationAdminBlock(src) {
  const start = src.indexOf('function buildNegotiationInputFromListing');
  const end = src.indexOf('function bindNegotiationPanelClose', start);
  assert.ok(start >= 0, 'buildNegotiationInputFromListing block missing');
  assert.ok(end > start, 'bindNegotiationPanelClose block missing');
  return src.slice(start, end + 800);
}

test('drawer state negotiation host is dedicated', () => {
  assert.equal(getDrawerHostId('negotiation'), 'ai-neg-panel-host');
});

test('drawer state negotiation body class is dedicated', () => {
  assert.equal(getDrawerBodyClass('negotiation'), 'ai-listings-admin--neg-open');
});

test('drawer state purchase host unchanged', () => {
  assert.equal(getDrawerHostId('purchase'), 'ai-pd-panel-host');
});

test('drawer state purchase body class unchanged', () => {
  assert.equal(getDrawerBodyClass('purchase'), 'ai-listings-admin--pd-open');
});

test('renderActiveAiListingsDrawer routes negotiation to openNegotiationPanel', () => {
  const src = readAdminSource();
  assert.match(src, /type === 'negotiation'/);
  assert.match(src, /openNegotiationPanel\(root, listingId/);
  const negotiationBranch = src.match(
    /} else if \(type === 'negotiation'\) \{[\s\S]*?\} else if \(type === 'explain'/
  );
  assert.ok(negotiationBranch, 'negotiation branch not found');
  assert.doesNotMatch(negotiationBranch[0], /openPurchaseDecisionPanel/);
});

test('renderActiveAiListingsDrawer purchase branch keeps openPurchaseDecisionPanel', () => {
  const src = readAdminSource();
  const purchaseBranch = src.match(
    /if \(type === 'purchase'\) \{[\s\S]*?\} else if \(type === 'negotiation'\)/
  );
  assert.ok(purchaseBranch, 'purchase branch not found');
  assert.match(purchaseBranch[0], /openPurchaseDecisionPanel\(root, listingId/);
});

test('mountGlobalPanelHosts includes negotiation shell and host id', () => {
  const src = readAdminSource();
  assert.match(src, /buildNegotiationShellHtml/);
  assert.match(src, /ai-neg-panel-host/);
  const mountBlock = src.match(/function mountGlobalPanelHosts\(\) \{[\s\S]*?\n\}/);
  assert.ok(mountBlock, 'mountGlobalPanelHosts not found');
  assert.match(mountBlock[0], /buildNegotiationShellHtml\(\)/);
});

test('negotiation panel open close helpers are defined', () => {
  const src = readAdminSource();
  assert.match(src, /function openNegotiationPanel\(/);
  assert.match(src, /function closeNegotiationPanel\(/);
  assert.match(src, /function bindNegotiationPanelClose\(/);
  assert.match(src, /closeNegotiationPanel\(root\)/);
});

test('publish guard symbols remain unchanged in admin.js', () => {
  const src = readAdminSource();
  assert.match(src, /resolvePublishAttempt/);
  assert.match(src, /buildPublishConfirmFormHtml/);
  assert.match(src, /data-qa-action/);
  assert.match(src, /action === 'publish'/);
});

test('publish checklist helper still available in admin core', async () => {
  const core = await import('../../js/admin/ai-listings-admin-core.js');
  assert.equal(typeof core.isPublishChecklistComplete, 'function');
});

test('negotiation admin block has no network or env usage', () => {
  const src = readAdminSource();
  const block = negotiationAdminBlock(src);
  assert.doesNotMatch(block, /\bfetch\s*\(/);
  assert.doesNotMatch(block, /process\.env/);
  assert.doesNotMatch(block, /SUPABASE_/);
  assert.doesNotMatch(block, /AI_LISTINGS_EDGE_SECRET/);
});
