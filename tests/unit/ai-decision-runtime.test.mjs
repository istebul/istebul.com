/**
 * P8-F AI Decision Engine — runtime decisions (mock).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const decision = await import('../../src/ai-decision/index.ts');

describe('P8-F AI Decision Engine runtime', () => {
  it('exports decision kinds and createAIDecisionEngine', () => {
    assert.ok(decision.DECISION_KINDS.includes('suggest_table'));
    assert.ok(decision.DECISION_KINDS.includes('analyze_kitchen_load'));
    assert.equal(typeof decision.createAIDecisionEngine, 'function');
  });

  it('suggests tables for party size', async () => {
    const brain = decision.createAIDecisionEngine({ restaurantId: 'demo-cafe' });
    const result = await brain.decide({
      kind: 'suggest_table',
      restaurantId: 'demo-cafe',
      partySize: 2,
      quietPreferred: true,
    });
    assert.equal(result.ok, true);
    assert.equal(result.remoteCallAttempted, false);
    assert.equal(result.provider, 'mock');
    assert.ok(result.recommendations.length >= 1);
    assert.ok(result.actionHints?.includes('assign_table'));
    assert.ok(result.auditId);
  });

  it('suggests reservation slots', async () => {
    const brain = decision.createAIDecisionEngine({ restaurantId: 'demo-cafe' });
    const result = await brain.decide({
      kind: 'suggest_reservation',
      restaurantId: 'demo-cafe',
      date: '2026-07-20',
      time: '20:00',
      partySize: 4,
    });
    assert.equal(result.ok, true);
    assert.ok(result.recommendations.some((r) => String(r.label).includes('20:00')));
  });

  it('suggests menu and campaign', async () => {
    const brain = decision.createAIDecisionEngine({ restaurantId: 'demo-cafe' });
    const menu = await brain.decide({
      kind: 'suggest_menu',
      restaurantId: 'demo-cafe',
      partySize: 2,
    });
    assert.equal(menu.ok, true);

    const campaign = await brain.decide({
      kind: 'suggest_campaign',
      restaurantId: 'demo-cafe',
    });
    assert.equal(campaign.ok, true);
    assert.ok(campaign.actionHints?.includes('apply_campaign'));
  });

  it('suggests guarantee amount', async () => {
    const brain = decision.createAIDecisionEngine({ restaurantId: 'demo-cafe' });
    const result = await brain.decide({
      kind: 'suggest_guarantee',
      restaurantId: 'demo-cafe',
      partySize: 3,
      date: '2026-07-18',
      estimatedBill: 1200,
    });
    assert.equal(result.ok, true);
    assert.ok(result.guarantee);
    assert.equal(result.guarantee.required, true);
    assert.ok(result.guarantee.amount > 0);
    assert.ok(result.actionHints?.includes('apply_guarantee'));
  });

  it('predicts density, wait time, kitchen load', async () => {
    const brain = decision.createAIDecisionEngine({ restaurantId: 'demo-cafe' });
    for (const kind of ['predict_density', 'predict_wait_time', 'analyze_kitchen_load']) {
      const result = await brain.decide({
        kind,
        restaurantId: 'demo-cafe',
        date: '2026-07-18',
        time: '20:00',
      });
      assert.equal(result.ok, true, kind);
      assert.ok(result.predictions);
      assert.ok(typeof result.predictions.densityPct === 'number');
      assert.ok(typeof result.predictions.waitMinutes === 'number');
      assert.ok(typeof result.predictions.kitchenLoadPct === 'number');
    }
  });

  it('decideFromConciergeTurn maps intent via adapter', async () => {
    const brain = decision.createAIDecisionEngine({ restaurantId: 'demo-cafe' });
    const result = await brain.decideFromConciergeTurn({
      intent: { id: 'suggest_table', slots: { partySize: 2 }, raw: 'masa öner' },
      memory: {
        restaurantId: 'demo-cafe',
        partySize: 2,
        date: '2026-07-20',
        time: '19:30',
      },
      conversationId: 'c-test',
    });
    assert.equal(result.kind, 'suggest_table');
    assert.equal(result.ok, true);
    assert.equal(result.remoteCallAttempted, false);
  });
});
