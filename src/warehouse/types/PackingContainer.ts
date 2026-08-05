export const PACKING_CONTAINER_TYPES = [
  "box",
  "carton",
  "crate",
  "pallet",
  "envelope",
  "bag",
  "thermal_box",
  "hazardous_container",
  "custom",
] as const;

export type PackingContainerType =
  (typeof PACKING_CONTAINER_TYPES)[number];

export const PACKING_CONTAINER_TYPE_LABELS: Record<
  PackingContainerType,
  string
> = {
  box: "Kutu",
  carton: "Koli",
  crate: "Sandık",
  pallet: "Palet",
  envelope: "Zarf",
  bag: "Torba",
  thermal_box: "Termal Kutu",
  hazardous_container: "Tehlikeli Madde Kabı",
  custom: "Özel Ambalaj",
};

export interface PackingContainerDimensions {
  readonly length: number;
  readonly width: number;
  readonly height: number;
  readonly unit: "mm" | "cm" | "m";
}

export interface PackingContainer {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly type: PackingContainerType;
  readonly description?: string;
  readonly dimensions?: PackingContainerDimensions;
  readonly emptyWeight?: number;
  readonly maximumWeight?: number;
  readonly maximumVolume?: number;
  readonly weightUnit?: "g" | "kg";
  readonly volumeUnit?: "cm3" | "m3";
  readonly temperatureControlled: boolean;
  readonly hazardousMaterialAllowed: boolean;
  readonly reusable: boolean;
  readonly active: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePackingContainerInput {
  tenantId: string;
  code: string;
  name: string;
  type: PackingContainerType;
  description?: string;
  dimensions?: PackingContainerDimensions;
  emptyWeight?: number;
  maximumWeight?: number;
  maximumVolume?: number;
  weightUnit?: "g" | "kg";
  volumeUnit?: "cm3" | "m3";
  temperatureControlled?: boolean;
  hazardousMaterialAllowed?: boolean;
  reusable?: boolean;
  createdBy: string;
}

export function isPackingContainerType(
  value: unknown,
): value is PackingContainerType {
  return (
    typeof value === "string" &&
    PACKING_CONTAINER_TYPES.includes(
      value as PackingContainerType,
    )
  );
}
