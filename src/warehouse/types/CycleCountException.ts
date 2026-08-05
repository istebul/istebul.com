export const CYCLE_COUNT_EXCEPTION_TYPES = [
  "location_not_found",
  "location_blocked",
  "product_not_found",
  "barcode_mismatch",
  "lot_mismatch",
  "serial_number_mismatch",
  "unexpected_product",
  "missing_stock",
  "excess_stock",
  "damaged_stock",
  "unit_mismatch",
  "variance_exceeded",
  "recount_required",
  "count_interrupted",
  "inventory_movement_detected",
  "approval_required",
  "adjustment_failed",
] as const;

export type CycleCountExceptionType =
  (typeof CYCLE_COUNT_EXCEPTION_TYPES)[number];

export const CYCLE_COUNT_EXCEPTION_TYPE_LABELS: Record<
  CycleCountExceptionType,
  string
> = {
  location_not_found: "Lokasyon Bulunamadı",
  location_blocked: "Lokasyon Bloke",
  product_not_found: "Ürün Bulunamadı",
  barcode_mismatch: "Barkod Uyuşmazlığı",
  lot_mismatch: "Lot Uyuşmazlığı",
  serial_number_mismatch: "Seri Numarası Uyuşmazlığı",
  unexpected_product: "Beklenmeyen Ürün",
  missing_stock: "Eksik Stok",
  excess_stock: "Fazla Stok",
  damaged_stock: "Hasarlı Stok",
  unit_mismatch: "Ölçü Birimi Uyuşmazlığı",
  variance_exceeded: "Sayım Toleransı Aşıldı",
  recount_required: "Yeniden Sayım Gerekli",
  count_interrupted: "Sayım Kesintiye Uğradı",
  inventory_movement_detected: "Sayım Sırasında Stok Hareketi Algılandı",
  approval_required: "Onay Gerekli",
  adjustment_failed: "Stok Düzeltmesi Başarısız",
};

export interface CycleCountException {
  readonly id: string;
  readonly tenantId: string;
  readonly cycleCountId: string;
  readonly cycleCountItemId?: string;
  readonly taskId?: string;
  readonly warehouseId?: string;
  readonly locationId?: string;
  readonly productId?: string;
  readonly lotNumber?: string;
  readonly serialNumber?: string;
  readonly type: CycleCountExceptionType;
  readonly message: string;
  readonly resolved: boolean;
  readonly resolvedBy?: string;
  readonly resolvedAt?: string;
  readonly resolutionNotes?: string;
  readonly createdAt: string;
}

export function isCycleCountExceptionType(
  value: unknown,
): value is CycleCountExceptionType {
  return (
    typeof value === "string" &&
    CYCLE_COUNT_EXCEPTION_TYPES.includes(
      value as CycleCountExceptionType,
    )
  );
}
