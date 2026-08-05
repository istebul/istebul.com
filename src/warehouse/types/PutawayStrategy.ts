export const PUTAWAY_STRATEGIES = [
  "fixed_location",
  "dynamic_location",
  "nearest_location",
  "fifo",
  "fefo",
  "zone_based",
  "capacity_based",
  "temperature_based",
  "hazardous_material_based",
  "abc_class_based",
] as const;

export type PutawayStrategy =
  (typeof PUTAWAY_STRATEGIES)[number];

export const PUTAWAY_STRATEGY_LABELS: Record<
  PutawayStrategy,
  string
> = {
  fixed_location: "Sabit Lokasyon",
  dynamic_location: "Dinamik Lokasyon",
  nearest_location: "En Yakın Lokasyon",
  fifo: "İlk Giren İlk Çıkar",
  fefo: "Son Kullanma Tarihi Öncelikli",
  zone_based: "Bölge Bazlı",
  capacity_based: "Kapasite Bazlı",
  temperature_based: "Sıcaklık Bazlı",
  hazardous_material_based: "Tehlikeli Madde Bazlı",
  abc_class_based: "ABC Sınıfı Bazlı",
};

export function isPutawayStrategy(
  value: unknown,
): value is PutawayStrategy {
  return (
    typeof value === "string" &&
    PUTAWAY_STRATEGIES.includes(value as PutawayStrategy)
  );
}
