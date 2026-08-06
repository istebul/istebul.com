import type {
  CreateReplenishmentDemandInput,
  ReplenishmentDemand,
} from "../types/ReplenishmentDemand";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  ReplenishmentRepository,
} from "./ReplenishmentRepository";
import {
  validateCreateReplenishmentDemand,
} from "./ReplenishmentValidator";

export interface ReplenishmentDemandSummary {
  readonly totalDemands: number;
  readonly totalCurrentQuantity: number;
  readonly totalOrderDemandQuantity: number;
  readonly totalForecastDemandQuantity: number;
  readonly totalSafetyStockQuantity: number;
  readonly totalRequiredQuantity: number;
  readonly urgentDemandCount: number;
  readonly averageUrgencyScore: number;
}

export interface ReplenishmentDemandServiceDependencies {
  repository: ReplenishmentRepository;
  createId?: () => string;
  now?: () => string;
}

let internalSequence = 0;

export class ReplenishmentDemandService {
  private readonly repository:
    ReplenishmentRepository;

  private readonly createId: () => string;

  private readonly now: () => string;

  constructor(
    dependencies:
      ReplenishmentDemandServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.createId =
      dependencies.createId ??
      (() =>
        `replenishment-demand-${String(
          ++internalSequence,
        ).padStart(6, "0")}`);

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  async create(
    input: CreateReplenishmentDemandInput,
  ): Promise<ReplenishmentDemand> {
    const normalized =
      validateCreateReplenishmentDemand(
        input,
      );

    const replenishment =
      await this.repository.findById(
        normalized.tenantId,
        normalized.replenishmentId,
      );

    if (!replenishment) {
      throw new InventoryValidationError(
        `İkmal kaydı bulunamadı: ${normalized.replenishmentId}`,
      );
    }

    if (
      replenishment.warehouseId !==
      normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "İkmal talebi deposu ile ikmal kaydı deposu uyuşmuyor.",
      );
    }

    const requiredQuantity =
      this.calculateRequiredQuantity({
        currentQuantity:
          normalized.currentQuantity,
        orderDemandQuantity:
          normalized.orderDemandQuantity ??
          0,
        forecastDemandQuantity:
          normalized
            .forecastDemandQuantity ??
          0,
        safetyStockQuantity:
          normalized.safetyStockQuantity ??
          0,
        ...(normalized.minimumQuantity !==
        undefined
          ? {
              minimumQuantity:
                normalized.minimumQuantity,
            }
          : {}),
        ...(normalized.maximumQuantity !==
        undefined
          ? {
              maximumQuantity:
                normalized.maximumQuantity,
            }
          : {}),
      });

    const urgencyScore =
      this.calculateUrgencyScore({
        currentQuantity:
          normalized.currentQuantity,
        requiredQuantity,
        orderDemandQuantity:
          normalized.orderDemandQuantity ??
          0,
        ...(normalized.minimumQuantity !==
        undefined
          ? {
              minimumQuantity:
                normalized.minimumQuantity,
            }
          : {}),
        ...(normalized.requiredAt !==
        undefined
          ? {
              requiredAt:
                normalized.requiredAt,
            }
          : {}),
      });

    return this.repository.saveDemand({
      id: this.createId(),
      tenantId:
        normalized.tenantId,
      replenishmentId:
        normalized.replenishmentId,
      warehouseId:
        normalized.warehouseId,
      destinationLocationId:
        normalized.destinationLocationId,
      productId:
        normalized.productId,
      stockStatus:
        normalized.stockStatus,
      unit: normalized.unit,
      currentQuantity:
        normalized.currentQuantity,
      orderDemandQuantity:
        normalized.orderDemandQuantity ??
        0,
      forecastDemandQuantity:
        normalized
          .forecastDemandQuantity ??
        0,
      safetyStockQuantity:
        normalized.safetyStockQuantity ??
        0,
      requiredQuantity,
      urgencyScore,
      priority:
        normalized.priority ?? 50,
      source:
        structuredClone(
          normalized.source,
        ),
      createdAt: this.now(),
      ...(normalized.skuId !==
      undefined
        ? { skuId: normalized.skuId }
        : {}),
      ...(normalized.minimumQuantity !==
      undefined
        ? {
            minimumQuantity:
              normalized.minimumQuantity,
          }
        : {}),
      ...(normalized.maximumQuantity !==
      undefined
        ? {
            maximumQuantity:
              normalized.maximumQuantity,
          }
        : {}),
      ...(normalized.tracking !==
      undefined
        ? {
            tracking:
              structuredClone(
                normalized.tracking,
              ),
          }
        : {}),
      ...(normalized.requiredAt !==
      undefined
        ? {
            requiredAt:
              normalized.requiredAt,
          }
        : {}),
    });
  }

