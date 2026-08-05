export const SHIPPING_STATUSES = [
  "draft",
  "planned",
  "released",
  "loading_ready",
  "loading",
  "loaded",
  "dispatched",
  "in_transit",
  "delivered",
  "partially_delivered",
  "delivery_failed",
  "returned",
  "cancelled",
] as const;

export type ShippingStatus =
  (typeof SHIPPING_STATUSES)[number];

export const SHIPPING_STATUS_LABELS: Record<
  ShippingStatus,
  string
> = {
  draft: "Taslak",
  planned: "Planlandı",
  released: "Sevkiyata Açıldı",
  loading_ready: "Yüklemeye Hazır",
  loading: "Yükleniyor",
  loaded: "Yüklendi",
  dispatched: "Sevk Edildi",
  in_transit: "Taşımada",
  delivered: "Teslim Edildi",
  partially_delivered: "Kısmen Teslim Edildi",
  delivery_failed: "Teslimat Başarısız",
  returned: "İade Edildi",
  cancelled: "İptal Edildi",
};

export function isShippingStatus(
  value: unknown,
): value is ShippingStatus {
  return (
    typeof value === "string" &&
    SHIPPING_STATUSES.includes(
      value as ShippingStatus,
    )
  );
}
