import test from 'node:test';
import assert from 'node:assert/strict';

const {
  AI_LISTINGS_PUBLIC_SETTING_KEY,
  parseBool,
  fetchAiListingsSettings,
  getAiListingsSettingsFromBootstrap
} = await import('../../js/runtime/ai-listings-integrations.js');
const { mapLegacyListingToAiPayload } = await import('../../js/core/ai-listings-bridge.js');

test('AI listings public setting key matches site_settings pattern', () => {
  assert.equal(AI_LISTINGS_PUBLIC_SETTING_KEY, 'ai_listings_public_enabled');
});

test('parseBool accepts site_settings truthy values', () => {
  assert.equal(parseBool('true'), true);
  assert.equal(parseBool('on'), true);
  assert.equal(parseBool('false'), false);
});

test('fetchAiListingsSettings returns disabled when env missing', async () => {
  const original = global.window;
  global.window = { __env: {} };
  const settings = await fetchAiListingsSettings();
  assert.equal(settings.aiListingsPublicEnabled, false);
  global.window = original;
});

test('mapLegacyListingToAiPayload uses user_listing source type', () => {
  const payload = mapLegacyListingToAiPayload({
    user_id: 'user-1',
    title: 'Test',
    category: 'vehicle',
    price: 100000,
    currency: 'TRY'
  });
  assert.equal(payload.source_type, 'user_listing');
  assert.equal(payload.status, 'draft');
  assert.equal(payload.owner_user_id, 'user-1');
});

test('AI listings bootstrap distinguishes a loaded false setting from an unavailable setting', () => {
  const originalWindow = globalThis.window;

  try {
    globalThis.window = {};
    assert.equal(getAiListingsSettingsFromBootstrap(), null);

    globalThis.window.__ibAiListings = {
      aiListingsPublicEnabled: false,
      loaded: true
    };
    assert.deepEqual(getAiListingsSettingsFromBootstrap(), {
      aiListingsPublicEnabled: false
    });

    globalThis.window.__ibAiListings.loaded = false;
    assert.equal(getAiListingsSettingsFromBootstrap(), null);
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }
});
