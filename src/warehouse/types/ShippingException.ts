export const SHIPPING_EXCEPTION_TYPES = [
  "package_missing",
  "package_excess",
  "package_damaged",
  "package_not_ready",
  "package_label_missing",
  "package_sscc_mismatch",
  "weight_mismatch",
  "volume_exceeded",
  "vehicle_capacity_exceeded",
  "vehicle_not_available",
  "driver_not_available",
  "carrier_not_available",
  "carrier_service_unavailable",
  "dock_not_available",
  "dock_assignment_conflict",
  "loading_sequence_error",
  "manifest_mismatch",
  "asn_generation_failed",
  "tracking_number_missing",
  "temperature_mismatch",
  "hazardous_material_mismatch",
  "address_invalid",
  "dispatch_blocked",
  "delivery_failed",
  "proof_of_delivery_missing",
] as const;

export type ShippingExceptionType =
  (typeof SHIPPING_EXCEPTION_TYPES)[number];

export const SHIPPING_EXCEPTION_TYPE_LABELS: Record<
  ShippingExceptionType,
  string
> = {
  package_missing: "Eksik Paket",
  package_excess: "Fazla Paket",
  package_damaged: "Hasarlı Paket",
  package_not_ready: "Paket Sevkiyata Hazır Değil",
  package_label_missing: "Paket Etiketi Eksik",
  package_sscc_mismatch: "Paket SSCC Uyuşmazlığı",
  weight_mismatch: "Ağırlık Uyuşmazlığı",
  volume_exceeded: "Hacim Kapasitesi Aşıldı",
  vehicle_capacity_exceeded: "Araç Kapasitesi Aşıldı",
  vehicle_not_available: "Uygun Araç Bulunamadı",
  driver_not_available: "Uygun Sürücü Bulunamadı",
  carrier_not_available: "Uygun Taşıyıcı Bulunamadı",
  carrier_service_unavailable: "Taşıyıcı Servisi Kullanılamıyor",
  dock_not_available: "Uygun Rampa Bulunamadı",
  dock_assignment_conflict: "Rampa Atama Çakışması",
  loading_sequence_error: "Yükleme Sırası Hatası",
  manifest_mismatch: "Manifest Uyuşmazlığı",
  asn_generation_failed: "ASN Oluşturulamadı",
  tracking_number_missing: "Takip Numarası Eksik",
  temperature_mismatch: "Sıcaklık Uyuşmazlığı",
  hazardous_material_mismatch: "Tehlikeli Madde Uyuşmazlığı",
  address_invalid: "Teslimat Adresi Geçersiz",
  dispatch_blocked: "Sevkiyat Bloke",
  delivery_failed: "Teslimat Başarısız",
  proof_of_delivery_missing: "Teslimat Kanıtı Eksik",
};

export interface ShippingException {
  readonly id: string;
  readonly tenantId: string;
  readonly shippingId: string;
  readonly shippingItemId?: string;
  readonly shippingPackageId?: string;
  readonly taskId?: string;
  readonly manifestId?: string;
  readonly type: ShippingExceptionType;
  readonly message: string;
  readonly warehouseId?: string;
  readonly dockId?: string;
  readonly vehicleId?: string;
  readonly carrierId?: string;
  readonly resolved: boolean;
  readonly resolvedBy?: string;
  readonly resolvedAt?: string;
  readonly resolutionNotes?: string;
  readonly createdAt: string;
}

export function isShippingExceptionType(
  value: unknown,
): value is ShippingExceptionType {
  return (
    typeof value === "string" &&
    SHIPPING_EXCEPTION_TYPES.includes(
      value as ShippingExceptionType,
    )
  );
}
