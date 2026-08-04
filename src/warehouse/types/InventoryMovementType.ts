export const INVENTORY_MOVEMENT_TYPES = [
  "goods_receipt",
  "purchase_receipt",
  "production_receipt",
  "customer_return",
  "putaway",
  "location_transfer",
  "warehouse_transfer_out",
  "warehouse_transfer_in",
  "reservation",
  "unreservation",
  "order_issue",
  "count_surplus",
  "count_shortage",
  "damage",
  "scrap",
  "disposal",
  "manual_adjustment_in",
  "manual_adjustment_out",
  "reversal",
] as const;

export type InventoryMovementType =
  (typeof INVENTORY_MOVEMENT_TYPES)[number];

export const INVENTORY_MOVEMENT_TYPE_LABELS: Record<
  InventoryMovementType,
  string
> = {
  goods_receipt: "Mal Kabul",
  purchase_receipt: "Satın Alma Girişi",
  production_receipt: "Üretim Girişi",
  customer_return: "Müşteri İadesi Girişi",
  putaway: "Lokasyona Yerleştirme",
  location_transfer: "Lokasyon Transferi",
  warehouse_transfer_out: "Depolar Arası Transfer Çıkışı",
  warehouse_transfer_in: "Depolar Arası Transfer Girişi",
  reservation: "Stok Rezervasyonu",
  unreservation: "Rezervasyon Kaldırma",
  order_issue: "Sipariş Çıkışı",
  count_surplus: "Sayım Fazlası",
  count_shortage: "Sayım Eksiği",
  damage: "Hasarlı Stok",
  scrap: "Hurda",
  disposal: "İmha",
  manual_adjustment_in: "Manuel Stok Girişi",
  manual_adjustment_out: "Manuel Stok Çıkışı",
  reversal: "Ters Kayıt",
};

export function isInventoryMovementType(
  value: unknown,
): value is InventoryMovementType {
  return (
    typeof value === "string" &&
    INVENTORY_MOVEMENT_TYPES.includes(
      value as InventoryMovementType,
    )
  );
}
