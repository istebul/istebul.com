export const SHIPPING_PACKAGE_STATUSES = [
  "pending",
  "loading_ready",
  "loading",
  "loaded",
  "dispatched",
  "in_transit",
  "delivered",
  "delivery_failed",
  "returned",
  "cancelled",
] as const;

export type ShippingPackageStatus =
  (typeof SHIPPING_PACKAGE_STATUSES)[number];

export const SHIPPING_PACKAGE_STATUS_LABELS: Record<
  ShippingPackageStatus,
  string
> = {
  pending: "Bekliyor",
  loading_ready: "Yüklemeye Hazır",
  loading: "Yükleniyor",
  loaded: "Yüklendi",
  dispatched: "Sevk Edildi",
  in_transit: "Taşımada",
  delivered: "Teslim Edildi",
  delivery_failed: "Teslimat Başarısız",
  returned: "İade Edildi",
  cancelled: "İptal Edildi",
};

export interface ShippingPackage {
  readonly id: string;
  readonly tenantId: string;
  readonly shippingId: string;

  readonly packingId: string;
  readonly packingPackageId: string;

  readonly packageNumber: string;
  readonly sscc?: string;
  readonly trackingNumber?: string;

  readonly status: ShippingPackageStatus;

  readonly weight?: number;
  readonly volume?: number;
  readonly weightUnit?: "g" | "kg";
  readonly volumeUnit?: "cm3" | "m3";

  readonly palletId?: string;
  readonly parentPackageId?: string;

  readonly loadingSequence: number;
  readonly loadedBy?: string;
  readonly loadedAt?: string;

  readonly dispatchedAt?: string;
  readonly deliveredAt?: string;
  readonly returnedAt?: string;

  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateShippingPackageInput {
  tenantId: string;
  shippingId: string;
  packingId: string;
  packingPackageId: string;
  packageNumber: string;
  sscc?: string;
  trackingNumber?: string;
  weight?: number;
  volume?: number;
  weightUnit?: "g" | "kg";
  volumeUnit?: "cm3" | "m3";
  palletId?: string;
  parentPackageId?: string;
  loadingSequence?: number;
  notes?: string;
}

export function isShippingPackageStatus(
  value: unknown,
): value is ShippingPackageStatus {
  return (
    typeof value === "string" &&
    SHIPPING_PACKAGE_STATUSES.includes(
      value as ShippingPackageStatus,
    )
  );
}
