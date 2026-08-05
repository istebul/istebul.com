import type {
  ShippingServiceLevel,
} from "./ShippingServiceLevel";

export const SHIPPING_CARRIER_TYPES = [
  "internal_fleet",
  "parcel_carrier",
  "freight_carrier",
  "courier",
  "third_party_logistics",
  "customer_pickup",
  "international_forwarder",
] as const;

export type ShippingCarrierType =
  (typeof SHIPPING_CARRIER_TYPES)[number];

export const SHIPPING_CARRIER_TYPE_LABELS: Record<
  ShippingCarrierType,
  string
> = {
  internal_fleet: "Şirket Filosu",
  parcel_carrier: "Kargo Taşıyıcısı",
  freight_carrier: "Yük Taşıyıcısı",
  courier: "Kurye",
  third_party_logistics: "Üçüncü Taraf Lojistik",
  customer_pickup: "Müşteri Teslim Alma",
  international_forwarder: "Uluslararası Forwarder",
};

export interface ShippingCarrier {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly type: ShippingCarrierType;
  readonly taxNumber?: string;
  readonly contactName?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly website?: string;
  readonly accountNumber?: string;
  readonly integrationCode?: string;
  readonly apiEnabled: boolean;
  readonly trackingSupported: boolean;
  readonly manifestSupported: boolean;
  readonly asnSupported: boolean;
  readonly temperatureControlled: boolean;
  readonly hazardousMaterialAllowed: boolean;
  readonly international: boolean;
  readonly serviceLevels: readonly ShippingServiceLevel[];
  readonly active: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateShippingCarrierInput {
  tenantId: string;
  code: string;
  name: string;
  type: ShippingCarrierType;
  taxNumber?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  accountNumber?: string;
  integrationCode?: string;
  apiEnabled?: boolean;
  trackingSupported?: boolean;
  manifestSupported?: boolean;
  asnSupported?: boolean;
  temperatureControlled?: boolean;
  hazardousMaterialAllowed?: boolean;
  international?: boolean;
  createdBy: string;
}

export function isShippingCarrierType(
  value: unknown,
): value is ShippingCarrierType {
  return (
    typeof value === "string" &&
    SHIPPING_CARRIER_TYPES.includes(
      value as ShippingCarrierType,
    )
  );
}
