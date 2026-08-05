export const SHIPPING_ASN_STATUSES = [
  "draft",
  "generated",
  "sent",
  "acknowledged",
  "rejected",
  "cancelled",
] as const;

export type ShippingAsnStatus =
  (typeof SHIPPING_ASN_STATUSES)[number];

export const SHIPPING_ASN_STATUS_LABELS: Record<
  ShippingAsnStatus,
  string
> = {
  draft: "Taslak",
  generated: "Oluşturuldu",
  sent: "Gönderildi",
  acknowledged: "Alındı Onayı Geldi",
  rejected: "Reddedildi",
  cancelled: "İptal Edildi",
};

export interface ShippingAsnLine {
  readonly lineNumber: number;
  readonly productId: string;
  readonly skuId?: string;
  readonly quantity: number;
  readonly unit: string;
  readonly lotNumber?: string;
  readonly serialNumber?: string;
  readonly packageNumber?: string;
  readonly sscc?: string;
}

export interface ShippingAsn {
  readonly id: string;
  readonly tenantId: string;
  readonly shippingId: string;

  readonly asnNumber: string;
  readonly status: ShippingAsnStatus;

  readonly senderCode?: string;
  readonly receiverCode?: string;

  readonly plannedDispatchAt?: string;
  readonly expectedDeliveryAt?: string;

  readonly packageCount: number;
  readonly lines: readonly ShippingAsnLine[];

  readonly format:
    | "json"
    | "xml"
    | "edi"
    | "edifact"
    | "custom";

  readonly content?: string;

  readonly generatedAt?: string;
  readonly sentAt?: string;
  readonly acknowledgedAt?: string;

  readonly rejectionReason?: string;
  readonly notes?: string;

  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateShippingAsnInput {
  tenantId: string;
  shippingId: string;
  senderCode?: string;
  receiverCode?: string;
  format?: ShippingAsn["format"];
  notes?: string;
  createdBy: string;
}

export function isShippingAsnStatus(
  value: unknown,
): value is ShippingAsnStatus {
  return (
    typeof value === "string" &&
    SHIPPING_ASN_STATUSES.includes(
      value as ShippingAsnStatus,
    )
  );
}
