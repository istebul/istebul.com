import type {
  WaveAllocation,
} from "../types/WaveAllocation";
import type {
  WaveItem,
} from "../types/WaveItem";
import type {
  InventoryTracking,
} from "../types/InventoryMovement";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  WaveRepository,
} from "./WaveRepository";

export const WAVE_ALLOCATION_STRATEGIES = [
  "fifo",
  "fefo",
  "location_priority",
  "quantity_descending",
  "balanced",
] as const;

export type WaveAllocationStrategy =
  (typeof WAVE_ALLOCATION_STRATEGIES)[number];

export interface WaveInventoryCandidate {
  readonly tenantId: string;
  readonly warehouseId: string;
  readonly locationId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly inventoryBalanceId?: string;
  readonly inventoryReservationId?: string;
  readonly stockStatus: string;
  readonly unit: string;
  readonly availableQuantity: number;
  readonly locationPriority?: number;
  readonly distanceScore?: number;
  readonly receivedAt?: string;
  readonly expiresAt?: string;
  readonly equipmentCompatible?: boolean;
  readonly blocked?: boolean;
  readonly tracking?: InventoryTracking;
}

export interface AllocateWaveItemInput {
  readonly tenantId: string;
  readonly waveId: string;
  readonly waveItemId: string;
  readonly candidates:
    readonly WaveInventoryCandidate[];
  readonly strategy?: WaveAllocationStrategy;
  readonly allowPartial?: boolean;
}

export interface WaveCandidateEvaluation {
  readonly candidate:
    WaveInventoryCandidate;
  readonly eligible: boolean;
  readonly score: number;
  readonly availableQuantity: number;
  readonly rejectionReasons:
    readonly string[];
  readonly warnings:
    readonly string[];
}

export interface WaveItemAllocationResult {
  readonly item: WaveItem;
  readonly allocations:
    readonly WaveAllocation[];
  readonly existingAllocations:
    readonly WaveAllocation[];
  readonly evaluations:
    readonly WaveCandidateEvaluation[];
  readonly requestedQuantity: number;
  readonly previouslyAllocatedQuantity: number;
  readonly newlyAllocatedQuantity: number;
  readonly totalAllocatedQuantity: number;
  readonly shortQuantity: number;
  readonly fullyAllocated: boolean;
  readonly generatedAt: string;
}

export interface WaveAllocationSummary {
  readonly allocationCount: number;
  readonly allocatedItemCount: number;
  readonly shortItemCount: number;
  readonly requestedQuantity: number;
  readonly allocatedQuantity: number;
  readonly pickedQuantity: number;
  readonly shortQuantity: number;
  readonly allocationRate: number;
  readonly pickCompletionRate: number;
  readonly uniqueLocationCount: number;
}

export interface WaveAllocationServiceDependencies {
  readonly repository: WaveRepository;
  readonly now?: () => string;
  readonly idFactory?: () => string;
}

interface NormalizedCandidate {
  readonly candidate:
    WaveInventoryCandidate;
  readonly receivedTimestamp?: number;
  readonly expirationTimestamp?: number;
}

export class WaveAllocationService {
  private readonly repository:
    WaveRepository;

  private readonly now: () => string;

  private readonly idFactory:
    () => string;

  constructor(
    dependencies:
      WaveAllocationServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());

