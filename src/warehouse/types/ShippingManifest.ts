export const SHIPPING_MANIFEST_STATUSES = [
  "draft",
  "generated",
  "approved",
  "submitted",
  "accepted",
  "rejected",
  "cancelled",
] as const;

export type ShippingManifestStatus =
  (typeof SHIPPING_MANIFEST_STATUSES)[number];

export const SHIPPING_MANIFEST_STATUS_LABELS: Record<
  ShippingManifestStatus,
  string
> = {
  draft: "Taslak",
  generated: "Oluşturuldu",
  approved: "Onaylandı",
  submitted: "Gönderildi",
  accepted: "Kabul Edildi",
  rejected: "Reddedildi",
  cancelled: "İptal Edildi",
};

export interface ShippingManifestPackage {
  readonly shippingPackageId: string;
  readonly packageNumber: string;
  readonly sscc?: string;
  readonly trackingNumber?: string;
  readonly weight?: number;
  readonly volume?: number;
}

export interface ShippingManifest {
  readonly id: string;
  readonly tenantId: string;
  readonly shippingId: string;

  readonly manifestNumber: string;
  readonly status: ShippingManifestStatus;

  readonly carrierId?: string;
  readonly serviceLevelId?: string;
  readonly vehicleId?: string;

  readonly packageCount: number;
  readonly totalWeight?: number;
  readonly totalVolume?: number;
  readonly weightUnit?: "g" | "kg";
  readonly volumeUnit?: "cm3" | "m3";

  readonly packages: readonly ShippingManifestPackage[];

  readonly generatedBy?: string;
  readonly generatedAt?: string;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  readonly submittedAt?: string;
  readonly acceptedAt?: string;

  readonly rejectionReason?: string;
  readonly notes?: string;

  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateShippingManifestInput {
  tenantId: string;
  shippingId: string;
  carrierId?: string;
  serviceLevelId?: string;
  vehicleId?: string;
  notes?: string;
  createdBy: string;
}

export function isShippingManifestStatus(
  value: unknown,
): value is ShippingManifestStatus {
  return (
    typeof value === "string" &&
    SHIPPING_MANIFEST_STATUSES.includes(
      value as ShippingManifestStatus,
    )
  );
}
