import type {
  InventoryBalance,
  InventoryBalanceFilter,
} from "../types/InventoryBalance";
import {
  InventoryMovementNotFoundError,
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  CreateInventoryMovementInput,
  InventoryMovement,
} from "../types/InventoryMovement";
import {
  resolveInventoryDirection,
  validateCreateInventoryMovementInput,
} from "../utils/inventoryValidation";
import {
  applyInventoryMovementToBalance,
  buildInventoryBalanceKey,
} from "./InventoryCalculator";
import { InventoryLedger } from "./InventoryLedger";
import type {
  InventoryMovementListFilter,
  InventoryRepository,
} from "./InventoryRepository";

export interface InventoryServiceDependencies {
  repository: InventoryRepository;
  ledger?: InventoryLedger;
  createId?: () => string;
  now?: () => string;
}

export class InventoryService {
  private readonly repository: InventoryRepository;
  private readonly ledger: InventoryLedger;
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor(dependencies: InventoryServiceDependencies) {
    this.repository = dependencies.repository;
    this.now =
      dependencies.now ?? (() => new Date().toISOString());

    this.ledger =
      dependencies.ledger ??
      new InventoryLedger({
        now: this.now,
      });

    this.createId =
      dependencies.createId ?? (() => crypto.randomUUID());
  }

  async recordMovement(
    input: CreateInventoryMovementInput,
  ): Promise<InventoryMovement> {
    const normalized =
      validateCreateInventoryMovementInput(input);

    if (
      normalized.movementType === "putaway" ||
      normalized.movementType === "location_transfer"
    ) {
      throw new InventoryValidationError(
        "Transfer hareketleri recordTransfer metodu ile oluşturulmalıdır.",
      );
    }

    if (
      normalized.movementType === "warehouse_transfer_out" ||
      normalized.movementType === "warehouse_transfer_in"
    ) {
      throw new InventoryValidationError(
        "Depolar arası transfer hareketleri recordTransfer metodu ile oluşturulmalıdır.",
      );
    }

    const movement = this.createMovement(normalized);

    await this.applyMovementBalance(movement);

    return this.repository.appendMovement(movement);
  }

  async recordTransfer(
    input: CreateInventoryMovementInput,
  ): Promise<readonly [InventoryMovement, InventoryMovement]> {
    const normalized =
      validateCreateInventoryMovementInput(input);

    if (
      normalized.movementType !== "putaway" &&
      normalized.movementType !== "location_transfer" &&
      normalized.movementType !== "warehouse_transfer_out" &&
      normalized.movementType !== "warehouse_transfer_in"
    ) {
      throw new InventoryValidationError(
        "Bu hareket türü transfer işlemi değildir.",
      );
    }

    const sourceWarehouseId =
      normalized.sourceWarehouseId ??
      normalized.warehouseId;

    const sourceLocationId =
      normalized.sourceLocationId ??
      normalized.locationId;

    const destinationWarehouseId =
      normalized.destinationWarehouseId ??
      normalized.warehouseId;

    const destinationLocationId =
      normalized.destinationLocationId;

    if (!destinationLocationId) {
      throw new InventoryValidationError(
        "Transfer hedef lokasyonu zorunludur.",
      );
    }

    if (
      sourceWarehouseId === destinationWarehouseId &&
      sourceLocationId === destinationLocationId
    ) {
      throw new InventoryValidationError(
        "Kaynak ve hedef lokasyon aynı olamaz.",
      );
    }

    const transactionGroupId =
      normalized.transactionGroupId ??
      this.ledger.generateTransactionGroupId();

    const occurredAt = normalized.occurredAt ?? this.now();

    const outbound = this.createMovement({
      ...normalized,
      movementType:
        sourceWarehouseId === destinationWarehouseId
          ? "manual_adjustment_out"
          : "warehouse_transfer_out",
      warehouseId: sourceWarehouseId,
      locationId: sourceLocationId,
      sourceWarehouseId,
      sourceLocationId,
      destinationWarehouseId,
      destinationLocationId,
      transactionGroupId,
      occurredAt,
    });

    const inbound = this.createMovement({
      ...normalized,
      movementType:
        sourceWarehouseId === destinationWarehouseId
          ? "manual_adjustment_in"
          : "warehouse_transfer_in",
      warehouseId: destinationWarehouseId,
      locationId: destinationLocationId,
      sourceWarehouseId,
      sourceLocationId,
      destinationWarehouseId,
      destinationLocationId,
      transactionGroupId,
      occurredAt,
    });

    await this.applyMovementBalance(outbound);

    try {
      await this.applyMovementBalance(inbound);
    } catch (error) {
      await this.applyCompensatingBalance(outbound);
      throw error;
    }

    const savedOutbound =
      await this.repository.appendMovement(outbound);

    const savedInbound =
      await this.repository.appendMovement(inbound);

    return [savedOutbound, savedInbound] as const;
  }

