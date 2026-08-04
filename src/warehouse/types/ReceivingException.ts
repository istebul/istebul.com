export const RECEIVING_EXCEPTION_TYPES = [
  "over_delivery",
  "under_delivery",
  "damaged_product",
  "unexpected_product",
  "lot_missing",
  "serial_number_missing",
  "expiry_date_missing",
  "expired_product",
  "unit_mismatch",
] as const;

export type ReceivingExceptionType =
  (typeof RECEIVING_EXCEPTION_TYPES)[number];

export const RECEIVING_EXCEPTION_TYPE_LABELS: Record<
  ReceivingExceptionType,
  string
> = {
  over_delivery: "Fazla Teslimat",
  under_delivery: "Eksik Teslimat",
  damaged_product: "Hasarlı Ürün",
  unexpected_product: "Beklenmeyen Ürün",
  lot_missing: "Lot Numarası Eksik",
  serial_number_missing: "Seri Numarası Eksik",
  expiry_date_missing: "Son Kullanma Tarihi Eksik",
  expired_product: "Son Kullanma Tarihi Geçmiş",
  unit_mismatch: "Ölçü Birimi Uyuşmazlığı",
};

export interface ReceivingException {
  readonly id: string;
  readonly type: ReceivingExceptionType;
  readonly message: string;
  readonly receivingItemId?: string;
  readonly createdAt: string;
}

export function isReceivingExceptionType(
  value: unknown,
): value is ReceivingExceptionType {
  return (
    typeof value === "string" &&
    RECEIVING_EXCEPTION_TYPES.includes(
      value as ReceivingExceptionType,
    )
  );
}
