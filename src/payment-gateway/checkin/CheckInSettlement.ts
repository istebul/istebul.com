import type { PaymentAuthorization, SettlementRecord } from '../types.ts';

export interface CheckInHoldInput {
  restaurantId: string;
  authorization: PaymentAuthorization;
  reservationId?: string;
}

export interface BillCloseInput {
  restaurantId: string;
  authorization: PaymentAuthorization;
  totalBill: number;
  reservationId?: string;
}

/**
 * Check-in:
 *   Provizyon → Beklemede (hold)
 * Bill close:
 *   Mahsup → Kalan ödeme (settlement preview; no live capture required here)
 */
export function createCheckInHold(input: CheckInHoldInput): SettlementRecord {
  const guarantee = input.authorization.amount.amount;
  return {
    id: `settle_hold_${input.authorization.id}`,
    restaurantId: input.restaurantId,
    authorizationId: input.authorization.id,
    reservationId: input.reservationId || input.authorization.reservationId,
    totalBill: 0,
    guaranteeOffset: guarantee,
    remainingCollection: 0,
    refund: 0,
    currency: input.authorization.amount.currency,
    phase: 'checkin_hold',
    note: 'Check-in: provizyon beklemede (hold). Hesap kapanınca mahsup uygulanır.',
    createdAt: new Date().toISOString(),
  };
}

export function createBillCloseSettlement(input: BillCloseInput): SettlementRecord {
  const guarantee = Math.max(0, input.authorization.amount.amount);
  const total = Math.max(0, input.totalBill);
  const offset = Math.min(guarantee, total);
  const remaining = Math.max(0, total - offset);
  const refund = Math.max(0, guarantee - offset);

  return {
    id: `settle_close_${input.authorization.id}_${Date.now()}`,
    restaurantId: input.restaurantId,
    authorizationId: input.authorization.id,
    reservationId: input.reservationId || input.authorization.reservationId,
    totalBill: total,
    guaranteeOffset: offset,
    remainingCollection: remaining,
    refund,
    currency: input.authorization.amount.currency,
    phase: 'bill_closed',
    note: 'Hesap kapandı: garanti mahsup edildi; kalan tahsilat / iade hazırlandı (canlı tahsilat yok).',
    createdAt: new Date().toISOString(),
  };
}
