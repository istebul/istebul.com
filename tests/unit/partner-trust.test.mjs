import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PARTNER_TRUST_PILLARS,
  PARTNER_TRUST_DISCLAIMER,
  renderTrustCenterHtml,
  renderTrustSummaryGrid
} from '../../js/features/partner/partner-trust.js';

test('PARTNER_TRUST_PILLARS covers required enterprise topics', () => {
  const ids = PARTNER_TRUST_PILLARS.map((p) => p.id);
  assert.ok(ids.includes('security'));
  assert.ok(ids.includes('kvkk'));
  assert.ok(ids.includes('reliability'));
  assert.ok(ids.includes('support'));
});

test('disclaimer does not claim SOC2 certification', () => {
  assert.match(PARTNER_TRUST_DISCLAIMER, /SOC 2/);
  assert.match(PARTNER_TRUST_DISCLAIMER, /sunmaz/);
});

test('each pillar has transparency notClaimed line', () => {
  for (const pillar of PARTNER_TRUST_PILLARS) {
    assert.ok(pillar.notClaimed.length > 10);
  }
});

test('renderTrustCenterHtml includes all pillar headings', () => {
  const html = renderTrustCenterHtml();
  assert.match(html, /Webhook güvenilirliği/);
  assert.match(html, /Şeffaflık/);
});

test('renderTrustSummaryGrid links to trust center', () => {
  const html = renderTrustSummaryGrid();
  assert.match(html, /partner-guven\.html/);
});
