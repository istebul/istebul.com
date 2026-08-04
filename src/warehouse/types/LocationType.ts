export const LOCATION_TYPES = [
  "receiving",
  "quality_control",
  "reserve",
  "picking",
  "bulk",
  "cold_storage",
  "hazardous",
  "returns",
  "damaged",
  "packing",
  "shipping",
  "cross_dock",
] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];

export function isLocationType(value: unknown): value is LocationType {
  return (
    typeof value === "string" &&
    LOCATION_TYPES.includes(value as LocationType)
  );
}
