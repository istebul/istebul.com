export const SHIPPING_POD_STATUSES = [
  "pending",
  "captured",
  "verified",
  "rejected",
  "cancelled",
] as const;

export type ShippingProofOfDeliveryStatus =
  (typeof SHIPPING_POD_STATUSES)[number];

export const SHIPPING_POD_STATUS_LABELS: Record<
  ShippingProofOfDeliveryStatus,
  string
> = {
  pending: "Bekliyor",
  captured: "Teslimat Kanıtı Alındı",
  verified: "Doğrulandı",
  rejected: "Reddedildi",
  cancelled: "İptal Edildi",
};

export interface ShippingProofOfDelivery {
  readonly id: string;
  readonly tenantId: string;
  readonly shippingId: string;

  readonly status: ShippingProofOfDeliveryStatus;

  readonly recipientName: string;
  readonly recipientIdentityNumber?: string;
  readonly recipientPhone?: string;

  readonly signatureUrl?: string;
  readonly photoUrls: readonly string[];
  readonly documentUrls: readonly string[];

  readonly latitude?: number;
  readonly longitude?: number;
  readonly deliveryAddress?: string;

  readonly deliveredAt: string;
  readonly capturedBy: string;
  readonly verifiedBy?: string;
  readonly verifiedAt?: string;

  readonly rejectionReason?: string;
  readonly notes?: string;

  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateShippingProofOfDeliveryInput {
  tenantId: string;
  shippingId: string;
  recipientName: string;
  recipientIdentityNumber?: string;
  recipientPhone?: string;
  signatureUrl?: string;
  photoUrls?: readonly string[];
  documentUrls?: readonly string[];
  latitude?: number;
  longitude?: number;
  deliveryAddress?: string;
  deliveredAt?: string;
  capturedBy: string;
  notes?: string;
}
