export const INVENTORY_DIRECTIONS = [
  "inbound",
  "outbound",
  "transfer",
  "reservation",
  "adjustment",
] as const;

export type InventoryDirection =
  (typeof INVENTORY_DIRECTIONS)[number];

export const INVENTORY_DIRECTION_LABELS: Record<
  InventoryDirection,
  string
> = {
  inbound: "Giriş",
  outbound: "Çıkış",
  transfer: "Transfer",
  reservation: "Rezervasyon",
  adjustment: "Düzeltme",
};

export function isInventoryDirection(
  value: unknown,
): value is InventoryDirection {
  return (
    typeof value === "string" &&
    INVENTORY_DIRECTIONS.includes(
      value as InventoryDirection,
    )
  );
}
