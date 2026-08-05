export const PUTAWAY_EXCEPTION_TYPES = [
  "location_capacity_exceeded",
  "location_not_available",
  "temperature_mismatch",
  "hazardous_material_mismatch",
  "product_location_mismatch",
  "lot_mismatch",
  "serial_number_mismatch",
  "expiry_date_invalid",
  "source_stock_not_found",
  "quantity_exceeded",
  "target_location_blocked",
] as const;

export type PutawayExceptionType =
  (typeof PUTAWAY_EXCEPTION_TYPES)[number];

export const PUTAWAY_EXCEPTION_TYPE_LABELS: Record<
  PutawayExceptionType,
  string
> = {
  location_capacity_exceeded: "Lokasyon Kapasitesi Aşıldı",
  location_not_available: "Uygun Lokasyon Bulunamadı",
  temperature_mismatch: "Sıcaklık Uyuşmazlığı",
  hazardous_material_mismatch: "Tehlikeli Madde Uyuşmazlığı",
  product_location_mismatch: "Ürün ve Lokasyon Uyuşmazlığı",
  lot_mismatch: "Lot Uyuşmazlığı",
  serial_number_mismatch: "Seri Numarası Uyuşmazlığı",
  expiry_date_invalid: "Son Kullanma Tarihi Geçersiz",
  source_stock_not_found: "Kaynak Stok Bulunamadı",
  quantity_exceeded: "Yerleştirme Miktarı Aşıldı",
  target_location_blocked: "Hedef Lokasyon Bloke",
};

export interface PutawayException {
  readonly id: string;
  readonly tenantId: string;
  readonly putawayId: string;
  readonly putawayItemId?: string;
  readonly type: PutawayExceptionType;
  readonly message: string;
  readonly sourceLocationId?: string;
  readonly targetLocationId?: string;
  readonly resolved: boolean;
  readonly resolvedBy?: string;
  readonly resolvedAt?: string;
  readonly resolutionNotes?: string;
  readonly createdAt: string;
}

export function isPutawayExceptionType(
  value: unknown,
): value is PutawayExceptionType {
  return (
    typeof value === "string" &&
    PUTAWAY_EXCEPTION_TYPES.includes(
      value as PutawayExceptionType,
    )
  );
}
