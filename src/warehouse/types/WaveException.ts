export const WAVE_EXCEPTION_TYPES = [
  "order_not_found",
  "order_not_ready",
  "order_already_allocated",
  "order_cutoff_exceeded",
  "inventory_shortage",
  "allocation_failed",
  "capacity_exceeded",
  "labor_capacity_exceeded",
  "equipment_capacity_exceeded",
  "location_capacity_exceeded",
  "carrier_capacity_exceeded",
  "route_capacity_exceeded",
  "temperature_conflict",
  "service_level_conflict",
  "zone_conflict",
  "task_generation_failed",
  "release_validation_failed",
  "wave_interrupted",
  "external_system_error",
] as const;

export type WaveExceptionType =
  (typeof WAVE_EXCEPTION_TYPES)[number];

export const WAVE_EXCEPTION_TYPE_LABELS: Record<
  WaveExceptionType,
  string
> = {
  order_not_found: "Sipariş Bulunamadı",
  order_not_ready: "Sipariş Operasyona Hazır Değil",
  order_already_allocated: "Sipariş Başka Dalgaya Atanmış",
  order_cutoff_exceeded: "Sipariş Kesim Saati Aşıldı",
  inventory_shortage: "Stok Yetersiz",
  allocation_failed: "Sipariş Tahsisi Başarısız",
  capacity_exceeded: "Dalga Kapasitesi Aşıldı",
  labor_capacity_exceeded: "Personel Kapasitesi Aşıldı",
  equipment_capacity_exceeded: "Ekipman Kapasitesi Aşıldı",
  location_capacity_exceeded: "Lokasyon Kapasitesi Aşıldı",
  carrier_capacity_exceeded: "Taşıyıcı Kapasitesi Aşıldı",
  route_capacity_exceeded: "Rota Kapasitesi Aşıldı",
  temperature_conflict: "Sıcaklık Koşulu Uyuşmazlığı",
  service_level_conflict: "Servis Seviyesi Uyuşmazlığı",
  zone_conflict: "Depo Bölgesi Uyuşmazlığı",
  task_generation_failed: "Görev Oluşturma Başarısız",
  release_validation_failed: "Serbest Bırakma Doğrulaması Başarısız",
  wave_interrupted: "Dalga Operasyonu Kesintiye Uğradı",
  external_system_error: "Harici Sistem Hatası",
};

export interface WaveException {
  readonly id: string;
  readonly tenantId: string;
  readonly waveId: string;
  readonly waveOrderId?: string;
  readonly waveItemId?: string;
  readonly waveTaskId?: string;
  readonly orderId?: string;
  readonly warehouseId?: string;
  readonly zoneId?: string;
  readonly productId?: string;
  readonly type: WaveExceptionType;
  readonly message: string;
  readonly resolved: boolean;
  readonly resolvedBy?: string;
  readonly resolvedAt?: string;
  readonly resolutionNotes?: string;
  readonly createdAt: string;
}

export function isWaveExceptionType(
  value: unknown,
): value is WaveExceptionType {
  return (
    typeof value === "string" &&
    WAVE_EXCEPTION_TYPES.includes(
      value as WaveExceptionType,
    )
  );
}
