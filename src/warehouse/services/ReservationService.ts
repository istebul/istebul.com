import type { InventoryAvailability } from "../types/InventoryAvailability";
import type { InventoryReservation } from "../types/InventoryReservation";
import {
  InventoryInsufficientStockError,
  InventoryReservationNotFoundError,
  InventoryValidationError,
} from "../types/InventoryErrors";
import {
  calculateInventoryAvailability,
} from "./AvailabilityCalculator";
import type { InventoryRepository } from "./InventoryRepository";
import type {
  ReservationListFilter,
  ReservationRepository,
} from "./ReservationRepository";
import {
  type ConsumeReservationInput,
  type CreateReservationInput,
  validateConsumeReservationInput,
  validateCreateReservationInput,
  validateReservationConsumption,
} from "./ReservationValidator";

export interface ReservationServiceDependencies {
  repository: ReservationRepository;
  inventoryRepository: InventoryRepository;
  createId?: () => string;
  now?: () => string;
  sequence?: () => number;
}

export class ReservationService {
  private readonly repository: ReservationRepository;
  private readonly inventoryRepository: InventoryRepository;
  private readonly createId: () => string;
  private readonly now: () => string;
  private readonly sequence: () => number;

  constructor(dependencies: ReservationServiceDependencies) {
    let internalSequence = 0;

    this.repository = dependencies.repository;
    this.inventoryRepository = dependencies.inventoryRepository;
    this.createId =
      dependencies.createId ?? (() => crypto.randomUUID());
    this.now =
      dependencies.now ?? (() => new Date().toISOString());
    this.sequence =
      dependencies.sequence ?? (() => ++internalSequence);
  }

