export const PACKING_EXCEPTION_TYPES = [
  "item_missing",
  "item_excess",
  "wrong_product",
  "wrong_barcode",
  "wrong_lot",
  "wrong_serial_number",
  "damaged_product",
  "weight_mismatch",
  "volume_exceeded",
  "container_capacity_exceeded",
  "container_not_compatible",
  "temperature_mismatch",
  "hazardous_material_mismatch",
  "label_generation_failed",
  "label_print_failed",
  "seal_required",
  "seal_mismatch",
] as const;

export type PackingExceptionType =
  (typeof PACKING_EXCEPTION_TYPES)[number];

export const PACKING_EXCEPTION_TYPE_LABELS: Record<
  PackingExceptionType,
  string
> = {
  item_missing: "Eksik Ürün",
  item_excess: "Fazla Ürün",
  wrong_product: "Yanlış Ürün",
  wrong_barcode: "Barkod Uyuşmazlığı",
  wrong_lot: "Lot Uyuşmazlığı",
  wrong_serial_number: "Seri Numarası Uyuşmazlığı",
  damaged_product: "Hasarlı Ürün",
  weight_mismatch: "Ağırlık Uyuşmazlığı",
  volume_exceeded: "Hacim Kapasitesi Aşıldı",
  container_capacity_exceeded: "Ambalaj Kapasitesi Aşıldı",
  container_not_compatible: "Ambalaj Uygun Değil",
  temperature_mismatch: "Sıcaklık Uyuşmazlığı",
  hazardous_material_mismatch: "Tehlikeli Madde Uyuşmazlığı",
  label_generation_failed: "Etiket Oluşturulamadı",
  label_print_failed: "Etiket Yazdırılamadı",
  seal_required: "Mühür Zorunlu",
  seal_mismatch: "Mühür Uyuşmazlığı",
};

export interface PackingException {
  readonly id: string;
  readonly tenantId: string;
  readonly packingId: string;
  readonly packingItemId?: string;
  readonly packageId?: string;
  readonly containerId?: string;
  readonly taskId?: string;
  readonly type: PackingExceptionType;
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

export function isPackingExceptionType(
  value: unknown,
): value is PackingExceptionType {
  return (
    typeof value === "string" &&
    PACKING_EXCEPTION_TYPES.includes(
      value as PackingExceptionType,
    )
  );
}
