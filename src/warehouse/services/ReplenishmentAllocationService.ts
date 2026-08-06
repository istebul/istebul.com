import type {
  Replenishment,
} from "../types/Replenishment";
import type {
  ReplenishmentAllocation,
} from "../types/ReplenishmentAllocation";
import type {
  ReplenishmentItem,
} from "../types/ReplenishmentItem";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  ReplenishmentOptimizationResult,
} from "./ReplenishmentOptimizer";
import {
  ReplenishmentOptimizer,
} from "./ReplenishmentOptimizer";
import type {
  ReplenishmentRepository,
} from "./ReplenishmentRepository";

export interface ReplenishmentReservationInput {
  readonly allocation:
    ReplenishmentAllocation;
  readonly requestedBy: string;
}

export interface ReplenishmentReservationResult {
  readonly inventoryReservationId:
    string;
}

export interface ReplenishmentReservationGateway {
  reserve(
    input: ReplenishmentReservationInput,
  ): Promise<ReplenishmentReservationResult>;

  release?(
    input: {
      allocation:
        ReplenishmentAllocation;
      inventoryReservationId: string;
      releasedBy: string;
    },
  ): Promise<void>;
}

export interface ReplenishmentTransferInput {
  readonly allocation:
    ReplenishmentAllocation;
  readonly quantity: number;
  readonly transferredBy: string;
}

export interface ReplenishmentTransferResult {
  readonly inventoryMovementId: string;
}

export interface ReplenishmentTransferGateway {
  transfer(
    input: ReplenishmentTransferInput,
  ): Promise<ReplenishmentTransferResult>;
}

export interface ReplenishmentAllocationServiceDependencies {
  readonly repository:
    ReplenishmentRepository;
  readonly optimizer?:
    ReplenishmentOptimizer;
  readonly reservationGateway?:
    ReplenishmentReservationGateway;
  readonly transferGateway?:
    ReplenishmentTransferGateway;
  readonly createId?: () => string;
  readonly now?: () => string;
}

let internalSequence = 0;

export class ReplenishmentAllocationService {
  private readonly repository:
    ReplenishmentRepository;

  private readonly optimizer:
    ReplenishmentOptimizer;

  private readonly reservationGateway:
    ReplenishmentReservationGateway | undefined;

  private readonly transferGateway:
    ReplenishmentTransferGateway | undefined;

  private readonly createId: () => string;

  private readonly now: () => string;

  constructor(
    dependencies:
      ReplenishmentAllocationServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.optimizer =
      dependencies.optimizer ??
      new ReplenishmentOptimizer();

    this.reservationGateway =
      dependencies.reservationGateway;

    this.transferGateway =
      dependencies.transferGateway;

    this.createId =
      dependencies.createId ??
      (() =>
        `replenishment-allocation-${String(
          ++internalSequence,
        ).padStart(6, "0")}`);

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  async createFromOptimization(input: {
    tenantId: string;
    replenishmentId: string;
    optimization:
      ReplenishmentOptimizationResult;
  }): Promise<ReplenishmentAllocation[]> {
    const replenishment =
      await this.requireReplenishment(
        input.tenantId,
        input.replenishmentId,
      );

    if (
      replenishment.status !== "draft" &&
      replenishment.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Tahsis yalnızca taslak veya planlanmış ikmal için oluşturulabilir.",
      );
    }

    if (
      input.optimization.selections
        .length === 0
    ) {
      throw new InventoryValidationError(
        "Tahsis oluşturmak için optimizer seçimi bulunamadı.",
      );
    }

    const existing =
      await this.repository
        .listAllocations(
          replenishment.tenantId,
          replenishment.id,
        );

    if (
      existing.some(
        (allocation) =>
          allocation.status !==
            "cancelled" &&
          allocation.status !==
            "released",
      )
    ) {
      throw new InventoryValidationError(
        "İkmal kaydı için aktif tahsisler zaten bulunmaktadır.",
      );
    }

    const allocations =
      this.optimizer.buildAllocations({
        tenantId:
          replenishment.tenantId,
        replenishmentId:
          replenishment.id,
        optimization:
          input.optimization,
        createId: this.createId,
        now: this.now,
      });

    const saved:
      ReplenishmentAllocation[] = [];

    for (const allocation of allocations) {
      const item =
        this.requireItem(
          replenishment,
          allocation
            .replenishmentItemId,
        );

      this.validateAllocationAgainstItem(
        allocation,
        item,
      );

      saved.push(
        await this.repository
          .saveAllocation(
            allocation,
          ),
      );
    }

    await this.refreshItemAllocationTotals(
      replenishment.tenantId,
      replenishment.id,
    );

    return saved;
  }