  async reverseMovement(
    tenantId: string,
    movementId: string,
    createdBy: string,
    reason?: string,
  ): Promise<InventoryMovement> {
    const original = await this.getMovement(
      tenantId,
      movementId,
    );

    const existingReversals =
      await this.repository.listMovements({
        tenantId,
        transactionGroupId: `REV:${original.id}`,
      });

    if (existingReversals.length > 0) {
      throw new InventoryValidationError(
        "Bu stok hareketi daha önce ters kayıt ile kapatılmış.",
      );
    }

    const reversalType =
      this.resolveReversalMovementType(original);

    return this.recordMovement({
      tenantId: original.tenantId,
      movementType: reversalType,
      warehouseId: original.warehouseId,
      locationId: original.locationId,
      productId: original.productId,
      quantity: original.quantity,
      unit: original.unit,
      stockStatus: original.stockStatus,
      createdBy: createdBy.trim(),
      reversalOfMovementId: original.id,
      transactionGroupId: `REV:${original.id}`,
      ...(original.skuId !== undefined
        ? { skuId: original.skuId }
        : {}),
      ...(original.tracking !== undefined
        ? { tracking: original.tracking }
        : {}),
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    });
  }

  async getMovement(
    tenantId: string,
    movementId: string,
  ): Promise<InventoryMovement> {
    const movement = await this.repository.findMovementById(
      tenantId.trim(),
      movementId.trim(),
    );

    if (!movement) {
      throw new InventoryMovementNotFoundError(movementId);
    }

    return movement;
  }

  async listMovements(
    filter: InventoryMovementListFilter,
  ): Promise<InventoryMovement[]> {
    if (!filter.tenantId.trim()) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    return this.repository.listMovements({
      ...filter,
      tenantId: filter.tenantId.trim(),
    });
  }

  async listBalances(
    filter: InventoryBalanceFilter,
  ): Promise<InventoryBalance[]> {
    if (!filter.tenantId.trim()) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    return this.repository.listBalances({
      ...filter,
      tenantId: filter.tenantId.trim(),
    });
  }

  private createMovement(
    input: CreateInventoryMovementInput,
  ): InventoryMovement {
    const occurredAt = input.occurredAt ?? this.now();

    return {
      id: this.createId(),
      tenantId: input.tenantId,
      movementNumber:
        this.ledger.generateMovementNumber(),
      movementType: input.movementType,
      direction: resolveInventoryDirection(
        input.movementType,
      ),
      warehouseId: input.warehouseId,
      locationId: input.locationId,
      productId: input.productId,
      stockStatus: input.stockStatus ?? "available",
      quantity: input.quantity,
      unit: input.unit,
      occurredAt,
      createdBy: input.createdBy,
      createdAt: this.now(),
      ...(input.skuId !== undefined
        ? { skuId: input.skuId }
        : {}),
      ...(input.sourceWarehouseId !== undefined
        ? { sourceWarehouseId: input.sourceWarehouseId }
        : {}),
      ...(input.sourceLocationId !== undefined
        ? { sourceLocationId: input.sourceLocationId }
        : {}),
      ...(input.destinationWarehouseId !== undefined
        ? {
            destinationWarehouseId:
              input.destinationWarehouseId,
          }
        : {}),
      ...(input.destinationLocationId !== undefined
        ? {
            destinationLocationId:
              input.destinationLocationId,
          }
        : {}),
      ...(input.tracking !== undefined
        ? { tracking: input.tracking }
        : {}),
      ...(input.reference !== undefined
        ? { reference: input.reference }
        : {}),
      ...(input.reason !== undefined
        ? { reason: input.reason }
        : {}),
      ...(input.notes !== undefined
        ? { notes: input.notes }
        : {}),
      ...(input.reversalOfMovementId !== undefined
        ? {
            reversalOfMovementId:
              input.reversalOfMovementId,
          }
        : {}),
      ...(input.transactionGroupId !== undefined
        ? {
            transactionGroupId:
              input.transactionGroupId,
          }
        : {}),
    };
  }

  private async applyMovementBalance(
    movement: InventoryMovement,
  ): Promise<InventoryBalance> {
    const key = buildInventoryBalanceKey(movement);

    const currentBalance =
      await this.repository.findBalance(key);

    const nextBalance = applyInventoryMovementToBalance(
      currentBalance,
      movement,
    );

    return this.repository.saveBalance(nextBalance);
  }

  private async applyCompensatingBalance(
    movement: InventoryMovement,
  ): Promise<void> {
    const key = buildInventoryBalanceKey(movement);
    const current = await this.repository.findBalance(key);

    if (!current) {
      return;
    }

    await this.repository.saveBalance({
      ...current,
      quantity: current.quantity + movement.quantity,
      lastMovementAt: this.now(),
    });
  }

  private resolveReversalMovementType(
    movement: InventoryMovement,
  ):
    | "manual_adjustment_in"
    | "manual_adjustment_out" {
    if (
      movement.movementType === "goods_receipt" ||
      movement.movementType === "purchase_receipt" ||
      movement.movementType === "production_receipt" ||
      movement.movementType === "customer_return" ||
      movement.movementType === "warehouse_transfer_in" ||
      movement.movementType === "count_surplus" ||
      movement.movementType === "manual_adjustment_in"
    ) {
      return "manual_adjustment_out";
    }

    return "manual_adjustment_in";
  }
}
