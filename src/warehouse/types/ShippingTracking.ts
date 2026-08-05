export const SHIPPING_TRACKING_EVENT_TYPES = [
  "shipment_created",
  "released",
  "loading_ready",
  "loading_started",
  "package_loaded",
  "vehicle_loaded",
  "dispatched",
  "carrier_received",
  "in_transit",
  "transfer_center",
  "out_for_delivery",
  "delivery_attempted",
  "delivered",
  "delivery_failed",
  "returned",
  "exception",
] as const;

export type ShippingTrackingEventType =
  (typeof SHIPPING_TRACKING_EVENT_TYPES)[number];

export const SHIPPING_TRACKING_EVENT_LABELS: Record<
  ShippingTrackingEventType,
  string
> = {
  shipment_created: "Sevkiyat Oluşturuldu",
  released: "Sevkiyata Açıldı",
  loading_ready: "Yüklemeye Hazır",
  loading_started: "Yükleme Başladı",
  package_loaded: "Paket Yüklendi",
  vehicle_loaded: "Araç Yüklendi",
  dispatched: "Araç Çıkışı Yapıldı",
  carrier_received: "Taşıyıcı Teslim Aldı",
  in_transit: "Taşımada",
  transfer_center: "Transfer Merkezinde",
  out_for_delivery: "Dağıtıma Çıktı",
  delivery_attempted: "Teslimat Denendi",
  delivered: "Teslim Edildi",
  delivery_failed: "Teslimat Başarısız",
  returned: "İade Edildi",
  exception: "Sevkiyat İstisnası",
};

export interface ShippingTrackingEvent {
  readonly id: string;
  readonly tenantId: string;
  readonly shippingId: string;
  readonly shippingPackageId?: string;

  readonly trackingNumber?: string;
  readonly type: ShippingTrackingEventType;
  readonly message: string;

  readonly locationName?: string;
  readonly city?: string;
  readonly countryCode?: string;
  readonly latitude?: number;
  readonly longitude?: number;

  readonly source:
    | "warehouse"
    | "carrier"
    | "driver"
    | "customer"
    | "system";

  readonly externalEventCode?: string;
  readonly occurredAt: string;
  readonly createdAt: string;
}

export interface CreateShippingTrackingEventInput {
  tenantId: string;
  shippingId: string;
  shippingPackageId?: string;
  trackingNumber?: string;
  type: ShippingTrackingEventType;
  message: string;
  locationName?: string;
  city?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  source?: ShippingTrackingEvent["source"];
  externalEventCode?: string;
  occurredAt?: string;
}

export function isShippingTrackingEventType(
  value: unknown,
): value is ShippingTrackingEventType {
  return (
    typeof value === "string" &&
    SHIPPING_TRACKING_EVENT_TYPES.includes(
      value as ShippingTrackingEventType,
    )
  );
}