  async create(
    input: CreateReservationInput,
  ): Promise<InventoryReservation> {
    const normalized = validateCreateReservationInput(input);

    if (
      normalized.expiresAt !== undefined &&
      normalized.expiresAt <= this.now()
    ) {
      throw new InventoryValidationError(
        "Rezervasyon bitiş tarihi gelecekte olmalıdır.",
      );
    }

    const availability = await this.getAvailability({
      tenantId: normalized.tenantId,
      warehouseId: normalized.warehouseId,
      locationId: normalized.locationId,
      productId: normalized.productId,
      ...(normalized.skuId !== undefined
        ? { skuId: normalized.skuId }
        : {}),
      ...(normalized.lotNumber !== undefined
        ? { lotNumber: normalized.lotNumber }
        : {}),
      ...(normalized.serialNumber !== undefined
        ? { serialNumber: normalized.serialNumber }
        : {}),
    });

    if (availability.unit && availability.unit !== normalized.unit) {
      throw new InventoryValidationError(
        "Rezervasyon ölçü birimi stok ölçü birimiyle aynı olmalıdır.",
      );
    }

    if (availability.availableQuantity < normalized.quantity) {
      throw new InventoryInsufficientStockError(
        availability.availableQuantity,
        normalized.quantity,
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      id: this.createId(),
      tenantId: normalized.tenantId,
      reservationNumber: this.generateReservationNumber(),
      warehouseId: normalized.warehouseId,
      locationId: normalized.locationId,
      productId: normalized.productId,
      quantity: normalized.quantity,
      consumedQuantity: 0,
      unit: normalized.unit,
      status: "active",
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.skuId !== undefined
        ? { skuId: normalized.skuId }
        : {}),
      ...(normalized.lotNumber !== undefined
        ? { lotNumber: normalized.lotNumber }
        : {}),
      ...(normalized.serialNumber !== undefined
        ? { serialNumber: normalized.serialNumber }
        : {}),
      ...(normalized.referenceType !== undefined
        ? { referenceType: normalized.referenceType }
        : {}),
      ...(normalized.referenceId !== undefined
        ? { referenceId: normalized.referenceId }
        : {}),
      ...(normalized.referenceNumber !== undefined
        ? { referenceNumber: normalized.referenceNumber }
        : {}),
      ...(normalized.expiresAt !== undefined
        ? { expiresAt: normalized.expiresAt }
        : {}),
    });
  }

  async get(
    tenantId: string,
    reservationId: string,
  ): Promise<InventoryReservation> {
    const reservation = await this.repository.findById(
      tenantId.trim(),
      reservationId.trim(),
    );

    if (!reservation) {
      throw new InventoryReservationNotFoundError(reservationId);
    }

    return reservation;
  }

  async list(
    filter: ReservationListFilter,
  ): Promise<InventoryReservation[]> {
    if (!filter.tenantId.trim()) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    return this.repository.list({
      ...filter,
      tenantId: filter.tenantId.trim(),
    });
  }

  async consume(
    input: ConsumeReservationInput,
  ): Promise<InventoryReservation> {
    const normalized = validateConsumeReservationInput(input);
    const reservation = await this.get(
      normalized.tenantId,
      normalized.reservationId,
    );

    if (
      reservation.status !== "active" &&
      reservation.status !== "partially_consumed"
    ) {
      throw new InventoryValidationError(
        "Yalnızca aktif rezervasyonlar tüketilebilir.",
      );
    }

    validateReservationConsumption(
      reservation,
      normalized.quantity,
    );

    const consumedQuantity =
      reservation.consumedQuantity + normalized.quantity;

    return this.repository.save({
      ...reservation,
      consumedQuantity,
      status:
        consumedQuantity === reservation.quantity
          ? "consumed"
          : "partially_consumed",
      updatedAt: this.now(),
    });
  }

  async cancel(
    tenantId: string,
    reservationId: string,
  ): Promise<InventoryReservation> {
    const reservation = await this.get(tenantId, reservationId);

    if (
      reservation.status === "consumed" ||
      reservation.status === "cancelled" ||
      reservation.status === "expired"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış rezervasyon iptal edilemez.",
      );
    }

    return this.repository.save({
      ...reservation,
      status: "cancelled",
      updatedAt: this.now(),
    });
  }

  async expireDueReservations(
    tenantId: string,
  ): Promise<InventoryReservation[]> {
    const reservations = await this.repository.list({
      tenantId: tenantId.trim(),
      activeOnly: true,
    });

    const now = this.now();
    const expired: InventoryReservation[] = [];

    for (const reservation of reservations) {
      if (
        reservation.expiresAt !== undefined &&
        reservation.expiresAt <= now
      ) {
        expired.push(
          await this.repository.save({
            ...reservation,
            status: "expired",
            updatedAt: now,
          }),
        );
      }
    }

    return expired;
  }

  async getAvailability(
    filter: Parameters<typeof calculateInventoryAvailability>[0],
  ): Promise<InventoryAvailability> {
    const balances = await this.inventoryRepository.listBalances({
      tenantId: filter.tenantId.trim(),
      productId: filter.productId.trim(),
      stockStatus: "available",
      ...(filter.warehouseId !== undefined
        ? { warehouseId: filter.warehouseId.trim() }
        : {}),
      ...(filter.locationId !== undefined
        ? { locationId: filter.locationId.trim() }
        : {}),
      ...(filter.skuId !== undefined
        ? { skuId: filter.skuId.trim() }
        : {}),
      ...(filter.lotNumber !== undefined
        ? { lotNumber: filter.lotNumber.trim() }
        : {}),
      ...(filter.serialNumber !== undefined
        ? { serialNumber: filter.serialNumber.trim() }
        : {}),
    });

    const reservedQuantity =
      await this.repository.getReservedQuantity({
        tenantId: filter.tenantId.trim(),
        productId: filter.productId.trim(),
        ...(filter.warehouseId !== undefined
          ? { warehouseId: filter.warehouseId.trim() }
          : {}),
        ...(filter.locationId !== undefined
          ? { locationId: filter.locationId.trim() }
          : {}),
        ...(filter.skuId !== undefined
          ? { skuId: filter.skuId.trim() }
          : {}),
        ...(filter.lotNumber !== undefined
          ? { lotNumber: filter.lotNumber.trim() }
          : {}),
        ...(filter.serialNumber !== undefined
          ? { serialNumber: filter.serialNumber.trim() }
          : {}),
      });

    return calculateInventoryAvailability(
      filter,
      reservedQuantity,
      balances,
    );
  }

  private generateReservationNumber(): string {
    const date = this.now().slice(0, 10).replaceAll("-", "");
    const sequence = String(this.sequence()).padStart(6, "0");

    return `REZ-${date}-${sequence}`;
  }
}
