import type { InventoryTracking } from "./InventoryMovement";

export const PACKING_PACKAGE_STATUSES = [
  "open",
  "in_progress",
  "sealed",
  "labelled",
  "shipping_ready",
  "cancelled",
] as const;

export type PackingPackageStatus =
  (typeof PACKING_PACKAGE_STATUSES)[number];

export const PACKING_PACKAGE_STATUS_LABELS: Record<
  PackingPackageStatus,
  string
> = {
  open: "Açık",
  in_progress: "Paketleniyor",
  sealed: "Mühürlendi",
  labelled: "Etiketlendi",
  shipping_ready: "Sevkiyata Hazır",
  cancelled: "İptal Edildi",
};

export interface PackingPackageItem {
  readonly id: string;
  readonly packingItemId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly quantity: number;
  readonly unit: string;
  readonly tracking?: InventoryTracking;
  readonly weight?: number;
  readonly volume?: number;
  readonly createdAt: string;
}

export interface PackingPackage {
  readonly id: string;
  readonly tenantId: string;
  readonly packingId: string;
  readonly packageNumber: string;
  readonly containerId: string;
  readonly parentPackageId?: string;
  readonly status: PackingPackageStatus;
  readonly sscc?: string;
  readonly licensePlateNumber?: string;
  readonly sealNumber?: string;
  readonly actualWeight?: number;
  readonly calculatedWeight?: number;
  readonly actualVolume?: number;
  readonly calculatedVolume?: number;
  readonly weightUnit: "g" | "kg";
  readonly volumeUnit: "cm3" | "m3";
  readonly items: readonly PackingPackageItem[];
  readonly sealedBy?: string;
  readonly sealedAt?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePackingPackageInput {
  tenantId: string;
  packingId: string;
  containerId: string;
  parentPackageId?: string;
  weightUnit?: "g" | "kg";
  volumeUnit?: "cm3" | "m3";
  createdBy: string;
}

export interface AddPackingPackageItemInput {
  tenantId: string;
  packingId: string;
  packageId: string;
  packingItemId: string;
  productId: string;
  skuId?: string;
  quantity: number;
  unit: string;
  tracking?: InventoryTracking;
  weight?: number;
  volume?: number;
}

export function isPackingPackageStatus(
  value: unknown,
): value is PackingPackageStatus {
  return (
    typeof value === "string" &&
    PACKING_PACKAGE_STATUSES.includes(
      value as PackingPackageStatus,
    )
  );
}
