import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ga4ConsentHeadSnippet } from '../../scripts/lib/ga4-consent-head.cjs';

describe('ga4-consent-head', () => {
  it('injects consent update from localStorage before gtag config', () => {
    const snippet = ga4ConsentHeadSnippet('G-TEST12345');
    assert.match(snippet, /istebul_cookie_consent/);
    assert.match(snippet, /istebu_cookie_consent/);
    assert.match(snippet, /console\.info\('\[Consent\]'/);
    assert.match(snippet, /gtag\('consent','update'/);
    assert.match(snippet, /analytics_storage:'granted'/);
    assert.match(snippet, /ad_storage:'granted'/);
    assert.match(snippet, /console\.info\('\[GA4 Consent State Updated\]'\)/);
    assert.match(snippet, /gtag\('config','G-TEST12345'/);

    const updateIndex = snippet.indexOf("gtag('consent','update'");
    const configIndex = snippet.indexOf("gtag('config','G-TEST12345'");
    assert.ok(updateIndex > -1 && configIndex > updateIndex, 'consent update must precede config');
  });
});