    this.idFactory =
      dependencies.idFactory ??
      (() =>
        `wave-allocation-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 12)}`);
  }

  async allocate(
    input: AllocateWaveItemInput,
  ): Promise<WaveItemAllocationResult> {
    const tenantId =
      this.requireText(
        input.tenantId,
        "Firma kimliği",
      );

    const waveId =
      this.requireText(
        input.waveId,
        "Dalga kimliği",
      );

    const waveItemId =
      this.requireText(
        input.waveItemId,
        "Dalga satırı kimliği",
      );

    const strategy =
      input.strategy ??
      "balanced";

    if (
      !WAVE_ALLOCATION_STRATEGIES.includes(
        strategy,
      )
    ) {
      throw new InventoryValidationError(
        "Dalga tahsis stratejisi geçersiz.",
      );
    }

    if (
      !Array.isArray(
        input.candidates,
      )
    ) {
      throw new InventoryValidationError(
        "Stok adayları liste olmalıdır.",
      );
    }

    const wave =
      await this.repository.findById(
        tenantId,
        waveId,
      );

    if (!wave) {
      throw new InventoryValidationError(
        `Dalga kaydı bulunamadı: ${waveId}`,
      );
    }

    if (
      wave.status === "completed" ||
      wave.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş dalgada tahsis yapılamaz.",
      );
    }

    const items =
      await this.repository.listItems(
        tenantId,
        waveId,
      );

    const item =
      items.find(
        (current) =>
          current.id === waveItemId,
      );

    if (!item) {
      throw new InventoryValidationError(
        `Dalga satırı bulunamadı: ${waveItemId}`,
      );
    }

    this.validateAllocatableItem(
      item,
    );

    if (
      item.warehouseId !==
      wave.warehouseId
    ) {
      throw new InventoryValidationError(
        "Dalga satırı deposu ile dalga deposu uyuşmuyor.",
      );
    }

    const existingAllocations =
      (
        await this.repository
          .listAllocations(
            tenantId,
            waveId,
          )
      ).filter(
        (allocation) =>
          allocation.waveItemId ===
            item.id &&
          allocation.status !==
            "cancelled",
      );

    const previouslyAllocatedQuantity =
      this.round(
        existingAllocations.reduce(
          (total, allocation) =>
            total +
            allocation
              .allocatedQuantity,
          0,
        ),
      );

    const remainingRequiredQuantity =
      this.round(
        Math.max(
          0,
          item.requestedQuantity -
            previouslyAllocatedQuantity,
        ),
      );

    const generatedAt =
      this.normalizeDate(
        this.now(),
        "Tahsis oluşturma tarihi",
      );

    if (
      remainingRequiredQuantity === 0
    ) {
      const updatedItem =
        this.buildUpdatedItem({
          item,
          totalAllocatedQuantity:
            previouslyAllocatedQuantity,
          generatedAt,
        });

      return {
        item: updatedItem,
        allocations: [],
        existingAllocations,
        evaluations: [],
        requestedQuantity:
          item.requestedQuantity,
        previouslyAllocatedQuantity,
        newlyAllocatedQuantity: 0,
        totalAllocatedQuantity:
          previouslyAllocatedQuantity,
        shortQuantity: 0,
        fullyAllocated: true,
        generatedAt,
      };
    }

    const evaluations =
      input.candidates.map(
        (candidate) =>
          this.evaluateCandidate({
            candidate,
            item,
            strategy,
            evaluatedAt:
              generatedAt,
          }),
      );

    const eligibleEvaluations =
      evaluations
        .filter(
          (evaluation) =>
            evaluation.eligible,
        )
        .sort(
          (left, right) =>
            right.score -
              left.score ||
            right.availableQuantity -
              left.availableQuantity ||
            left.candidate.locationId
              .localeCompare(
                right.candidate
                  .locationId,
                "tr",
                { numeric: true },
              ),
        );

    const allocations:
      WaveAllocation[] = [];

    let remainingQuantity =
      remainingRequiredQuantity;

    let sequence =
      existingAllocations.length + 1;

    for (
      const evaluation
      of eligibleEvaluations
    ) {
      if (remainingQuantity <= 0) {
        break;
      }

      const allocatedQuantity =
        this.round(
          Math.min(
            remainingQuantity,
            evaluation
              .availableQuantity,
          ),
        );

      if (allocatedQuantity <= 0) {
        continue;
      }

      const candidate =
        evaluation.candidate;

      const allocation:
        WaveAllocation = {
        id: this.requireText(
          this.idFactory(),
          "Tahsis kimliği",
        ),
        tenantId,
        waveId,
        waveOrderId:
          item.waveOrderId,
        waveItemId:
          item.id,
        warehouseId:
          item.warehouseId,
        sourceLocationId:
          candidate.locationId,
        productId:
          item.productId,
        stockStatus:
          item.stockStatus,
        unit: item.unit,
        allocatedQuantity,
        pickedQuantity: 0,
        shortQuantity: 0,
        remainingQuantity:
          allocatedQuantity,
        sequence,
        score:
          evaluation.score,
        status: "planned",
        createdAt: generatedAt,
        updatedAt: generatedAt,
        ...(item.destinationLocationId !==
        undefined
          ? {
              destinationLocationId:
                item
                  .destinationLocationId,
            }
          : {}),
        ...(candidate.skuId !==
        undefined
          ? {
              skuId:
                candidate.skuId,
            }
          : {}),
        ...(candidate
          .inventoryBalanceId !==
        undefined
          ? {
              inventoryBalanceId:
                candidate
                  .inventoryBalanceId,
            }
          : {}),
        ...(candidate
          .inventoryReservationId !==
        undefined
          ? {
              inventoryReservationId:
                candidate
                  .inventoryReservationId,
            }
          : {}),
        ...(candidate.tracking !==
        undefined
          ? {
              tracking:
                structuredClone(
                  candidate.tracking,
                ),
            }
          : {}),
      };

      allocations.push(
        allocation,
      );

      remainingQuantity =
        this.round(
          remainingQuantity -
            allocatedQuantity,
        );

      sequence += 1;
    }

    const newlyAllocatedQuantity =
      this.round(
        allocations.reduce(
          (total, allocation) =>
            total +
            allocation
              .allocatedQuantity,
          0,
        ),
      );

    const totalAllocatedQuantity =
      this.round(
        previouslyAllocatedQuantity +
          newlyAllocatedQuantity,
      );

    const shortQuantity =
      this.round(
        Math.max(
          0,
          item.requestedQuantity -
            totalAllocatedQuantity,
        ),
      );

    if (
      shortQuantity > 0 &&
      input.allowPartial === false
    ) {
      throw new InventoryValidationError(
        `Dalga satırı tamamen tahsis edilemedi. Eksik miktar: ${shortQuantity}.`,
      );
    }

    const updatedItem =
      this.buildUpdatedItem({
        item,
        totalAllocatedQuantity,
        generatedAt,
      });

    return {
      item: updatedItem,
      allocations,
      existingAllocations,
      evaluations,
      requestedQuantity:
        item.requestedQuantity,
      previouslyAllocatedQuantity,
      newlyAllocatedQuantity,
      totalAllocatedQuantity,
      shortQuantity,
      fullyAllocated:
        shortQuantity === 0,
      generatedAt,
    };
  }

  async allocateAndSave(
    input: AllocateWaveItemInput,
  ): Promise<WaveItemAllocationResult> {
    const result =
      await this.allocate(input);

    for (
      const allocation
      of result.allocations
    ) {
      await this.repository
        .saveAllocation(
          allocation,
        );
    }

    const savedItem =
      await this.repository
        .saveItem(
          result.item,
        );

    return {
      ...result,
      item: savedItem,
    };
  }

  evaluateCandidate(input: {
    candidate:
      WaveInventoryCandidate;
    item: WaveItem;
    strategy:
      WaveAllocationStrategy;
    evaluatedAt?: string;
  }): WaveCandidateEvaluation {
    const evaluatedAt =
      this.normalizeDate(
        input.evaluatedAt ??
          this.now(),
        "Stok adayı değerlendirme tarihi",
      );

    const normalized =
      this.normalizeCandidate(
        input.candidate,
      );

    const candidate =
      normalized.candidate;

    const rejectionReasons:
      string[] = [];

    const warnings:
      string[] = [];

    if (
      candidate.tenantId !==
      input.item.tenantId
    ) {
      rejectionReasons.push(
        "Stok adayı farklı firmaya aittir.",
      );
    }

    if (
      candidate.warehouseId !==
      input.item.warehouseId
    ) {
      rejectionReasons.push(
        "Stok adayı farklı depoya aittir.",
      );
    }

    if (
      candidate.productId !==
      input.item.productId
    ) {
      rejectionReasons.push(
        "Stok adayının ürünü dalga satırıyla uyuşmuyor.",
      );
    }

    if (
      input.item.skuId !==
        undefined &&
      candidate.skuId !==
        input.item.skuId
    ) {
      rejectionReasons.push(
        "Stok adayının SKU bilgisi dalga satırıyla uyuşmuyor.",
      );
    }

    if (
      candidate.stockStatus !==
      input.item.stockStatus
    ) {
      rejectionReasons.push(
        "Stok adayının stok durumu dalga satırıyla uyuşmuyor.",
      );
    }

    if (
      candidate.unit !==
      input.item.unit
    ) {
      rejectionReasons.push(
        "Stok adayının ölçü birimi dalga satırıyla uyuşmuyor.",
      );
    }

    if (
      candidate.availableQuantity <=
      0
    ) {
      rejectionReasons.push(
        "Stok adayında kullanılabilir miktar bulunmuyor.",
      );
    }

    if (
      candidate.blocked === true
    ) {
      rejectionReasons.push(
        "Stok adayı kullanıma kapalıdır.",
      );
    }

    if (
      candidate.equipmentCompatible ===
      false
    ) {
      rejectionReasons.push(
        "Stok adayı mevcut ekipmanla uyumlu değildir.",
      );
    }

    const evaluatedTimestamp =
      Date.parse(evaluatedAt);

    if (
      normalized.expirationTimestamp !==
        undefined &&
      normalized.expirationTimestamp <=
        evaluatedTimestamp
    ) {
      rejectionReasons.push(
        "Stok adayının son kullanma tarihi geçmiştir.",
      );
    } else if (
      normalized.expirationTimestamp !==
        undefined
    ) {
      const remainingHours =
        (
          normalized
            .expirationTimestamp -
          evaluatedTimestamp
        ) /
        (60 * 60 * 1000);

      if (remainingHours <= 24) {
        warnings.push(
          "Stok adayının son kullanma tarihine 24 saatten az süre kalmıştır.",
        );
      }
    }

    const score =
      rejectionReasons.length > 0
        ? 0
        : this.calculateCandidateScore({
            candidate,
            strategy:
              input.strategy,
            evaluatedAt,
          });

    return {
      candidate:
        structuredClone(
          candidate,
        ),
      eligible:
        rejectionReasons.length === 0,
      score,
      availableQuantity:
        candidate.availableQuantity,
      rejectionReasons,
      warnings,
    };
  }

  calculateCandidateScore(input: {
    candidate:
      WaveInventoryCandidate;
    strategy:
      WaveAllocationStrategy;
    evaluatedAt?: string;
  }): number {
    if (
      !WAVE_ALLOCATION_STRATEGIES.includes(
        input.strategy,
      )
    ) {
      throw new InventoryValidationError(
        "Dalga tahsis stratejisi geçersiz.",
      );
    }

    const normalized =
      this.normalizeCandidate(
        input.candidate,
      );

    const evaluatedAt =
      this.normalizeDate(
        input.evaluatedAt ??
          this.now(),
        "Stok adayı puanlama tarihi",
      );

    const evaluatedTimestamp =
      Date.parse(evaluatedAt);

    const locationScore =
      this.locationPriorityScore(
        normalized.candidate
          .locationPriority,
      );

    const quantityScore =
      this.quantityScore(
        normalized.candidate
          .availableQuantity,
      );

    const distanceScore =
      normalized.candidate
        .distanceScore ?? 50;

    const fifoScore =
      this.fifoScore(
        normalized.receivedTimestamp,
        evaluatedTimestamp,
      );

    const fefoScore =
      this.fefoScore(
        normalized
          .expirationTimestamp,
        evaluatedTimestamp,
      );

    let score: number;

    switch (input.strategy) {
      case "fifo":
        score =
          fifoScore * 0.55 +
          locationScore * 0.2 +
          quantityScore * 0.15 +
          distanceScore * 0.1;
        break;

      case "fefo":
        score =
          fefoScore * 0.6 +
          locationScore * 0.15 +
          quantityScore * 0.15 +
          distanceScore * 0.1;
        break;

      case "location_priority":
        score =
          locationScore * 0.6 +
          distanceScore * 0.2 +
          quantityScore * 0.15 +
          fifoScore * 0.05;
        break;

      case "quantity_descending":
        score =
          quantityScore * 0.65 +
          locationScore * 0.15 +
          distanceScore * 0.1 +
          fifoScore * 0.1;
        break;

      case "balanced":
        score =
          locationScore * 0.25 +
          distanceScore * 0.2 +
          quantityScore * 0.2 +
          fifoScore * 0.15 +
          fefoScore * 0.2;
        break;
    }

    return this.clampScore(
      score,
    );
  }

  summarize(
    allocations:
      readonly WaveAllocation[],
    items:
      readonly WaveItem[] = [],
  ): WaveAllocationSummary {
    const activeAllocations =
      allocations.filter(
        (allocation) =>
          allocation.status !==
          "cancelled",
      );

    const requestedQuantity =
      this.round(
        items.reduce(
          (total, item) =>
            total +
            item.requestedQuantity,
          0,
        ),
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

    const pickedQuantity =
      this.round(
        activeAllocations.reduce(
          (total, allocation) =>
            total +
            allocation
              .pickedQuantity,
          0,
        ),
      );

    const shortQuantity =
      this.round(
        items.length > 0
          ? items.reduce(
              (total, item) =>
                total +
                item.shortQuantity,
              0,
            )
          : activeAllocations.reduce(
              (total, allocation) =>
                total +
                allocation
                  .shortQuantity,
              0,
            ),
      );

    const allocatedItemIds =
      new Set(
        activeAllocations.map(
          (allocation) =>
            allocation.waveItemId,
        ),
      );

    const shortItemCount =
      items.filter(
        (item) =>
          item.shortQuantity > 0,
      ).length;

    const uniqueLocationCount =
      new Set(
        activeAllocations.map(
          (allocation) =>
            allocation
              .sourceLocationId,
        ),
      ).size;

    return {
      allocationCount:
        activeAllocations.length,
      allocatedItemCount:
        allocatedItemIds.size,
      shortItemCount,
      requestedQuantity,
      allocatedQuantity,
      pickedQuantity,
      shortQuantity,
      allocationRate:
        this.calculateRate(
          allocatedQuantity,
          requestedQuantity,
        ),
      pickCompletionRate:
        this.calculateRate(
          pickedQuantity,
          allocatedQuantity,
        ),
      uniqueLocationCount,
    };
  }

  private buildUpdatedItem(input: {
    item: WaveItem;
    totalAllocatedQuantity: number;
    generatedAt: string;
  }): WaveItem {
    const allocatedQuantity =
      this.round(
        Math.min(
          input.item
            .requestedQuantity,
          input
            .totalAllocatedQuantity,
        ),
      );

    const shortQuantity =
      this.round(
        Math.max(
          0,
          input.item
            .requestedQuantity -
            allocatedQuantity,
        ),
      );

    const remainingQuantity =
      this.round(
        Math.max(
          0,
          input.item
            .requestedQuantity -
            input.item
              .pickedQuantity,
        ),
      );

    return {
      ...input.item,
      allocatedQuantity,
      shortQuantity,
      remainingQuantity,
      status:
        shortQuantity === 0
          ? "allocated"
          : allocatedQuantity > 0
            ? "short"
            : "short",
      updatedAt:
        input.generatedAt,
    };
  }

  private validateAllocatableItem(
    item: WaveItem,
  ): void {
    const blockedStatuses =
      new Set([
        "released",
        "in_progress",
        "partially_picked",
        "picked",
        "cancelled",
      ]);

    if (
      blockedStatuses.has(
        item.status,
      )
    ) {
      throw new InventoryValidationError(
        `Dalga satırı mevcut durumda tahsis edilemez: ${item.status}.`,
      );
    }

    if (
      !Number.isFinite(
        item.requestedQuantity,
      ) ||
      item.requestedQuantity <= 0
    ) {
      throw new InventoryValidationError(
        "Dalga satırı talep miktarı sıfırdan büyük olmalıdır.",
      );
    }
  }

  private normalizeCandidate(
    candidate:
      WaveInventoryCandidate,
  ): NormalizedCandidate {
    const tenantId =
      this.requireText(
        candidate.tenantId,
        "Stok adayı firma kimliği",
      );

    const warehouseId =
      this.requireText(
        candidate.warehouseId,
        "Stok adayı depo kimliği",
      );

    const locationId =
      this.requireText(
        candidate.locationId,
        "Stok adayı lokasyon kimliği",
      );

    const productId =
      this.requireText(
        candidate.productId,
        "Stok adayı ürün kimliği",
      );

    const stockStatus =
      this.requireText(
        candidate.stockStatus,
        "Stok adayı stok durumu",
      );

    const unit =
      this.requireText(
        candidate.unit,
        "Stok adayı ölçü birimi",
      );

    const availableQuantity =
      this.requireNonNegativeNumber(
        candidate.availableQuantity,
        "Stok adayı kullanılabilir miktarı",
      );

    const locationPriority =
      candidate.locationPriority ===
        undefined
        ? undefined
        : this.requireNonNegativeNumber(
            candidate
              .locationPriority,
            "Lokasyon önceliği",
          );

    const distanceScore =
      candidate.distanceScore ===
        undefined
        ? undefined
        : this.requireScore(
            candidate.distanceScore,
            "Lokasyon mesafe puanı",
          );

    const receivedTimestamp =
      this.optionalTimestamp(
        candidate.receivedAt,
        "Stok kabul tarihi",
      );

    const expirationTimestamp =
      this.optionalTimestamp(
        candidate.expiresAt,
        "Stok son kullanma tarihi",
      );

    return {
      candidate: {
        tenantId,
        warehouseId,
        locationId,
        productId,
        stockStatus,
        unit,
        availableQuantity,
        ...(candidate.skuId !==
        undefined
          ? {
              skuId:
                this.requireText(
                  candidate.skuId,
                  "Stok adayı SKU kimliği",
                ),
            }
          : {}),
        ...(candidate
          .inventoryBalanceId !==
        undefined
          ? {
              inventoryBalanceId:
                this.requireText(
                  candidate
                    .inventoryBalanceId,
                  "Envanter bakiye kimliği",
                ),
            }
          : {}),
        ...(candidate
          .inventoryReservationId !==
        undefined
          ? {
              inventoryReservationId:
                this.requireText(
                  candidate
                    .inventoryReservationId,
                  "Envanter rezervasyon kimliği",
                ),
            }
          : {}),
        ...(locationPriority !==
        undefined
          ? {
              locationPriority,
            }
          : {}),
        ...(distanceScore !==
        undefined
          ? {
              distanceScore,
            }
          : {}),
        ...(receivedTimestamp !==
        undefined
          ? {
              receivedAt:
                new Date(
                  receivedTimestamp,
                ).toISOString(),
            }
          : {}),
        ...(expirationTimestamp !==
        undefined
          ? {
              expiresAt:
                new Date(
                  expirationTimestamp,
                ).toISOString(),
            }
          : {}),
        ...(candidate
          .equipmentCompatible !==
        undefined
          ? {
              equipmentCompatible:
                candidate
                  .equipmentCompatible,
            }
          : {}),
        ...(candidate.blocked !==
        undefined
          ? {
              blocked:
                candidate.blocked,
            }
          : {}),
        ...(candidate.tracking !==
        undefined
          ? {
              tracking:
                structuredClone(
                  candidate.tracking,
                ),
            }
          : {}),
      },
      ...(receivedTimestamp !==
      undefined
        ? {
            receivedTimestamp,
          }
        : {}),
      ...(expirationTimestamp !==
      undefined
        ? {
            expirationTimestamp,
          }
        : {}),
    };
  }

  private fifoScore(
    receivedTimestamp:
      number | undefined,
    evaluatedTimestamp: number,
  ): number {
    if (
      receivedTimestamp === undefined
    ) {
      return 50;
    }

    const ageDays =
      Math.max(
        0,
        (
          evaluatedTimestamp -
          receivedTimestamp
        ) /
          (24 * 60 * 60 * 1000),
      );

    return this.clampScore(
      40 +
        Math.min(
          60,
          ageDays * 2,
        ),
    );
  }

  private fefoScore(
    expirationTimestamp:
      number | undefined,
    evaluatedTimestamp: number,
  ): number {
    if (
      expirationTimestamp ===
      undefined
    ) {
      return 50;
    }

    const remainingDays =
      (
        expirationTimestamp -
        evaluatedTimestamp
      ) /
      (24 * 60 * 60 * 1000);

    if (remainingDays <= 0) {
      return 0;
    }

    return this.clampScore(
      100 -
        Math.min(
          80,
          remainingDays * 2,
        ),
    );
  }

  private locationPriorityScore(
    priority:
      number | undefined,
  ): number {
    if (priority === undefined) {
      return 50;
    }

    return this.clampScore(
      100 - priority,
    );
  }

  private quantityScore(
    quantity: number,
  ): number {
    return this.clampScore(
      Math.min(
        100,
        25 +
          Math.log10(
            quantity + 1,
          ) *
            35,
      ),
    );
  }

  private calculateRate(
    numerator: number,
    denominator: number,
  ): number {
    if (denominator <= 0) {
      return 0;
    }

    return this.round(
      Math.min(
        100,
        Math.max(
          0,
          (
            numerator /
            denominator
          ) * 100,
        ),
      ),
    );
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

  private requireNonNegativeNumber(
    value: unknown,
    fieldName: string,
  ): number {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new InventoryValidationError(
        `${fieldName} sıfır veya daha büyük olmalıdır.`,
      );
    }

    return value;
  }

  private requireScore(
    value: unknown,
    fieldName: string,
  ): number {
    const normalized =
      this.requireNonNegativeNumber(
        value,
        fieldName,
      );

    if (normalized > 100) {
      throw new InventoryValidationError(
        `${fieldName} 100 değerini aşamaz.`,
      );
    }

    return normalized;
  }

  private optionalTimestamp(
    value: string | undefined,
    fieldName: string,
  ): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    const timestamp =
      Date.parse(value);

    if (Number.isNaN(timestamp)) {
      throw new InventoryValidationError(
        `${fieldName} geçerli bir tarih olmalıdır.`,
      );
    }

    return timestamp;
  }

  private normalizeDate(
    value: string,
    fieldName: string,
  ): string {
    const timestamp =
      Date.parse(value);

    if (Number.isNaN(timestamp)) {
      throw new InventoryValidationError(
        `${fieldName} geçerli bir tarih olmalıdır.`,
      );
    }

    return new Date(
      timestamp,
    ).toISOString();
  }

  private clampScore(
    value: number,
  ): number {
    return this.round(
      Math.min(
        100,
        Math.max(0, value),
      ),
    );
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