  async reserve(input: {
    tenantId: string;
    replenishmentId: string;
    allocationId: string;
    requestedBy: string;
  }): Promise<ReplenishmentAllocation> {
    const replenishment =
      await this.requireReplenishment(
        input.tenantId,
        input.replenishmentId,
      );

    const allocation =
      this.requireAllocation(
        replenishment,
        input.allocationId,
      );

    const requestedBy =
      this.requireText(
        input.requestedBy,
        "Rezervasyonu yapan kullanıcı",
      );

    if (
      allocation.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yalnızca planlanmış tahsis rezerve edilebilir.",
      );
    }

    if (!this.reservationGateway) {
      throw new InventoryValidationError(
        "Stok rezervasyon servisi yapılandırılmamış.",
      );
    }

    const result =
      await this.reservationGateway
        .reserve({
          allocation,
          requestedBy,
        });

    const inventoryReservationId =
      this.requireText(
        result.inventoryReservationId,
        "Stok rezervasyon kimliği",
      );

    const timestamp = this.now();

    return this.repository
      .saveAllocation({
        ...allocation,
        status: "reserved",
        inventoryReservationId,
        reservedAt: timestamp,
        updatedAt: timestamp,
      });
  }

  async start(input: {
    tenantId: string;
    replenishmentId: string;
    allocationId: string;
    startedBy: string;
  }): Promise<ReplenishmentAllocation> {
    const replenishment =
      await this.requireReplenishment(
        input.tenantId,
        input.replenishmentId,
      );

    const allocation =
      this.requireAllocation(
        replenishment,
        input.allocationId,
      );

    this.requireText(
      input.startedBy,
      "Tahsis işlemini başlatan kullanıcı",
    );

    if (
      allocation.status !==
        "reserved" &&
      allocation.status !==
        "planned"
    ) {
      throw new InventoryValidationError(
        "Tahsis mevcut durumda başlatılamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository
      .saveAllocation({
        ...allocation,
        status: "in_progress",
        startedAt:
          allocation.startedAt ??
          timestamp,
        updatedAt: timestamp,
      });
  }

  async transfer(input: {
    tenantId: string;
    replenishmentId: string;
    allocationId: string;
    quantity: number;
    transferredBy: string;
  }): Promise<ReplenishmentAllocation> {
    const replenishment =
      await this.requireReplenishment(
        input.tenantId,
        input.replenishmentId,
      );

    const allocation =
      this.requireAllocation(
        replenishment,
        input.allocationId,
      );

    const transferredBy =
      this.requireText(
        input.transferredBy,
        "Transferi yapan kullanıcı",
      );

    const quantity =
      this.requirePositiveNumber(
        input.quantity,
        "Transfer miktarı",
      );

    if (
      allocation.status !==
      "in_progress"
    ) {
      throw new InventoryValidationError(
        "Yalnızca devam eden tahsiste transfer yapılabilir.",
      );
    }

    if (
      quantity >
      allocation.remainingQuantity
    ) {
      throw new InventoryValidationError(
        "Transfer miktarı tahsisin kalan miktarını aşamaz.",
      );
    }

    if (!this.transferGateway) {
      throw new InventoryValidationError(
        "Stok transfer servisi yapılandırılmamış.",
      );
    }

    const transferResult =
      await this.transferGateway
        .transfer({
          allocation,
          quantity,
          transferredBy,
        });

    const inventoryMovementId =
      this.requireText(
        transferResult
          .inventoryMovementId,
        "Stok hareketi kimliği",
      );

    const transferredQuantity =
      this.round(
        allocation.transferredQuantity +
          quantity,
      );

    const remainingQuantity =
      this.round(
        Math.max(
          0,
          allocation.allocatedQuantity -
            transferredQuantity,
        ),
      );

    const completed =
      remainingQuantity === 0;

    const timestamp = this.now();

    const updated =
      await this.repository
        .saveAllocation({
          ...allocation,
          transferredQuantity,
          remainingQuantity,
          inventoryMovementId,
          status: completed
            ? "completed"
            : "in_progress",
          updatedAt: timestamp,
          ...(completed
            ? {
                completedAt:
                  timestamp,
              }
            : {}),
        });

    await this.refreshItemTransferTotals(
      replenishment.tenantId,
      replenishment.id,
      allocation.replenishmentItemId,
    );

    return updated;
  }

  async release(input: {
    tenantId: string;
    replenishmentId: string;
    allocationId: string;
    releasedBy: string;
  }): Promise<ReplenishmentAllocation> {
    const replenishment =
      await this.requireReplenishment(
        input.tenantId,
        input.replenishmentId,
      );

    const allocation =
      this.requireAllocation(
        replenishment,
        input.allocationId,
      );

    const releasedBy =
      this.requireText(
        input.releasedBy,
        "Tahsis rezervasyonunu kaldıran kullanıcı",
      );

    if (
      allocation.status ===
        "completed" ||
      allocation.status ===
        "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş tahsis serbest bırakılamaz.",
      );
    }

    if (
      allocation
        .inventoryReservationId !==
        undefined &&
      this.reservationGateway
        ?.release
    ) {
      await this.reservationGateway
        .release({
          allocation,
          inventoryReservationId:
            allocation
              .inventoryReservationId,
          releasedBy,
        });
    }

    const timestamp = this.now();

    const updated =
      await this.repository
        .saveAllocation({
          ...allocation,
          status: "released",
          remainingQuantity:
            Math.max(
              0,
              allocation
                .allocatedQuantity -
                allocation
                  .transferredQuantity,
            ),
          updatedAt: timestamp,
        });

    await this.refreshItemAllocationTotals(
      replenishment.tenantId,
      replenishment.id,
    );

    return updated;
  }

  async cancel(input: {
    tenantId: string;
    replenishmentId: string;
    allocationId: string;
    reason: string;
  }): Promise<ReplenishmentAllocation> {
    const replenishment =
      await this.requireReplenishment(
        input.tenantId,
        input.replenishmentId,
      );

    const allocation =
      this.requireAllocation(
        replenishment,
        input.allocationId,
      );

    this.requireText(
      input.reason,
      "Tahsis iptal nedeni",
    );

    if (
      allocation.status ===
      "completed"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış tahsis iptal edilemez.",
      );
    }

    if (
      allocation.status ===
      "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tahsis daha önce iptal edilmiş.",
      );
    }

    const updated =
      await this.repository
        .saveAllocation({
          ...allocation,
          status: "cancelled",
          updatedAt: this.now(),
        });

    await this.refreshItemAllocationTotals(
      replenishment.tenantId,
      replenishment.id,
    );

    return updated;
  }

  async list(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentAllocation[]> {
    await this.requireReplenishment(
      tenantId,
      replenishmentId,
    );

    return this.repository
      .listAllocations(
        tenantId,
        replenishmentId,
      );
  }

  private async refreshItemAllocationTotals(
    tenantId: string,
    replenishmentId: string,
  ): Promise<void> {
    const replenishment =
      await this.requireReplenishment(
        tenantId,
        replenishmentId,
      );

    const allocations =
      await this.repository
        .listAllocations(
          tenantId,
          replenishmentId,
        );

    for (const item of replenishment.items) {
      const activeAllocations =
        allocations.filter(
          (allocation) =>
            allocation
              .replenishmentItemId ===
              item.id &&
            allocation.status !==
              "cancelled" &&
            allocation.status !==
              "released",
        );

      const allocatedQuantity =
        this.round(
          activeAllocations.reduce(
            (total, allocation) =>
              total +
              allocation
                .allocatedQuantity,
            0,
          ),
        );

      const transferredQuantity =
        this.round(
          activeAllocations.reduce(
            (total, allocation) =>
              total +
              allocation
                .transferredQuantity,
            0,
          ),
        );

      const remainingQuantity =
        this.round(
          Math.max(
            0,
            item.requestedQuantity -
              transferredQuantity,
          ),
        );

      const status =
        transferredQuantity >=
        item.requestedQuantity
          ? "completed"
          : allocatedQuantity > 0
            ? "allocated"
            : "pending";

      await this.repository.saveItem({
        ...item,
        allocatedQuantity,
        transferredQuantity,
        remainingQuantity,
        status,
        updatedAt: this.now(),
        ...(status === "completed"
          ? {
              completedAt:
                item.completedAt ??
                this.now(),
            }
          : {}),
      });
    }
  }

  private async refreshItemTransferTotals(
    tenantId: string,
    replenishmentId: string,
    replenishmentItemId: string,
  ): Promise<void> {
    const replenishment =
      await this.requireReplenishment(
        tenantId,
        replenishmentId,
      );

    const item =
      this.requireItem(
        replenishment,
        replenishmentItemId,
      );

    const allocations =
      (
        await this.repository
          .listAllocations(
            tenantId,
            replenishmentId,
          )
      ).filter(
        (allocation) =>
          allocation
            .replenishmentItemId ===
          item.id,
      );

    const allocatedQuantity =
      this.round(
        allocations
          .filter(
            (allocation) =>
              allocation.status !==
                "cancelled" &&
              allocation.status !==
                "released",
          )
          .reduce(
            (total, allocation) =>
              total +
              allocation
                .allocatedQuantity,
            0,
          ),
      );

    const transferredQuantity =
      this.round(
        allocations.reduce(
          (total, allocation) =>
            total +
            allocation
              .transferredQuantity,
          0,
        ),
      );

    const remainingQuantity =
      this.round(
        Math.max(
          0,
          item.requestedQuantity -
            transferredQuantity,
        ),
      );

    const completed =
      remainingQuantity === 0;

    await this.repository.saveItem({
      ...item,
      allocatedQuantity,
      transferredQuantity,
      remainingQuantity,
      status: completed
        ? "completed"
        : transferredQuantity > 0
          ? "partially_completed"
          : "in_progress",
      updatedAt: this.now(),
      ...(completed
        ? {
            completedAt:
              item.completedAt ??
              this.now(),
          }
        : {}),
      ...(item.startedAt !== undefined
        ? {}
        : {
            startedAt:
              this.now(),
          }),
    });
  }

  private validateAllocationAgainstItem(
    allocation:
      ReplenishmentAllocation,
    item: ReplenishmentItem,
  ): void {
    if (
      allocation.destinationLocationId !==
      item.destinationLocationId
    ) {
      throw new InventoryValidationError(
        "Tahsis hedef lokasyonu ikmal satırıyla uyuşmuyor.",
      );
    }

    if (
      allocation.productId !==
      item.productId
    ) {
      throw new InventoryValidationError(
        "Tahsis ürünü ikmal satırıyla uyuşmuyor.",
      );
    }

    if (
      allocation.skuId !== item.skuId
    ) {
      throw new InventoryValidationError(
        "Tahsis SKU bilgisi ikmal satırıyla uyuşmuyor.",
      );
    }

    if (
      allocation.stockStatus !==
      item.stockStatus
    ) {
      throw new InventoryValidationError(
        "Tahsis stok durumu ikmal satırıyla uyuşmuyor.",
      );
    }

    if (
      allocation.unit !== item.unit
    ) {
      throw new InventoryValidationError(
        "Tahsis ölçü birimi ikmal satırıyla uyuşmuyor.",
      );
    }
  }

  private async requireReplenishment(
    tenantId: string,
    replenishmentId: string,
  ): Promise<Replenishment> {
    const normalizedTenantId =
      this.requireText(
        tenantId,
        "Firma kimliği",
      );

    const normalizedReplenishmentId =
      this.requireText(
        replenishmentId,
        "İkmal kimliği",
      );

    const replenishment =
      await this.repository.findById(
        normalizedTenantId,
        normalizedReplenishmentId,
      );

    if (!replenishment) {
      throw new InventoryValidationError(
        `İkmal kaydı bulunamadı: ${normalizedReplenishmentId}`,
      );
    }

    return replenishment;
  }

  private requireItem(
    replenishment: Replenishment,
    itemId: string,
  ): ReplenishmentItem {
    const item =
      replenishment.items.find(
        (current) =>
          current.id === itemId,
      );

    if (!item) {
      throw new InventoryValidationError(
        `İkmal satırı bulunamadı: ${itemId}`,
      );
    }

    return item;
  }

  private requireAllocation(
    replenishment: Replenishment,
    allocationId: string,
  ): ReplenishmentAllocation {
    const normalizedAllocationId =
      this.requireText(
        allocationId,
        "Tahsis kimliği",
      );

    const allocation =
      replenishment.allocations.find(
        (current) =>
          current.id ===
          normalizedAllocationId,
      );

    if (!allocation) {
      throw new InventoryValidationError(
        `İkmal tahsisi bulunamadı: ${normalizedAllocationId}`,
      );
    }

    return allocation;
  }

  private requireText(
    value: unknown,
    fieldName: string,
  ): string {
    if (typeof value !== "string") {
      throw new InventoryValidationError(
        `${fieldName} metin olmalıdır.`,
      );
    }

    const normalized =
      value.trim();

    if (!normalized) {
      throw new InventoryValidationError(
        `${fieldName} boş bırakılamaz.`,
      );
    }

    return normalized;
  }

  private requirePositiveNumber(
    value: unknown,
    fieldName: string,
  ): number {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      throw new InventoryValidationError(
        `${fieldName} sıfırdan büyük olmalıdır.`,
      );
    }

    return value;
  }

  private round(
    value: number,
  ): number {
    return Math.round(
      (
        value +
        Number.EPSILON
      ) * 10000,
    ) / 10000;
  }
}
