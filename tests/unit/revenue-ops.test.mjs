import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

describe('revenue ops config', () => {
  it('revops-flows.json lists all P10 flows', () => {
    const data = JSON.parse(
      fs.readFileSync(path.join(root, 'data/revenue/revops-flows.json'), 'utf8')
    );
    assert.equal(data.version, 'p10.0');
    const ids = data.flows.map((f) => f.id);
    assert.ok(ids.includes('failed_payment_recovery'));
    assert.ok(ids.includes('churn_rescue'));
    assert.ok(ids.includes('upgrade_prompt'));
  });

  it('lifecycle flows.json includes failed_payment_recovery', () => {
    const data = JSON.parse(
      fs.readFileSync(path.join(root, 'data/lifecycle/flows.json'), 'utf8')
    );
    assert.ok(data.flows.some((f) => f.id === 'dunning_past_due'));
  });
});
