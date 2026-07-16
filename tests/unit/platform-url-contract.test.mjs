/**
 * EPIC-003 — Platform URL contract + CTA helper.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAiLandingHashHref,
  getPlatformProductEntryUrl,
  isLegacyAiHomeHash,
  isPlatformProductEntryPath,
  normalizePlatformProductEntryPath,
  resolveLegacyAiHomeRedirect
} from '../../js/runtime/platform-url-contract.js';
import {
  normalizePlatformCtaHref,
  resolvePlatformProductCtaHref
} from '../../js/runtime/platform-cta.js';

test('active product entry URLs match Platform Cutover target map', () => {
  assert.equal(getPlatformProductEntryUrl('istebul-ai'), '/ai/');
  assert.equal(getPlatformProductEntryUrl('garsonai'), '/garson/');
  assert.equal(getPlatformProductEntryUrl('business'), '/business/');
  assert.equal(resolvePlatformProductCtaHref('istebul-ai'), '/ai/');
  assert.equal(resolvePlatformProductCtaHref('istebul-ai', { hashId: 'pricing' }), '/ai/#pricing');
});

test('product entry paths escape SPA shell', () => {
  assert.equal(isPlatformProductEntryPath('/ai/'), true);
  assert.equal(isPlatformProductEntryPath('/ai'), true);
  assert.equal(isPlatformProductEntryPath('/garson/demo/'), true);
  assert.equal(isPlatformProductEntryPath('/business/'), true);
  assert.equal(isPlatformProductEntryPath('/'), false);
  assert.equal(isPlatformProductEntryPath('/karar-asistani/'), false);
  assert.equal(normalizePlatformProductEntryPath('/ai'), '/ai/');
  assert.equal(normalizePlatformProductEntryPath('/garson/demo'), '/garson/demo/');
});

test('legacy AI home hashes redirect from Platform root to /ai/', () => {
  assert.equal(isLegacyAiHomeHash('pricing'), true);
  assert.equal(isLegacyAiHomeHash('landing-faq'), true);
  assert.equal(isLegacyAiHomeHash('home-vertical-focus'), true);
  assert.equal(isLegacyAiHomeHash('platform-landing'), false);
  assert.equal(resolveLegacyAiHomeRedirect('pricing'), '/ai/#pricing');
  assert.equal(resolveLegacyAiHomeRedirect('landing-faq'), '/ai/#landing-faq');
  assert.equal(buildAiLandingHashHref('how-it-works'), '/ai/#how-it-works');
  assert.equal(normalizePlatformCtaHref('/#pricing'), '/ai/#pricing');
  assert.equal(normalizePlatformCtaHref('/#landing-faq'), '/ai/#landing-faq');
  assert.equal(normalizePlatformCtaHref('/#platform-products'), '/#platform-products');
  assert.equal(normalizePlatformCtaHref('/ai/#pricing'), '/ai/#pricing');
});
