export const REPLENISHMENT_EXCEPTION_TYPES = [
  "source_stock_missing",
  "source_stock_insufficient",
  "source_location_blocked",
  "destination_location_blocked",
  "destination_capacity_exceeded",
  "destination_stock_limit_exceeded",
  "product_mismatch",
  "sku_mismatch",
  "lot_mismatch",
  "serial_number_mismatch",
  "stock_status_mismatch",
  "unit_mismatch",
  "transfer_quantity_exceeded",
  "task_not_assigned",
  "inventory_movement_failed",
  "allocation_failed",
  "no_suitable_source",
  "demand_changed",
  "replenishment_interrupted",
] as const;

export type ReplenishmentExceptionType =
  (typeof REPLENISHMENT_EXCEPTION_TYPES)[number];

export const REPLENISHMENT_EXCEPTION_TYPE_LABELS: Record<
  ReplenishmentExceptionType,
  string
> = {
  source_stock_missing: "Kaynak Stok Bulunamadı",
  source_stock_insufficient: "Kaynak Stok Yetersiz",
  source_location_blocked: "Kaynak Lokasyon Bloke",
  destination_location_blocked: "Hedef Lokasyon Bloke",
  destination_capacity_exceeded: "Hedef Lokasyon Kapasitesi Aşıldı",
  destination_stock_limit_exceeded: "Hedef Stok Üst Sınırı Aşıldı",
  product_mismatch: "Ürün Uyuşmazlığı",
  sku_mismatch: "SKU Uyuşmazlığı",
  lot_mismatch: "Lot Uyuşmazlığı",
  serial_number_mismatch: "Seri Numarası Uyuşmazlığı",
  stock_status_mismatch: "Stok Durumu Uyuşmazlığı",
  unit_mismatch: "Ölçü Birimi Uyuşmazlığı",
  transfer_quantity_exceeded: "Transfer Miktarı Aşıldı",
  task_not_assigned: "İkmal Görevi Atanmadı",
  inventory_movement_failed: "Stok Hareketi Oluşturulamadı",
  allocation_failed: "Stok Tahsisi Başarısız",
  no_suitable_source: "Uygun Kaynak Lokasyon Bulunamadı",
  demand_changed: "İkmal Talebi Değişti",
  replenishment_interrupted: "İkmal İşlemi Kesintiye Uğradı",
};

export interface ReplenishmentException {
  readonly id: string;
  readonly tenantId: string;
  readonly replenishmentId: string;
  readonly replenishmentItemId?: string;
  readonly taskId?: string;
  readonly allocationId?: string;
  readonly warehouseId?: string;
  readonly sourceLocationId?: string;
  readonly destinationLocationId?: string;
  readonly productId?: string;
  readonly skuId?: string;
  readonly type: ReplenishmentExceptionType;
  readonly message: string;
  readonly resolved: boolean;
  readonly resolvedBy?: string;
  readonly resolvedAt?: string;
  readonly resolutionNotes?: string;
  readonly createdAt: string;
}

export function isReplenishmentExceptionType(
  value: unknown,
): value is ReplenishmentExceptionType {
  return (
    typeof value === "string" &&
    REPLENISHMENT_EXCEPTION_TYPES.includes(
      value as ReplenishmentExceptionType,
    )
  );
}
