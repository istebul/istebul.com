import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('third-party-analytics', () => {
  it('module exports loadThirdPartyMeasurement', async () => {
    const mod = await import('../../js/core/third-party-analytics.js');
    assert.equal(typeof mod.loadThirdPartyMeasurement, 'function');
  });

  it('app.js delegates loadAnalytics to third-party module', () => {
    const app = fs.readFileSync(path.join(process.cwd(), 'js/app.js'), 'utf8');
    assert.match(app, /third-party-analytics\.js/);
    assert.match(app, /loadThirdPartyMeasurement/);
  });
});
