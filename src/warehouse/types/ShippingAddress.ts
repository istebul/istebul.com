export const SHIPPING_ADDRESS_TYPES = [
  "ship_from",
  "ship_to",
  "billing",
  "return",
  "pickup",
  "cross_dock",
] as const;

export type ShippingAddressType =
  (typeof SHIPPING_ADDRESS_TYPES)[number];

export interface ShippingAddress {
  readonly id: string;
  readonly tenantId: string;
  readonly type: ShippingAddressType;
  readonly name: string;
  readonly companyName?: string;
  readonly contactName?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly countryCode: string;
  readonly country: string;
  readonly city: string;
  readonly district?: string;
  readonly postalCode?: string;
  readonly addressLine1: string;
  readonly addressLine2?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly deliveryInstructions?: string;
  readonly residential: boolean;
  readonly validated: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateShippingAddressInput {
  tenantId: string;
  type: ShippingAddressType;
  name: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  countryCode: string;
  country: string;
  city: string;
  district?: string;
  postalCode?: string;
  addressLine1: string;
  addressLine2?: string;
  latitude?: number;
  longitude?: number;
  deliveryInstructions?: string;
  residential?: boolean;
}

export function isShippingAddressType(
  value: unknown,
): value is ShippingAddressType {
  return (
    typeof value === "string" &&
    SHIPPING_ADDRESS_TYPES.includes(
      value as ShippingAddressType,
    )
  );
}
