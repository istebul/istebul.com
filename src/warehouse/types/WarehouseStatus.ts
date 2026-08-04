export const WAREHOUSE_STATUSES = [
  "draft",
  "active",
  "temporarily_closed",
  "inactive",
  "archived",
] as const;

export type WarehouseStatus = (typeof WAREHOUSE_STATUSES)[number];

export function isWarehouseStatus(value: unknown): value is WarehouseStatus {
  return (
    typeof value === "string" &&
    WAREHOUSE_STATUSES.includes(value as WarehouseStatus)
  );
}
