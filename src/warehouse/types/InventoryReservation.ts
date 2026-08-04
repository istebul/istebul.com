export const INVENTORY_RESERVATION_STATUSES = [
  "active",
  "partially_consumed",
  "consumed",
  "cancelled",
  "expired",
] as const;

export type InventoryReservationStatus =
  (typeof INVENTORY_RESERVATION_STATUSES)[number];

export const INVENTORY_RESERVATION_STATUS_LABELS: Record<
  InventoryReservationStatus,
  string
> = {
  active: "Aktif",
  partially_consumed: "Kısmen Kullanıldı",
  consumed: "Kullanıldı",
  cancelled: "İptal Edildi",
  expired: "Süresi Doldu",
};

export interface InventoryReservation {
  readonly id: string;
  readonly tenantId: string;
  readonly reservationNumber: string;

  readonly warehouseId: string;
  readonly locationId: string;
  readonly productId: string;
  readonly skuId?: string;

  readonly lotNumber?: string;
  readonly serialNumber?: string;

  readonly quantity: number;
  readonly consumedQuantity: number;
  readonly unit: string;

  readonly status: InventoryReservationStatus;

  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly referenceNumber?: string;

  readonly expiresAt?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function isInventoryReservationStatus(
  value: unknown,
): value is InventoryReservationStatus {
  return (
    typeof value === "string" &&
    INVENTORY_RESERVATION_STATUSES.includes(
      value as InventoryReservationStatus,
    )
  );
}
