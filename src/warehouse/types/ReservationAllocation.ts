import type { InventoryBalance } from "./InventoryBalance";

export interface ReservationAllocation {
  readonly balance: InventoryBalance;
  readonly allocatedQuantity: number;
}

export interface ReservationAllocationResult {
  readonly requestedQuantity: number;
  readonly allocatedQuantity: number;
  readonly remainingQuantity: number;
  readonly fullyAllocated: boolean;
  readonly unit: string;
  readonly allocations: readonly ReservationAllocation[];
}

export interface CreateReservationAllocationInput {
  readonly quantity: number;
  readonly unit: string;
  readonly balances: readonly InventoryBalance[];
}
