import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ga4ConsentHeadSnippet } from '../../scripts/lib/ga4-consent-head.cjs';

describe('ga4-consent-head', () => {
  it('injects external CSP-safe boot before async gtag loader', () => {
    const snippet = ga4ConsentHeadSnippet('G-TEST12345');
    assert.match(snippet, /googletagmanager\.com\/gtag\/js\?id=G-TEST12345/);
    assert.match(snippet, /ga4-consent-head-boot\.js/);
    assert.match(snippet, /data-measurement-id="G-TEST12345"/);
    assert.doesNotMatch(snippet, /<script>\s*window\.dataLayer/);
  });
});