  calculateRequiredQuantity(input: {
    currentQuantity: number;
    orderDemandQuantity: number;
    forecastDemandQuantity: number;
    safetyStockQuantity: number;
    minimumQuantity?: number;
    maximumQuantity?: number;
  }): number {
    const demandTarget =
      input.orderDemandQuantity +
      input.forecastDemandQuantity +
      input.safetyStockQuantity;

    const minimumTarget =
      input.minimumQuantity ?? 0;

    const targetQuantity =
      Math.max(
        demandTarget,
        minimumTarget,
      );

    const cappedTarget =
      input.maximumQuantity ===
        undefined
        ? targetQuantity
        : Math.min(
            targetQuantity,
            input.maximumQuantity,
          );

    return this.round(
      Math.max(
        0,
        cappedTarget -
          input.currentQuantity,
      ),
    );
  }

  calculateUrgencyScore(input: {
    currentQuantity: number;
    requiredQuantity: number;
    orderDemandQuantity: number;
    minimumQuantity?: number;
    requiredAt?: string;
  }): number {
    let score = 0;

    if (
      input.minimumQuantity !== undefined &&
      input.currentQuantity <
        input.minimumQuantity
    ) {
      const deficit =
        input.minimumQuantity -
        input.currentQuantity;

      const ratio =
        input.minimumQuantity === 0
          ? 0
          : deficit /
            input.minimumQuantity;

      score += Math.min(
        40,
        ratio * 40,
      );
    }

    if (input.orderDemandQuantity > 0) {
      score += 25;
    }

    if (input.requiredQuantity > 0) {
      score += Math.min(
        20,
        input.requiredQuantity,
      );
    }

    if (input.requiredAt !== undefined) {
      const remainingMinutes =
        (
          Date.parse(input.requiredAt) -
          Date.parse(this.now())
        ) /
        (60 * 1000);

      if (remainingMinutes <= 0) {
        score += 15;
      } else if (
        remainingMinutes <= 60
      ) {
        score += 12;
      } else if (
        remainingMinutes <= 240
      ) {
        score += 8;
      } else if (
        remainingMinutes <= 1440
      ) {
        score += 4;
      }
    }

    return this.round(
      Math.min(
        100,
        Math.max(0, score),
      ),
    );
  }

  summarize(
    demands:
      readonly ReplenishmentDemand[],
  ): ReplenishmentDemandSummary {
    const totalDemands =
      demands.length;

    const totalCurrentQuantity =
      demands.reduce(
        (total, demand) =>
          total +
          demand.currentQuantity,
        0,
      );

    const totalOrderDemandQuantity =
      demands.reduce(
        (total, demand) =>
          total +
          demand.orderDemandQuantity,
        0,
      );

    const totalForecastDemandQuantity =
      demands.reduce(
        (total, demand) =>
          total +
          demand.forecastDemandQuantity,
        0,
      );

    const totalSafetyStockQuantity =
      demands.reduce(
        (total, demand) =>
          total +
          demand.safetyStockQuantity,
        0,
      );

    const totalRequiredQuantity =
      demands.reduce(
        (total, demand) =>
          total +
          demand.requiredQuantity,
        0,
      );

    const urgentDemandCount =
      demands.filter(
        (demand) =>
          demand.urgencyScore >= 70,
      ).length;

    const averageUrgencyScore =
      totalDemands === 0
        ? 0
        : this.round(
            demands.reduce(
              (total, demand) =>
                total +
                demand.urgencyScore,
              0,
            ) / totalDemands,
          );

    return {
      totalDemands,
      totalCurrentQuantity:
        this.round(
          totalCurrentQuantity,
        ),
      totalOrderDemandQuantity:
        this.round(
          totalOrderDemandQuantity,
        ),
      totalForecastDemandQuantity:
        this.round(
          totalForecastDemandQuantity,
        ),
      totalSafetyStockQuantity:
        this.round(
          totalSafetyStockQuantity,
        ),
      totalRequiredQuantity:
        this.round(
          totalRequiredQuantity,
        ),
      urgentDemandCount,
      averageUrgencyScore,
    };
  }

  async list(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentDemand[]> {
    const replenishment =
      await this.repository.findById(
        tenantId,
        replenishmentId,
      );

    if (!replenishment) {
      throw new InventoryValidationError(
        `İkmal kaydı bulunamadı: ${replenishmentId}`,
      );
    }

    return this.repository.listDemands(
      tenantId,
      replenishmentId,
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
