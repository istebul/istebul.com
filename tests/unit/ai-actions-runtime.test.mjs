/**
 * P8-D AI Action Engine — success / failure / rollback scenarios.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const actions = await import('../../src/ai-actions/index.ts');
const conciergeMod = await import('../../src/ai-concierge/index.ts');

describe('P8-D AI Action Engine runtime', () => {
  it('registers builtin actions across all families', () => {
    const engine = actions.createAIActionEngine({ restaurantId: 'demo-cafe' });
    const ids = engine.registry.listIds();
    assert.ok(ids.includes('create_reservation'));
    assert.ok(ids.includes('assign_table'));
    assert.ok(ids.includes('create_preorder'));
    assert.ok(ids.includes('apply_guarantee'));
    assert.ok(ids.includes('prepare_payment'));
    assert.ok(ids.includes('apply_campaign'));
    assert.ok(ids.includes('create_reservation_summary'));
    const families = engine.registry.listFamilies();
    for (const fam of actions.ACTION_FAMILIES) {
      assert.ok(families.includes(fam), `missing family ${fam}`);
    }
  });

  it('success: create reservation + assign table + summary', async () => {
    const engine = actions.createAIActionEngine({ restaurantId: 'demo-cafe' });
    // Use a free table/date — demo seed books t2 for "today" at 20:00
    const created = await engine.execute({
      actionId: 'create_reservation',
      payload: {
        restaurantId: 'demo-cafe',
        date: '2026-07-20',
        time: '20:00',
        partySize: 2,
        tableId: 't1',
        customerName: 'Ayşe',
      },
      conversationId: 'conv-success',
      enableRollback: true,
    });
    assert.equal(created.ok, true, created.message);
    assert.equal(created.status, 'ok');
    assert.ok(created.reservationId);
    assert.ok(created.auditId);

    const assigned = await engine.execute({
      actionId: 'assign_table',
      payload: {
        restaurantId: 'demo-cafe',
        reservationId: created.reservationId,
        tableId: 't3',
        date: '2026-07-20',
        partySize: 2,
      },
    });
    assert.equal(assigned.ok, true, assigned.message);

    const summary = await engine.execute({
      actionId: 'create_reservation_summary',
      payload: {
        restaurantId: 'demo-cafe',
        reservationId: created.reservationId,
      },
    });
    assert.equal(summary.ok, true);
    assert.match(String(summary.data?.summaryText || ''), /Rezervasyon|Tarih|Kişi/);

    const audits = await engine.audit.list({ conversationId: 'conv-success' });
    assert.ok(audits.length >= 1);
    assert.match(audits[0].decision.decisionType, /^action\./);
  });

  it('failure: occupied / unavailable table is rejected by Knowledge validation', async () => {
    // Demo seed marks t4 as occupied — assigning it must fail.
    const engine = actions.createAIActionEngine({ restaurantId: 'demo-cafe' });

    const created = await engine.execute({
      actionId: 'create_reservation',
      payload: {
        restaurantId: 'demo-cafe',
        date: '2026-07-16',
        time: '20:00',
        partySize: 2,
      },
    });
    assert.equal(created.ok, true);

    const failed = await engine.execute({
      actionId: 'assign_table',
      payload: {
        restaurantId: 'demo-cafe',
        reservationId: created.reservationId,
        tableId: 't4',
        date: '2026-07-16',
        partySize: 2,
      },
    });
    assert.equal(failed.ok, false);
    assert.equal(failed.status, 'rejected');
    assert.equal(failed.errorCode, 'TABLE_UNAVAILABLE');
    assert.ok(failed.validationErrors?.length);
    assert.ok(failed.auditId);
  });

  it('failure: missing required fields rejects create_reservation', async () => {
    const engine = actions.createAIActionEngine({ restaurantId: 'demo-cafe' });
    const failed = await engine.execute({
      actionId: 'create_reservation',
      payload: { restaurantId: 'demo-cafe' },
    });
    assert.equal(failed.ok, false);
    assert.equal(failed.errorCode, 'KNOWLEDGE_VALIDATION');
  });

  it('rollback: create_reservation can be compensated via cancel', async () => {
    const engine = actions.createAIActionEngine({ restaurantId: 'demo-cafe' });
    const created = await engine.execute({
      actionId: 'create_reservation',
      payload: {
        restaurantId: 'demo-cafe',
        date: '2026-07-21',
        time: '19:00',
        partySize: 4,
        tableId: 't2',
      },
    });
    assert.equal(created.ok, true, created.message);
    const compensation = created.data?.compensation;
    assert.ok(compensation);

    const rolled = await engine.rollback(compensation);
    assert.equal(rolled.ok, true);
    assert.equal(rolled.status, 'rolled_back');
    assert.equal(rolled.rolledBack, true);

    const after = await engine.reservations.get(created.reservationId);
    assert.equal(after?.status, 'cancelled');
  });

  it('rollback: table assignment restores previous table', async () => {
    const engine = actions.createAIActionEngine({ restaurantId: 'demo-cafe' });
    const created = await engine.execute({
      actionId: 'create_reservation',
      payload: {
        restaurantId: 'demo-cafe',
        date: '2026-07-22',
        time: '21:00',
        partySize: 2,
        tableId: 't1',
      },
    });
    assert.equal(created.ok, true, created.message);
    const changed = await engine.execute({
      actionId: 'change_table',
      payload: {
        restaurantId: 'demo-cafe',
        reservationId: created.reservationId,
        tableId: 't3',
        date: '2026-07-22',
        partySize: 2,
      },
    });
    assert.equal(changed.ok, true, changed.message);
    const rolled = await engine.rollback(changed.data.compensation);
    assert.equal(rolled.ok, true);
    assert.equal(rolled.rolledBack, true);
    const res = await engine.reservations.get(created.reservationId);
    assert.deepEqual(res?.tableIds, ['t1']);
  });

  it('payment action stays skipped (no live charge)', async () => {
    const engine = actions.createAIActionEngine({ restaurantId: 'demo-cafe' });
    const pay = await engine.execute({
      actionId: 'prepare_payment',
      payload: { restaurantId: 'demo-cafe', reservationId: 'x' },
    });
    assert.equal(pay.status, 'skipped');
    assert.equal(pay.data?.livePayment, false);
  });

  it('integrates with Concierge turn via executeFromTurn (P8-C unchanged)', async () => {
    const bot = conciergeMod.createAIConcierge({
      restaurantSlug: 'demo-cafe',
      provider: 'mock',
    });
    const turn = await bot.chat('Bugün için rezervasyon oluşturmak istiyorum');
    assert.equal(turn.remoteCallAttempted, false);

    const engine = actions.createAIActionEngine({ restaurantId: 'demo-cafe' });
    const result = await engine.executeFromTurn(turn, {
      restaurantId: 'demo-cafe',
      date: '2026-07-23',
      time: turn.memory.time || '20:00',
      partySize: turn.memory.partySize || 2,
      tableId: turn.memory.tableId || 't1',
    });
    assert.ok(result);
    assert.equal(result.actionId, 'create_reservation');
    assert.equal(result.ok, true, result?.message);
  });

  it('applies guarantee + preorder + campaign on reservation', async () => {
    const engine = actions.createAIActionEngine({ restaurantId: 'demo-cafe' });
    const created = await engine.execute({
      actionId: 'create_reservation',
      payload: {
        restaurantId: 'demo-cafe',
        date: '2026-07-24',
        time: '20:00',
        partySize: 2,
      },
    });
    assert.equal(created.ok, true, created.message);
    const pre = await engine.execute({
      actionId: 'create_preorder',
      payload: {
        restaurantId: 'demo-cafe',
        reservationId: created.reservationId,
        preorder: [{ name: 'Test Yemek', quantity: 1 }],
      },
    });
    assert.equal(pre.ok, true);

    const guarantee = await engine.execute({
      actionId: 'apply_guarantee',
      payload: {
        restaurantId: 'demo-cafe',
        reservationId: created.reservationId,
      },
    });
    assert.equal(guarantee.ok, true);
    assert.equal(guarantee.data?.provisioned, false);

    const campaign = await engine.execute({
      actionId: 'apply_campaign',
      payload: {
        restaurantId: 'demo-cafe',
        reservationId: created.reservationId,
      },
    });
    assert.equal(campaign.ok, true);
  });
});
