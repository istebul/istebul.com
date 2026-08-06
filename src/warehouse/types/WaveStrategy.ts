export const WAVE_STRATEGIES = [
  "single_order",
  "batch_order",
  "zone_based",
  "route_based",
  "carrier_based",
  "service_level_based",
  "cutoff_based",
  "priority_based",
  "temperature_based",
  "product_family_based",
  "equipment_based",
  "capacity_balanced",
  "dynamic",
  "predictive",
] as const;

export type WaveStrategy =
  (typeof WAVE_STRATEGIES)[number];

export const WAVE_STRATEGY_LABELS: Record<
  WaveStrategy,
  string
> = {
  single_order: "Tek Sipariş Dalgası",
  batch_order: "Toplu Sipariş Dalgası",
  zone_based: "Bölge Bazlı Dalga",
  route_based: "Rota Bazlı Dalga",
  carrier_based: "Taşıyıcı Bazlı Dalga",
  service_level_based: "Servis Seviyesi Bazlı Dalga",
  cutoff_based: "Kesim Saati Bazlı Dalga",
  priority_based: "Öncelik Bazlı Dalga",
  temperature_based: "Sıcaklık Koşulu Bazlı Dalga",
  product_family_based: "Ürün Ailesi Bazlı Dalga",
  equipment_based: "Ekipman Bazlı Dalga",
  capacity_balanced: "Dengeli Kapasite Dalgası",
  dynamic: "Dinamik Dalga",
  predictive: "Tahmine Dayalı Dalga",
};

export function isWaveStrategy(
  value: unknown,
): value is WaveStrategy {
  return (
    typeof value === "string" &&
    WAVE_STRATEGIES.includes(
      value as WaveStrategy,
    )
  );
}
