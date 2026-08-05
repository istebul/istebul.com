export const PICKING_EXCEPTION_TYPES = [
  "stock_not_found",
  "insufficient_stock",
  "short_pick",
  "location_mismatch",
  "barcode_mismatch",
  "lot_mismatch",
  "serial_number_mismatch",
  "expiry_date_mismatch",
  "damaged_product",
  "blocked_location",
  "unit_mismatch",
  "quantity_exceeded",
  "task_assignment_error",
] as const;

export type PickingExceptionType =
  (typeof PICKING_EXCEPTION_TYPES)[number];

export const PICKING_EXCEPTION_TYPE_LABELS: Record<
  PickingExceptionType,
  string
> = {
  stock_not_found: "Stok Bulunamadı",
  insufficient_stock: "Yetersiz Stok",
  short_pick: "Eksik Toplama",
  location_mismatch: "Lokasyon Uyuşmazlığı",
  barcode_mismatch: "Barkod Uyuşmazlığı",
  lot_mismatch: "Lot Uyuşmazlığı",
  serial_number_mismatch: "Seri Numarası Uyuşmazlığı",
  expiry_date_mismatch: "Son Kullanma Tarihi Uyuşmazlığı",
  damaged_product: "Hasarlı Ürün",
  blocked_location: "Lokasyon Bloke",
  unit_mismatch: "Ölçü Birimi Uyuşmazlığı",
  quantity_exceeded: "Toplama Miktarı Aşıldı",
  task_assignment_error: "Görev Atama Hatası",
};

export interface PickingException {
  readonly id: string;
  readonly tenantId: string;
  readonly pickingId: string;
  readonly pickingItemId?: string;
  readonly taskId?: string;
  readonly type: PickingExceptionType;
  readonly message: string;
  readonly warehouseId?: string;
  readonly locationId?: string;
  readonly productId?: string;
  readonly resolved: boolean;
  readonly resolvedBy?: string;
  readonly resolvedAt?: string;
  readonly resolutionNotes?: string;
  readonly createdAt: string;
}

export function isPickingExceptionType(
  value: unknown,
): value is PickingExceptionType {
  return (
    typeof value === "string" &&
    PICKING_EXCEPTION_TYPES.includes(
      value as PickingExceptionType,
    )
  );
}
