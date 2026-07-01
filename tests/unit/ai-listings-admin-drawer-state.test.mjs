import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  DRAWER_TYPES,
  DRAWER_TITLES_TR,
  MODULE_UNAVAILABLE_TR,
  createInitialDrawerState,
  isValidDrawerType,
  getDrawerTitleTr,
  getModuleUnavailableMessageTr,
  getDrawerHostId,
  getDrawerBodyClass,
  buildCompareSelectionKey,
  openDrawerState,
  closeDrawerState,
  resetDrawerState,
  isDrawerOpen,
  getActiveDrawerBodyClasses
} = await import('../../js/admin/ai-listings-admin-drawer-state.js');

const adminJsPath = path.join(process.cwd(), 'js/admin/ai-listings-admin.js');

test('DRAWER_TYPES includes all 7 drawer types', () => {
  assert.equal(DRAWER_TYPES.length, 7);
  assert.ok(DRAWER_TYPES.includes('quality'));
  assert.ok(DRAWER_TYPES.includes('negotiation'));
  assert.ok(DRAWER_TYPES.includes('purchase'));
  assert.ok(DRAWER_TYPES.includes('explain'));
  assert.ok(DRAWER_TYPES.includes('report'));
  assert.ok(DRAWER_TYPES.includes('compare'));
  assert.ok(DRAWER_TYPES.includes('scenario'));
});

test('drawer title quality is Turkish', () => {
  assert.equal(getDrawerTitleTr('quality'), 'Kalite ve Güven');
});

test('drawer title negotiation is Turkish', () => {
  assert.equal(getDrawerTitleTr('negotiation'), 'Pazarlık Analizi');
});

test('drawer title purchase is Turkish', () => {
  assert.equal(getDrawerTitleTr('purchase'), 'Al Kararı Analizi');
});

test('drawer title explain is Turkish', () => {
  assert.equal(getDrawerTitleTr('explain'), 'Karar Açıklaması');
});

test('drawer title report is Turkish', () => {
  assert.equal(getDrawerTitleTr('report'), 'Yönetici Karar Raporu');
});

test('drawer title compare is Turkish', () => {
  assert.equal(getDrawerTitleTr('compare'), 'Karşılaştırma Analizi');
});

test('drawer title scenario is Turkish', () => {
  assert.equal(getDrawerTitleTr('scenario'), 'Senaryo Simülasyonu');
});

test('DRAWER_TITLES_TR all values Turkish', () => {
  for (const title of Object.values(DRAWER_TITLES_TR)) {
    assert.ok(!/Executive|Compare|unavailable/i.test(title));
  }
});

test('module unavailable negotiation Turkish', () => {
  assert.match(getModuleUnavailableMessageTr('negotiation'), /Pazarlık analizi/);
});

test('module unavailable purchase Turkish', () => {
  assert.match(getModuleUnavailableMessageTr('purchase'), /Al kararı/);
});

test('module unavailable explain Turkish', () => {
  assert.match(getModuleUnavailableMessageTr('explain'), /Karar açıklaması/);
});

test('module unavailable report Turkish', () => {
  assert.match(getModuleUnavailableMessageTr('report'), /Yönetici raporu/);
});

test('module unavailable compare Turkish', () => {
  assert.match(getModuleUnavailableMessageTr('compare'), /Karşılaştırma/);
});

test('module unavailable scenario Turkish', () => {
  assert.match(getModuleUnavailableMessageTr('scenario'), /Senaryo/);
});

test('createInitialDrawerState has null active type', () => {
  const state = createInitialDrawerState();
  assert.equal(state.activeDrawerType, null);
});

test('open drawer sets context', () => {
  const state = openDrawerState(createInitialDrawerState(), 'purchase', {
    listingId: 'a',
    recommendationId: 'b'
  });
  assert.equal(state.activeDrawerType, 'purchase');
  assert.equal(state.activeDrawerListingId, 'a');
  assert.equal(state.activeDrawerRecommendationId, 'b');
});

