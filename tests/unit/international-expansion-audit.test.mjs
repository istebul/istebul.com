import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInternationalExpansionSnapshot } from '../../js/features/ops/international-expansion-audit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../../data/ops/international-expansion-audit.json');

describe('international-expansion-audit', () => {
  it('builds snapshot with 10 dimensions and wave 1 markets', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const snapshot = buildInternationalExpansionSnapshot({ config });
    assert.equal(snapshot.version, 'p22.0');
    assert.equal(snapshot.dimensions.length, 10);
    assert.ok(snapshot.globalReadinessPct > 0);
    assert.equal(snapshot.wave1Markets[0].country, 'Germany');
    assert.ok(snapshot.executiveSummary.length >= 3);
  });
});
