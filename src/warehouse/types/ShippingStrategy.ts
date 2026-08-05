export const SHIPPING_STRATEGIES = [
  "single_shipment",
  "multi_order",
  "consolidated",
  "direct_delivery",
  "cross_dock",
  "parcel",
  "less_than_truckload",
  "full_truckload",
  "milk_run",
  "route_optimized",
  "carrier_optimized",
  "cost_optimized",
  "service_level_optimized",
  "temperature_controlled",
  "hazardous_material",
] as const;

export type ShippingStrategy =
  (typeof SHIPPING_STRATEGIES)[number];

export const SHIPPING_STRATEGY_LABELS: Record<
  ShippingStrategy,
  string
> = {
  single_shipment: "Tek Sevkiyat",
  multi_order: "Çoklu Sipariş Sevkiyatı",
  consolidated: "Konsolide Sevkiyat",
  direct_delivery: "Doğrudan Teslimat",
  cross_dock: "Çapraz Sevkiyat",
  parcel: "Kargo Gönderisi",
  less_than_truckload: "Parsiyel Taşıma",
  full_truckload: "Komple Araç Taşıma",
  milk_run: "Döngüsel Dağıtım",
  route_optimized: "Rota Optimizasyonlu Sevkiyat",
  carrier_optimized: "Taşıyıcıya Göre Optimize Sevkiyat",
  cost_optimized: "Maliyet Odaklı Sevkiyat",
  service_level_optimized: "Servis Seviyesi Odaklı Sevkiyat",
  temperature_controlled: "Sıcaklık Kontrollü Sevkiyat",
  hazardous_material: "Tehlikeli Madde Sevkiyatı",
};

export function isShippingStrategy(
  value: unknown,
): value is ShippingStrategy {
  return (
    typeof value === "string" &&
    SHIPPING_STRATEGIES.includes(
      value as ShippingStrategy,
    )
  );
}
