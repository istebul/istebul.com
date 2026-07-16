/**
 * P8-E Payment Gateway — mock lifecycle + webhook parsing runtime.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const gateway = await import('../../src/payment-gateway/index.ts');

describe('P8-E Payment Gateway runtime', () => {
  it('lists strategy providers including Mock', () => {
    const providers = gateway.listPaymentGatewayProviders();
    const codes = providers.map((p) => p.code).sort();
    assert.deepEqual(codes, ['iyzico', 'mock', 'paytr', 'stripe']);
  });

  it('mock authorize → capture → release path', async () => {
    const svc = gateway.createPaymentGateway();
    svc.setConfig('demo-cafe', { activeProvider: 'mock', mode: 'test' });

    const auth = await svc.authorize({
      restaurantId: 'demo-cafe',
      amount: { amount: 250, currency: 'TRY' },
      reservationId: 'res_1',
    });
    assert.equal(auth.ok, true);
    assert.equal(auth.status, 'authorized');
    assert.equal(auth.remoteCallAttempted, false);
    assert.ok(auth.authorizationId);
    assert.ok(auth.providerTransactionId);

    const captured = await svc.capture(auth.authorizationId);
    assert.equal(captured.ok, true);
    assert.equal(captured.status, 'captured');

    // capture → refund (release only from authorized)
    const refunded = await svc.refund(auth.authorizationId, {
      amount: 250,
      currency: 'TRY',
    });
    assert.equal(refunded.ok, true);
    assert.equal(refunded.status, 'refunded');
  });

  it('mock authorize → release', async () => {
    const svc = gateway.createPaymentGateway();
    const auth = await svc.authorize({
      restaurantId: 'demo-cafe',
      amount: { amount: 100, currency: 'TRY' },
    });
    assert.equal(auth.ok, true);
    const released = await svc.release(auth.authorizationId);
    assert.equal(released.ok, true);
    assert.equal(released.status, 'released');
  });

  it('mock refund after capture', async () => {
    const svc = gateway.createPaymentGateway();
    const auth = await svc.authorize({
      restaurantId: 'demo-cafe',
      amount: { amount: 80, currency: 'TRY' },
    });
    await svc.capture(auth.authorizationId);
    const refunded = await svc.refund(auth.authorizationId, {
      amount: 80,
      currency: 'TRY',
    }, 'test');
    assert.equal(refunded.ok, true);
    assert.equal(refunded.status, 'refunded');
  });

  it('calculates guarantee rules (fixed / per_guest / weekend / special_day)', () => {
    const weekday = gateway.calculateGuaranteeQuote(
      [
        { kind: 'fixed', fixedAmount: 200 },
        { kind: 'per_guest', perGuestAmount: 150 },
      ],
      { partySize: 3, reservationDate: '2026-07-15' }, // Wednesday
    );
    assert.equal(weekday.required, true);
    assert.equal(weekday.amount, 450);

    const weekend = gateway.calculateGuaranteeQuote(
      [{ kind: 'weekend', weekendAmount: 500 }],
      { partySize: 2, reservationDate: '2026-07-18' }, // Saturday
    );
    assert.equal(weekend.amount, 500);
    assert.ok(weekend.appliedRules.includes('weekend'));

    const special = gateway.calculateGuaranteeQuote(
      [
        {
          kind: 'special_day',
          specialDayAmount: 750,
          specialDayDates: ['2026-12-31'],
        },
      ],
      { partySize: 2, reservationDate: '2026-12-31' },
    );
    assert.equal(special.amount, 750);
  });

  it('check-in hold then bill close settlement', async () => {
    const svc = gateway.createPaymentGateway();
    const auth = await svc.authorize({
      restaurantId: 'demo-cafe',
      amount: { amount: 300, currency: 'TRY' },
    });
    const hold = svc.onCheckIn(auth.authorizationId);
    assert.ok(hold);
    assert.equal(hold.phase, 'checkin_hold');
    assert.equal(hold.guaranteeOffset, 300);

    const closed = svc.onBillClose(auth.authorizationId, 500);
    assert.ok(closed);
    assert.equal(closed.phase, 'bill_closed');
    assert.equal(closed.guaranteeOffset, 300);
    assert.equal(closed.remainingCollection, 200);
    assert.equal(closed.refund, 0);
  });

  it('parses provider webhooks without remote calls', () => {
    const svc = gateway.createPaymentGateway();
    const stripe = svc.parseWebhook('demo-cafe', {
      provider: 'stripe',
      eventType: 'payment_intent.succeeded',
      eventId: 'evt_1',
      payload: { data: { object: { id: 'pi_123' } } },
      receivedAt: new Date().toISOString(),
    });
    assert.equal(stripe.ok, true);
    assert.equal(stripe.mappedStatus, 'captured');
    assert.equal(stripe.remoteCallAttempted, false);

    const iyzico = svc.parseWebhook('demo-cafe', {
      provider: 'iyzico',
      eventType: 'AUTHORIZED',
      eventId: 'iy_1',
      payload: { status: 'AUTHORIZED', paymentId: 'pay_9' },
      receivedAt: new Date().toISOString(),
    });
    assert.equal(iyzico.ok, true);
    assert.equal(iyzico.mappedStatus, 'authorized');

    const paytr = svc.parseWebhook('demo-cafe', {
      provider: 'paytr',
      eventType: 'success',
      eventId: 'pt_1',
      payload: { status: 'success', merchant_oid: 'oid_1' },
      receivedAt: new Date().toISOString(),
    });
    assert.equal(paytr.ok, true);
    assert.equal(paytr.mappedStatus, 'captured');
  });

  it('ConciergePaymentBridge appends conversation result via Action Engine', async () => {
    const bridge = gateway.createConciergePaymentBridge({
      restaurantId: 'demo-cafe',
      defaultProvider: 'mock',
    });
    const engine = bridge.actions;
    const created = await engine.execute({
      actionId: 'create_reservation',
      payload: {
        restaurantId: 'demo-cafe',
        date: '2026-07-20',
        time: '20:00',
        partySize: 2,
        customerName: 'Test',
      },
    });
    assert.equal(created.ok, true);

    const flow = await bridge.runFromTurn(
      {
        intent: { id: 'create_reservation', slots: {}, raw: 'rezervasyon' },
        memory: {
          restaurantId: 'demo-cafe',
          date: '2026-07-20',
          time: '20:00',
          partySize: 2,
        },
        assistantMessage: { content: 'Rezervasyon hazır' },
        conversationId: 'c1',
      },
      { reservationId: created.reservationId },
    );

    assert.equal(flow.guaranteeRequired, true);
    assert.ok(flow.authorization);
    assert.equal(flow.authorization.status, 'authorized');
    assert.match(flow.conversationMessage, /Provizyon|garanti|authorize/i);
  });
});
