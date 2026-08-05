export const PACKING_STRATEGIES = [
  "single_package",
  "multi_package",
  "cartonization",
  "palletization",
  "mixed_sku",
  "single_sku",
  "weight_based",
  "volume_based",
  "temperature_controlled",
  "hazardous_material",
  "carrier_optimized",
] as const;

export type PackingStrategy =
  (typeof PACKING_STRATEGIES)[number];

export const PACKING_STRATEGY_LABELS: Record<
  PackingStrategy,
  string
> = {
  single_package: "Tek Paket",
  multi_package: "Çoklu Paket",
  cartonization: "Otomatik Koli Seçimi",
  palletization: "Paletleme",
  mixed_sku: "Karışık SKU Paketleme",
  single_sku: "Tek SKU Paketleme",
  weight_based: "Ağırlık Bazlı Paketleme",
  volume_based: "Hacim Bazlı Paketleme",
  temperature_controlled: "Sıcaklık Kontrollü Paketleme",
  hazardous_material: "Tehlikeli Madde Paketleme",
  carrier_optimized: "Taşıyıcıya Göre Optimize Paketleme",
};

export function isPackingStrategy(
  value: unknown,
): value is PackingStrategy {
  return (
    typeof value === "string" &&
    PACKING_STRATEGIES.includes(
      value as PackingStrategy,
    )
  );
}
