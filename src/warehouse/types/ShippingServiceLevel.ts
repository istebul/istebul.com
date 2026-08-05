export const SHIPPING_SERVICE_LEVEL_TYPES = [
  "same_day",
  "next_day",
  "express",
  "standard",
  "economy",
  "scheduled",
  "temperature_controlled",
  "hazardous_material",
  "international",
  "custom",
] as const;

export type ShippingServiceLevelType =
  (typeof SHIPPING_SERVICE_LEVEL_TYPES)[number];

export const SHIPPING_SERVICE_LEVEL_TYPE_LABELS: Record<
  ShippingServiceLevelType,
  string
> = {
  same_day: "Aynı Gün Teslimat",
  next_day: "Ertesi Gün Teslimat",
  express: "Ekspres Teslimat",
  standard: "Standart Teslimat",
  economy: "Ekonomik Teslimat",
  scheduled: "Planlı Teslimat",
  temperature_controlled: "Sıcaklık Kontrollü Teslimat",
  hazardous_material: "Tehlikeli Madde Teslimatı",
  international: "Uluslararası Teslimat",
  custom: "Özel Servis",
};

export interface ShippingServiceLevel {
  readonly id: string;
  readonly tenantId: string;
  readonly carrierId: string;
  readonly code: string;
  readonly name: string;
  readonly type: ShippingServiceLevelType;
  readonly description?: string;
  readonly minimumDeliveryHours?: number;
  readonly maximumDeliveryHours?: number;
  readonly cutoffTime?: string;
  readonly maximumWeight?: number;
  readonly maximumVolume?: number;
  readonly weightUnit?: "g" | "kg";
  readonly volumeUnit?: "cm3" | "m3";
  readonly temperatureControlled: boolean;
  readonly hazardousMaterialAllowed: boolean;
  readonly international: boolean;
  readonly trackingSupported: boolean;
  readonly proofOfDeliveryRequired: boolean;
  readonly active: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateShippingServiceLevelInput {
  tenantId: string;
  carrierId: string;
  code: string;
  name: string;
  type: ShippingServiceLevelType;
  description?: string;
  minimumDeliveryHours?: number;
  maximumDeliveryHours?: number;
  cutoffTime?: string;
  maximumWeight?: number;
  maximumVolume?: number;
  weightUnit?: "g" | "kg";
  volumeUnit?: "cm3" | "m3";
  temperatureControlled?: boolean;
  hazardousMaterialAllowed?: boolean;
  international?: boolean;
  trackingSupported?: boolean;
  proofOfDeliveryRequired?: boolean;
  createdBy: string;
}

export function isShippingServiceLevelType(
  value: unknown,
): value is ShippingServiceLevelType {
  return (
    typeof value === "string" &&
    SHIPPING_SERVICE_LEVEL_TYPES.includes(
      value as ShippingServiceLevelType,
    )
  );
}
