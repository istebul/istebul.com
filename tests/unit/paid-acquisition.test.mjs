import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolvePaidPlatform,
  buildPaidCampaignUrl,
  PAID_PLATFORMS,
  PAID_FUNNEL_MAP
} from '../../js/features/growth/paid-acquisition.js';

describe('paid-acquisition P5.1', () => {
  it('resolvePaidPlatform detects google, meta, tiktok, youtube, retargeting', () => {
    assert.equal(resolvePaidPlatform({ gclid: 'x' }), PAID_PLATFORMS.GOOGLE_SEARCH);
    assert.equal(resolvePaidPlatform({ fbclid: 'x' }), PAID_PLATFORMS.META);
    assert.equal(resolvePaidPlatform({ ttclid: 'x' }), PAID_PLATFORMS.TIKTOK);
    assert.equal(resolvePaidPlatform({ utm_source: 'youtube', utm_medium: 'video' }), PAID_PLATFORMS.YOUTUBE);
    assert.equal(resolvePaidPlatform({ utm_source: 'retargeting', utm_medium: 'display' }), PAID_PLATFORMS.RETARGETING);
  });

  it('buildPaidCampaignUrl includes paid_platform and utm', () => {
    const url = buildPaidCampaignUrl('meta', { campaign: 'test_campaign' });
    assert.ok(url.includes('paid_platform=meta'));
    assert.ok(url.includes('utm_source=meta'));
    assert.ok(url.includes('utm_campaign=test_campaign'));
  });

  it('paid-channels.json lists five platforms', () => {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'data/growth/paid-channels.json'),
      'utf8'
    );
    const data = JSON.parse(raw);
    const ids = data.platforms.map((p) => p.id);
    assert.deepEqual(
      ids.sort(),
      ['google_search', 'meta', 'retargeting', 'tiktok', 'youtube'].sort()
    );
  });

  it('PAID_FUNNEL_MAP includes lead_submit and paid_conversion', () => {
    assert.ok(PAID_FUNNEL_MAP.lead_submit);
    assert.ok(PAID_FUNNEL_MAP.paid_conversion);
  });
});
