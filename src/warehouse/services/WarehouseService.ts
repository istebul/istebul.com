import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  Warehouse,
  WarehouseListFilter,
} from "../types/Warehouse";
import {
  WarehouseCodeConflictError,
  WarehouseNotFoundError,
  WarehouseValidationError,
} from "../types/WarehouseErrors";
import type { WarehouseStatus } from "../types/WarehouseStatus";
import {
  validateCreateWarehouseInput,
  validateUpdateWarehouseInput,
} from "../utils/warehouseValidation";
import type { WarehouseRepository } from "./WarehouseRepository";

export interface WarehouseServiceDependencies {
  repository: WarehouseRepository;
  createId?: () => string;
  now?: () => string;
}

const STATUS_TRANSITIONS: Record<
  WarehouseStatus,
  readonly WarehouseStatus[]
> = {
  draft: ["active", "archived"],
  active: ["temporarily_closed", "inactive", "archived"],
  temporarily_closed: ["active", "inactive", "archived"],
  inactive: ["active", "archived"],
  archived: [],
};

export class WarehouseService {
  private readonly repository: WarehouseRepository;
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor(dependencies: WarehouseServiceDependencies) {
    this.repository = dependencies.repository;
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.now =
      dependencies.now ?? (() => new Date().toISOString());
  }

  async create(input: CreateWarehouseInput): Promise<Warehouse> {
    const normalizedInput = validateCreateWarehouseInput(input);

    const existingWarehouse = await this.repository.findByCode(
      normalizedInput.tenantId,
      normalizedInput.code,
    );

    if (existingWarehouse) {
      throw new WarehouseCodeConflictError(normalizedInput.code);
    }

    const timestamp = this.now();

    const warehouse: Warehouse = {
      id: this.createId(),
      tenantId: normalizedInput.tenantId,
      code: normalizedInput.code,
      name: normalizedInput.name,
      status: "draft",
      timezone: normalizedInput.timezone ?? "Europe/Istanbul",
      createdBy: normalizedInput.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalizedInput.description !== undefined
        ? { description: normalizedInput.description }
        : {}),
      ...(normalizedInput.address !== undefined
        ? { address: normalizedInput.address }
        : {}),
      ...(normalizedInput.capacity !== undefined
        ? { capacity: normalizedInput.capacity }
        : {}),
    };

    return this.repository.save(warehouse);
  }

  async get(
    tenantId: string,
    warehouseId: string,
  ): Promise<Warehouse> {
    const warehouse = await this.repository.findById(
      tenantId.trim(),
      warehouseId.trim(),
    );

    if (!warehouse) {
      throw new WarehouseNotFoundError(warehouseId);
    }

    return warehouse;
  }

  async list(filter: WarehouseListFilter): Promise<Warehouse[]> {
    if (!filter.tenantId.trim()) {
      throw new WarehouseValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    return this.repository.list({
      ...filter,
      tenantId: filter.tenantId.trim(),
    });
  }

  async update(
    tenantId: string,
    warehouseId: string,
    input: UpdateWarehouseInput,
  ): Promise<Warehouse> {
    const warehouse = await this.get(tenantId, warehouseId);
    const normalizedInput = validateUpdateWarehouseInput(input);

    const updatedWarehouse: Warehouse = {
      ...warehouse,
      ...normalizedInput,
      updatedAt: this.now(),
    };

    delete (
      updatedWarehouse as Warehouse & {
        updatedBy?: string;
      }
    ).updatedBy;

    return this.repository.save(updatedWarehouse);
  }

  async changeStatus(
    tenantId: string,
    warehouseId: string,
    nextStatus: WarehouseStatus,
  ): Promise<Warehouse> {
    const warehouse = await this.get(tenantId, warehouseId);

    if (warehouse.status === nextStatus) {
      return warehouse;
    }

    const allowedStatuses = STATUS_TRANSITIONS[warehouse.status];

    if (!allowedStatuses.includes(nextStatus)) {
      throw new WarehouseValidationError(
        `${warehouse.status} durumundan ${nextStatus} durumuna geçilemez.`,
      );
    }

    return this.repository.save({
      ...warehouse,
      status: nextStatus,
      updatedAt: this.now(),
    });
  }
}
