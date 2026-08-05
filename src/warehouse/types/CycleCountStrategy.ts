export const CYCLE_COUNT_STRATEGIES = [
  "abc_classification",
  "location_based",
  "product_based",
  "lot_based",
  "serial_based",
  "random_sample",
  "risk_based",
  "value_based",
  "movement_based",
  "exception_based",
  "full_inventory",
  "blind_count",
] as const;

export type CycleCountStrategy =
  (typeof CYCLE_COUNT_STRATEGIES)[number];

export const CYCLE_COUNT_STRATEGY_LABELS: Record<
  CycleCountStrategy,
  string
> = {
  abc_classification: "ABC Sınıfına Göre Sayım",
  location_based: "Lokasyon Bazlı Sayım",
  product_based: "Ürün Bazlı Sayım",
  lot_based: "Lot Bazlı Sayım",
  serial_based: "Seri Numarası Bazlı Sayım",
  random_sample: "Rastgele Örnekleme",
  risk_based: "Risk Bazlı Sayım",
  value_based: "Stok Değeri Bazlı Sayım",
  movement_based: "Hareket Yoğunluğuna Göre Sayım",
  exception_based: "İstisna Bazlı Sayım",
  full_inventory: "Tam Envanter Sayımı",
  blind_count: "Kör Sayım",
};

export function isCycleCountStrategy(
  value: unknown,
): value is CycleCountStrategy {
  return (
    typeof value === "string" &&
    CYCLE_COUNT_STRATEGIES.includes(
      value as CycleCountStrategy,
    )
  );
}
