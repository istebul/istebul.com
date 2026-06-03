import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('third-party-analytics', () => {
  it('module exports loadThirdPartyMeasurement', async () => {
    const mod = await import('../../js/core/third-party-analytics.js');
    assert.equal(typeof mod.loadThirdPartyMeasurement, 'function');
  });

  it('analytics-consent-boot loads third-party measurement after consent', () => {
    const boot = fs.readFileSync(
      path.join(process.cwd(), 'js/runtime/analytics-consent-boot.js'),
      'utf8'
    );
    assert.match(boot, /third-party-analytics\.js/);
    assert.match(boot, /loadThirdPartyMeasurement/);
  });

  it('app.js wires analytics consent runtime', () => {
    const app = fs.readFileSync(path.join(process.cwd(), 'js/app.js'), 'utf8');
    assert.match(app, /analytics-consent-boot\.js/);
    assert.match(app, /bootAnalyticsMeasurement/);
  });

  it('loads Clarity when CLARITY_PROJECT_ID is set', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'js/core/third-party-analytics.js'),
      'utf8'
    );
    assert.match(src, /loadClarity/);
    assert.match(src, /CLARITY_PROJECT_ID/);
    assert.match(src, /www\.clarity\.ms/);
  });

  it('grants GA4 consent on accept when gtag already in head', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'js/core/third-party-analytics.js'),
      'utf8'
    );
    assert.match(src, /consent', 'update'/);
    assert.match(src, /analytics_storage: 'granted'/);
  });
});
