export const INVENTORY_STOCK_STATUSES = [
  "available",
  "reserved",
  "blocked",
  "quality_control",
  "damaged",
  "scrap",
  "disposal",
  "in_transit",
] as const;

export type InventoryStockStatus =
  (typeof INVENTORY_STOCK_STATUSES)[number];

export const INVENTORY_STOCK_STATUS_LABELS: Record<
  InventoryStockStatus,
  string
> = {
  available: "Kullanılabilir",
  reserved: "Rezerve",
  blocked: "Blokeli",
  quality_control: "Kalite Kontrolde",
  damaged: "Hasarlı",
  scrap: "Hurda",
  disposal: "İmhada",
  in_transit: "Transferde",
};

export function isInventoryStockStatus(
  value: unknown,
): value is InventoryStockStatus {
  return (
    typeof value === "string" &&
    INVENTORY_STOCK_STATUSES.includes(
      value as InventoryStockStatus,
    )
  );
}
