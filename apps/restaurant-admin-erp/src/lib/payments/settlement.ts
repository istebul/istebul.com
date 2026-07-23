import type { SettlementPreview } from '@/lib/payments/types';

/**
 * Settlement architecture prep only — does not compute bill/offset/refund values yet.
 * Future phases will bind Pos / preorder totals and guarantee offsets here.
 */
export function prepareSettlementPreview(input?: {
  currency?: string;
  totalBill?: number | null;
  guaranteeOffset?: number | null;
  remainingCollection?: number | null;
  refund?: number | null;
}): SettlementPreview {
  return {
    totalBill: input?.totalBill ?? null,
    guaranteeOffset: input?.guaranteeOffset ?? null,
    remainingCollection: input?.remainingCollection ?? null,
    refund: input?.refund ?? null,
    currency: input?.currency || 'TRY',
    calculated: false,
    note:
      'Settlement alanı enterprise mimari için hazır. Gerçek hesaplama (Toplam Hesap, Provizyon Mahsup, Kalan Tahsilat, İade) sonraki fazda bağlanacak.',
  };
}
