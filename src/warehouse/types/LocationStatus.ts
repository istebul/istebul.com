export const LOCATION_STATUSES = [
  "empty",
  "available",
  "reserved",
  "occupied",
  "blocked",
  "maintenance",
  "inactive",
] as const;

export type LocationStatus = (typeof LOCATION_STATUSES)[number];

export function isLocationStatus(
  value: unknown,
): value is LocationStatus {
  return (
    typeof value === "string" &&
    LOCATION_STATUSES.includes(value as LocationStatus)
  );
}
