export const REPLENISHMENT_SOURCE_TYPES = [
  "manual",
  "minimum_stock",
  "maximum_stock",
  "order_demand",
  "wave_demand",
  "short_pick",
  "cycle_count",
  "inventory_exception",
  "forecast",
  "scheduled",
  "external_system",
] as const;

export type ReplenishmentSourceType =
  (typeof REPLENISHMENT_SOURCE_TYPES)[number];

export const REPLENISHMENT_SOURCE_TYPE_LABELS: Record<
  ReplenishmentSourceType,
  string
> = {
  manual: "Manuel İkmal",
  minimum_stock: "Minimum Stok Tetiklemesi",
  maximum_stock: "Maksimum Stok Tamamlama",
  order_demand: "Sipariş Talebi",
  wave_demand: "Dalga Talebi",
  short_pick: "Eksik Toplama",
  cycle_count: "Sayım Sonucu",
  inventory_exception: "Stok İstisnası",
  forecast: "Tahmine Dayalı Talep",
  scheduled: "Planlı İkmal",
  external_system: "Harici Sistem Talebi",
};

export interface ReplenishmentSource {
  readonly type: ReplenishmentSourceType;
  readonly referenceId?: string;
  readonly referenceNumber?: string;
  readonly waveId?: string;
  readonly orderId?: string;
  readonly pickingId?: string;
  readonly cycleCountId?: string;
  readonly externalSystem?: string;
}

export function isReplenishmentSourceType(
  value: unknown,
): value is ReplenishmentSourceType {
  return (
    typeof value === "string" &&
    REPLENISHMENT_SOURCE_TYPES.includes(
      value as ReplenishmentSourceType,
    )
  );
}
