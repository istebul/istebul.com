export const SHIPPING_VEHICLE_TYPES = [
  "motorcycle",
  "van",
  "panel_van",
  "truck",
  "semi_trailer",
  "refrigerated_truck",
  "tanker",
  "container_truck",
  "customer_vehicle",
  "other",
] as const;

export type ShippingVehicleType =
  (typeof SHIPPING_VEHICLE_TYPES)[number];

export const SHIPPING_VEHICLE_TYPE_LABELS: Record<
  ShippingVehicleType,
  string
> = {
  motorcycle: "Motosiklet",
  van: "Minibüs",
  panel_van: "Panelvan",
  truck: "Kamyon",
  semi_trailer: "Tır",
  refrigerated_truck: "Frigorifik Araç",
  tanker: "Tanker",
  container_truck: "Konteyner Taşıyıcı",
  customer_vehicle: "Müşteri Aracı",
  other: "Diğer",
};

export interface ShippingVehicle {
  readonly id: string;
  readonly tenantId: string;
  readonly carrierId?: string;
  readonly code: string;
  readonly plateNumber: string;
  readonly type: ShippingVehicleType;
  readonly trailerPlateNumber?: string;
  readonly maximumWeight?: number;
  readonly maximumVolume?: number;
  readonly weightUnit?: "kg" | "ton";
  readonly volumeUnit?: "m3";
  readonly palletCapacity?: number;
  readonly packageCapacity?: number;
  readonly temperatureControlled: boolean;
  readonly minimumTemperature?: number;
  readonly maximumTemperature?: number;
  readonly hazardousMaterialAllowed: boolean;
  readonly gpsEnabled: boolean;
  readonly active: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateShippingVehicleInput {
  tenantId: string;
  carrierId?: string;
  code: string;
  plateNumber: string;
  type: ShippingVehicleType;
  trailerPlateNumber?: string;
  maximumWeight?: number;
  maximumVolume?: number;
  weightUnit?: "kg" | "ton";
  volumeUnit?: "m3";
  palletCapacity?: number;
  packageCapacity?: number;
  temperatureControlled?: boolean;
  minimumTemperature?: number;
  maximumTemperature?: number;
  hazardousMaterialAllowed?: boolean;
  gpsEnabled?: boolean;
  createdBy: string;
}

export function isShippingVehicleType(
  value: unknown,
): value is ShippingVehicleType {
  return (
    typeof value === "string" &&
    SHIPPING_VEHICLE_TYPES.includes(
      value as ShippingVehicleType,
    )
  );
}
