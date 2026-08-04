export const RECEIVING_SOURCES = [
  "purchase_order",
  "advance_shipping_notice",
  "warehouse_transfer",
  "customer_return",
  "production",
  "manual",
] as const;

export type ReceivingSource =
  (typeof RECEIVING_SOURCES)[number];

export const RECEIVING_SOURCE_LABELS: Record<
  ReceivingSource,
  string
> = {
  purchase_order: "Satın Alma Siparişi",
  advance_shipping_notice: "Ön Sevkiyat Bildirimi",
  warehouse_transfer: "Depolar Arası Transfer",
  customer_return: "Müşteri İadesi",
  production: "Üretim Girişi",
  manual: "Manuel Mal Kabul",
};

export function isReceivingSource(
  value: unknown,
): value is ReceivingSource {
  return (
    typeof value === "string" &&
    RECEIVING_SOURCES.includes(value as ReceivingSource)
  );
}
