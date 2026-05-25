import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAcquisitionExitSnapshot } from '../../js/features/ops/acquisition-exit-optionality.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../data/ops/acquisition-exit-optionality.json');

describe('acquisition-exit-optionality', () => {
  it('builds snapshot with three scenarios and buyers', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const snapshot = buildAcquisitionExitSnapshot({ config });
    assert.equal(snapshot.version, 'p11-exit.0');
    assert.ok(snapshot.scenarios.bootstrap);
    assert.ok(snapshot.scenarios.seed);
    assert.ok(snapshot.scenarios.strategicAcquisition);
    assert.ok(snapshot.strategicBuyers.length >= 5);
    assert.ok(snapshot.executiveSummary.length >= 4);
  });
});
