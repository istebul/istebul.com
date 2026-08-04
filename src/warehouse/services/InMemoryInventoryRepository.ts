import type {
  InventoryBalance,
  InventoryBalanceFilter,
  InventoryBalanceKey,
} from "../types/InventoryBalance";
import type { InventoryMovement } from "../types/InventoryMovement";
import {
  InventoryMovementConflictError,
} from "../types/InventoryErrors";
import {
  serializeInventoryBalanceKey,
} from "./InventoryCalculator";
import type {
  InventoryMovementListFilter,
  InventoryRepository,
} from "./InventoryRepository";

export class InMemoryInventoryRepository
  implements InventoryRepository
{
  private readonly movements =
    new Map<string, InventoryMovement>();

  private readonly balances =
    new Map<string, InventoryBalance>();

  async findMovementById(
    tenantId: string,
    movementId: string,
  ): Promise<InventoryMovement | null> {
    const movement = this.movements.get(movementId);

    if (!movement || movement.tenantId !== tenantId) {
      return null;
    }

    return structuredClone(movement);
  }

  async findMovementByNumber(
    tenantId: string,
    movementNumber: string,
  ): Promise<InventoryMovement | null> {
    for (const movement of this.movements.values()) {
      if (
        movement.tenantId === tenantId &&
        movement.movementNumber === movementNumber
      ) {
        return structuredClone(movement);
      }
    }

    return null;
  }

  async listMovements(
    filter: InventoryMovementListFilter,
  ): Promise<InventoryMovement[]> {
    return [...this.movements.values()]
      .filter(
        (movement) => movement.tenantId === filter.tenantId,
      )
      .filter(
        (movement) =>
          filter.warehouseId === undefined ||
          movement.warehouseId === filter.warehouseId,
      )
      .filter(
        (movement) =>
          filter.locationId === undefined ||
          movement.locationId === filter.locationId,
      )
      .filter(
        (movement) =>
          filter.productId === undefined ||
          movement.productId === filter.productId,
      )
      .filter(
        (movement) =>
          filter.skuId === undefined ||
          movement.skuId === filter.skuId,
      )
      .filter(
        (movement) =>
          filter.transactionGroupId === undefined ||
          movement.transactionGroupId ===
            filter.transactionGroupId,
      )
      .sort((left, right) =>
        left.occurredAt.localeCompare(right.occurredAt),
      )
      .map((movement) => structuredClone(movement));
  }

  async appendMovement(
    movement: InventoryMovement,
  ): Promise<InventoryMovement> {
    const existing = await this.findMovementByNumber(
      movement.tenantId,
      movement.movementNumber,
    );

    if (existing) {
      throw new InventoryMovementConflictError(
        movement.movementNumber,
      );
    }

    const stored = structuredClone(movement);
    this.movements.set(stored.id, stored);

    return structuredClone(stored);
  }

  async findBalance(
    key: InventoryBalanceKey,
  ): Promise<InventoryBalance | null> {
    const balance = this.balances.get(
      serializeInventoryBalanceKey(key),
    );

    return balance ? structuredClone(balance) : null;
  }

  async listBalances(
    filter: InventoryBalanceFilter,
  ): Promise<InventoryBalance[]> {
    return [...this.balances.values()]
      .filter(
        (balance) => balance.tenantId === filter.tenantId,
      )
      .filter(
        (balance) =>
          filter.warehouseId === undefined ||
          balance.warehouseId === filter.warehouseId,
      )
      .filter(
        (balance) =>
          filter.locationId === undefined ||
          balance.locationId === filter.locationId,
      )
      .filter(
        (balance) =>
          filter.productId === undefined ||
          balance.productId === filter.productId,
      )
      .filter(
        (balance) =>
          filter.skuId === undefined ||
          balance.skuId === filter.skuId,
      )
      .filter(
        (balance) =>
          filter.lotNumber === undefined ||
          balance.lotNumber === filter.lotNumber,
      )
      .filter(
        (balance) =>
          filter.serialNumber === undefined ||
          balance.serialNumber === filter.serialNumber,
      )
      .filter(
        (balance) =>
          filter.stockStatus === undefined ||
          balance.stockStatus === filter.stockStatus,
      )
      .map((balance) => structuredClone(balance));
  }

  async saveBalance(
    balance: InventoryBalance,
  ): Promise<InventoryBalance> {
    const stored = structuredClone(balance);

    this.balances.set(
      serializeInventoryBalanceKey(stored),
      stored,
    );

    return structuredClone(stored);
  }
}
