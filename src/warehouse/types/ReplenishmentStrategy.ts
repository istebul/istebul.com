export const REPLENISHMENT_STRATEGIES = [
  "minimum_maximum",
  "demand_based",
  "order_based",
  "wave_based",
  "forward_pick",
  "top_up",
  "emergency",
  "batch",
  "case",
  "pallet",
  "abc_priority",
  "movement_velocity",
  "predictive",
] as const;

export type ReplenishmentStrategy =
  (typeof REPLENISHMENT_STRATEGIES)[number];

export const REPLENISHMENT_STRATEGY_LABELS: Record<
  ReplenishmentStrategy,
  string
> = {
  minimum_maximum: "Minimum–Maksimum Stok İkmali",
  demand_based: "Talep Bazlı İkmal",
  order_based: "Sipariş Bazlı İkmal",
  wave_based: "Dalga Bazlı İkmal",
  forward_pick: "Toplama Lokasyonu İkmali",
  top_up: "Tamamlama İkmali",
  emergency: "Acil İkmal",
  batch: "Toplu İkmal",
  case: "Koli Bazlı İkmal",
  pallet: "Palet Bazlı İkmal",
  abc_priority: "ABC Öncelikli İkmal",
  movement_velocity: "Hareket Hızına Göre İkmal",
  predictive: "Tahmine Dayalı İkmal",
};

export function isReplenishmentStrategy(
  value: unknown,
): value is ReplenishmentStrategy {
  return (
    typeof value === "string" &&
    REPLENISHMENT_STRATEGIES.includes(
      value as ReplenishmentStrategy,
    )
  );
}