test('open drawer closes previous by replacing type', () => {
  let state = openDrawerState(createInitialDrawerState(), 'purchase', { listingId: '1' });
  state = openDrawerState(state, 'explain', { listingId: '2' });
  assert.equal(state.activeDrawerType, 'explain');
  assert.equal(state.activeDrawerListingId, '2');
});

test('close drawer clears active type', () => {
  const open = openDrawerState(createInitialDrawerState(), 'report', {});
  const closed = closeDrawerState(open);
  assert.equal(closed.activeDrawerType, null);
});

test('reset drawer state returns initial', () => {
  const reset = resetDrawerState();
  assert.equal(reset.activeDrawerType, null);
  assert.equal(reset.scenarioKey, 'price_minus_5');
});

test('isDrawerOpen false initially', () => {
  assert.equal(isDrawerOpen(createInitialDrawerState()), false);
});

test('isDrawerOpen true when type set', () => {
  assert.equal(isDrawerOpen(openDrawerState(createInitialDrawerState(), 'scenario', {})), true);
});

test('isValidDrawerType rejects invalid', () => {
  assert.equal(isValidDrawerType('invalid'), false);
  assert.equal(isValidDrawerType('purchase'), true);
});

test('buildCompareSelectionKey sorts ids', () => {
  assert.equal(buildCompareSelectionKey(['b', 'a']), 'a|b');
});

test('getDrawerHostId for purchase', () => {
  assert.equal(getDrawerHostId('purchase'), 'ai-pd-panel-host');
});

test('getDrawerHostId for negotiation', () => {
  assert.equal(getDrawerHostId('negotiation'), 'ai-neg-panel-host');
});

test('getDrawerBodyClass for negotiation', () => {
  assert.equal(getDrawerBodyClass('negotiation'), 'ai-listings-admin--neg-open');
});

test('getDrawerBodyClass for purchase', () => {
  assert.equal(getDrawerBodyClass('purchase'), 'ai-listings-admin--pd-open');
});

test('getDrawerHostId for scenario', () => {
  assert.equal(getDrawerHostId('scenario'), 'ai-ss-panel-host');
});

test('getDrawerBodyClass for compare', () => {
  assert.equal(getDrawerBodyClass('compare'), 'ai-listings-admin--cmp-open');
});

test('getActiveDrawerBodyClasses returns unique classes', () => {
  const classes = getActiveDrawerBodyClasses();
  assert.ok(classes.length >= 5);
  assert.equal(classes.length, new Set(classes).size);
});

test('open drawer preserves scenario key', () => {
  const state = openDrawerState(createInitialDrawerState(), 'scenario', { scenarioKey: 'price_minus_10' });
  assert.equal(state.scenarioKey, 'price_minus_10');
});

test('admin.js imports drawer state module', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /ai-listings-admin-drawer-state/);
  assert.match(src, /openAiListingsDrawer/);
  assert.match(src, /closeAiListingsDrawer/);
});

test('admin.js ESC closes AI drawer when open', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /isDrawerOpen\(aiDrawerState\)/);
  assert.match(src, /closeAiListingsDrawer/);
});

test('admin.js defines renderActiveAiListingsDrawer', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /function renderActiveAiListingsDrawer/);
});

test('admin.js defines resetAiListingsDrawerState', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /function resetAiListingsDrawerState/);
});

test('MODULE_UNAVAILABLE_TR has no raw English unavailable', () => {
  for (const msg of Object.values(MODULE_UNAVAILABLE_TR)) {
    assert.ok(!/\bunavailable\b/i.test(msg));
  }
});

test('open drawer with compare selection key', () => {
  const state = openDrawerState(createInitialDrawerState(), 'compare', {
    compareSelectionKey: 'id1|id2'
  });
  assert.equal(state.activeDrawerCompareSelectionKey, 'id1|id2');
});

test('invalid drawer type leaves state unchanged type', () => {
  const initial = createInitialDrawerState();
  const next = openDrawerState(initial, 'not-a-drawer', {});
  assert.equal(next.activeDrawerType, null);
});
