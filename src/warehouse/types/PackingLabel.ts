export const PACKING_LABEL_TYPES = [
  "package",
  "shipping",
  "sscc",
  "gs1_128",
  "carrier",
  "hazardous_material",
  "temperature_controlled",
  "return",
  "custom",
] as const;

export type PackingLabelType =
  (typeof PACKING_LABEL_TYPES)[number];

export const PACKING_LABEL_TYPE_LABELS: Record<
  PackingLabelType,
  string
> = {
  package: "Paket Etiketi",
  shipping: "Sevkiyat Etiketi",
  sscc: "SSCC Etiketi",
  gs1_128: "GS1-128 Etiketi",
  carrier: "Taşıyıcı Etiketi",
  hazardous_material: "Tehlikeli Madde Etiketi",
  temperature_controlled: "Sıcaklık Kontrollü Etiket",
  return: "İade Etiketi",
  custom: "Özel Etiket",
};

export const PACKING_LABEL_STATUSES = [
  "created",
  "generated",
  "printed",
  "failed",
  "cancelled",
] as const;

export type PackingLabelStatus =
  (typeof PACKING_LABEL_STATUSES)[number];

export interface PackingLabel {
  readonly id: string;
  readonly tenantId: string;
  readonly packingId: string;
  readonly packageId?: string;
  readonly type: PackingLabelType;
  readonly status: PackingLabelStatus;
  readonly labelNumber: string;
  readonly barcodeValue?: string;
  readonly sscc?: string;
  readonly format: "zpl" | "pdf" | "png" | "svg" | "text";
  readonly content?: string;
  readonly printerId?: string;
  readonly generatedAt?: string;
  readonly printedAt?: string;
  readonly failureReason?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePackingLabelInput {
  tenantId: string;
  packingId: string;
  packageId?: string;
  type: PackingLabelType;
  format: "zpl" | "pdf" | "png" | "svg" | "text";
  barcodeValue?: string;
  sscc?: string;
  printerId?: string;
  createdBy: string;
}

export function isPackingLabelType(
  value: unknown,
): value is PackingLabelType {
  return (
    typeof value === "string" &&
    PACKING_LABEL_TYPES.includes(
      value as PackingLabelType,
    )
  );
}

export function isPackingLabelStatus(
  value: unknown,
): value is PackingLabelStatus {
  return (
    typeof value === "string" &&
    PACKING_LABEL_STATUSES.includes(
      value as PackingLabelStatus,
    )
  );
}
