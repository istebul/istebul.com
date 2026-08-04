import type {
  InventoryBalance,
  InventoryBalanceFilter,
  InventoryBalanceKey,
} from "../types/InventoryBalance";
import type { InventoryMovement } from "../types/InventoryMovement";

export interface InventoryMovementListFilter {
  tenantId: string;
  warehouseId?: string;
  locationId?: string;
  productId?: string;
  skuId?: string;
  transactionGroupId?: string;
}

export interface InventoryRepository {
  findMovementById(
    tenantId: string,
    movementId: string,
  ): Promise<InventoryMovement | null>;

  findMovementByNumber(
    tenantId: string,
    movementNumber: string,
  ): Promise<InventoryMovement | null>;

  listMovements(
    filter: InventoryMovementListFilter,
  ): Promise<InventoryMovement[]>;

  appendMovement(
    movement: InventoryMovement,
  ): Promise<InventoryMovement>;

  findBalance(
    key: InventoryBalanceKey,
  ): Promise<InventoryBalance | null>;

  listBalances(
    filter: InventoryBalanceFilter,
  ): Promise<InventoryBalance[]>;

  saveBalance(
    balance: InventoryBalance,
  ): Promise<InventoryBalance>;
}
