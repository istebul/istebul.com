export const PICKING_STRATEGIES = [
  "single_order",
  "batch",
  "wave",
  "zone",
  "cluster",
  "multi_order",
  "fifo",
  "fefo",
  "nearest_location",
  "route_optimized",
] as const;

export type PickingStrategy =
  (typeof PICKING_STRATEGIES)[number];

export const PICKING_STRATEGY_LABELS: Record<
  PickingStrategy,
  string
> = {
  single_order: "Tek Sipariş Toplama",
  batch: "Parti Toplama",
  wave: "Dalga Toplama",
  zone: "Bölge Bazlı Toplama",
  cluster: "Küme Toplama",
  multi_order: "Çoklu Sipariş Toplama",
  fifo: "İlk Giren İlk Çıkar",
  fefo: "Son Kullanma Tarihi Öncelikli",
  nearest_location: "En Yakın Lokasyon",
  route_optimized: "Rota Optimizasyonlu Toplama",
};

export function isPickingStrategy(
  value: unknown,
): value is PickingStrategy {
  return (
    typeof value === "string" &&
    PICKING_STRATEGIES.includes(
      value as PickingStrategy,
    )
  );
}
