export const SHIPPING_DOCK_STATUSES = [
  "available",
  "reserved",
  "occupied",
  "blocked",
  "maintenance",
  "inactive",
] as const;

export type ShippingDockStatus =
  (typeof SHIPPING_DOCK_STATUSES)[number];

export const SHIPPING_DOCK_STATUS_LABELS: Record<
  ShippingDockStatus,
  string
> = {
  available: "Uygun",
  reserved: "Rezerve",
  occupied: "Dolu",
  blocked: "Bloke",
  maintenance: "Bakımda",
  inactive: "Pasif",
};

export interface ShippingDock {
  readonly id: string;
  readonly tenantId: string;
  readonly warehouseId: string;
  readonly locationId: string;
  readonly code: string;
  readonly name: string;
  readonly status: ShippingDockStatus;
  readonly vehicleTypes: readonly string[];
  readonly maximumVehicleHeight?: number;
  readonly maximumVehicleWeight?: number;
  readonly temperatureControlled: boolean;
  readonly hazardousMaterialAllowed: boolean;
  readonly active: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateShippingDockInput {
  tenantId: string;
  warehouseId: string;
  locationId: string;
  code: string;
  name: string;
  vehicleTypes?: readonly string[];
  maximumVehicleHeight?: number;
  maximumVehicleWeight?: number;
  temperatureControlled?: boolean;
  hazardousMaterialAllowed?: boolean;
  createdBy: string;
}

export function isShippingDockStatus(
  value: unknown,
): value is ShippingDockStatus {
  return (
    typeof value === "string" &&
    SHIPPING_DOCK_STATUSES.includes(
      value as ShippingDockStatus,
    )
  );
}
