import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('cookie consent desktop visibility', () => {
  it('shows fixed overlay on all viewports when not hidden', () => {
    const css = fs.readFileSync(path.join(root, 'css/mobile-perfection.css'), 'utf8');
    assert.match(css, /#cookie-consent:not\(\[hidden\]\)/);
    assert.match(css, /position:\s*fixed/);
    assert.match(css, /@media \(min-width: 769px\)/);
  });

  it('setupCookieConsent defers banner reveal until after LCP when no preference', () => {
    const src = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
    assert.match(src, /scheduleCookieConsentReveal\(showBanner\)/);
    assert.match(src, /cookie-consent-pending/);
    assert.match(src, /banner\.hidden = false/);
    assert.match(src, /aria-hidden/);
  });
});
