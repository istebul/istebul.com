import type { ActionHandler } from './types.ts';

/**
 * PaymentAction — registered for future live payments.
 * P8-D intentionally does NOT charge or provision.
 */
export const PaymentAction: ActionHandler = {
  id: 'prepare_payment',
  family: 'payment',
  displayName: 'PaymentAction',

  async execute(request) {
    return {
      ok: true,
      status: 'skipped',
      actionId: 'prepare_payment',
      family: 'payment',
      message:
        'Ödeme Action katmanı hazır — canlı ödeme / provizyon P8-D kapsamında değil',
      reservationId: request.payload.reservationId,
      data: {
        livePayment: false,
        provisioned: false,
        payload: request.payload,
      },
    };
  },
};
