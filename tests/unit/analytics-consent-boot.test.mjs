import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('analytics-consent-boot', () => {
  it('exports shared boot helpers', async () => {
    const src = fs.readFileSync(
      path.join(root, 'js/runtime/analytics-consent-boot.js'),
      'utf8'
    );
    assert.match(src, /export async function bootAnalyticsMeasurement/);
    assert.match(src, /export function acceptAnalyticsConsent/);
    assert.match(src, /ensureVerticalCookieBanner/);
    assert.match(src, /measurementBooted/);
  });

  it('static-cookie-consent delegates to boot module', () => {
    const src = fs.readFileSync(
      path.join(root, 'js/runtime/static-cookie-consent.js'),
      'utf8'
    );
    assert.match(src, /analytics-consent-boot\.js/);
    assert.match(src, /bootAnalyticsMeasurement/);
    assert.doesNotMatch(src, /writeConsent\('accepted'\)/);
  });

  it('vertical-locale-shell initializes consent runtime', () => {
    const src = fs.readFileSync(
      path.join(root, 'js/runtime/vertical-locale-shell.js'),
      'utf8'
    );
    assert.match(src, /initAnalyticsConsentRuntime/);
  });

  it('public env defaults include Plausible domain', () => {
    const defaults = JSON.parse(
      fs.readFileSync(path.join(root, 'config/public-env.defaults.json'), 'utf8')
    );
    assert.equal(defaults.PLAUSIBLE_DOMAIN, 'istebul.com');
  });
});
