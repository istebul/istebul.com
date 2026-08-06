import type {
  WaveCapacity,
} from "../types/WaveCapacity";
import type {
  WaveOrder,
} from "../types/WaveOrder";
import type {
  WaveRule,
} from "../types/WaveRule";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";

export interface WaveOptimizationInput {
  readonly orders:
    readonly WaveOrder[];
  readonly rule?: WaveRule;
  readonly capacity?: WaveCapacity;
  readonly allowOverdueOrders?: boolean;
}

export interface WaveOptimizationLimits {
  readonly maximumOrders?: number;
  readonly maximumLines?: number;
  readonly maximumItems?: number;
  readonly maximumWeight?: number;
  readonly maximumVolume?: number;
  readonly maximumEstimatedMinutes?: number;
}

export interface WaveOptimizationTotals {
  readonly orderCount: number;
  readonly lineCount: number;
  readonly itemQuantity: number;
  readonly totalWeight: number;
  readonly totalVolume: number;
  readonly estimatedMinutes: number;
}

export interface WaveOptimizationUtilization {
  readonly orderUtilizationRate?: number;
  readonly lineUtilizationRate?: number;
  readonly itemUtilizationRate?: number;
  readonly weightUtilizationRate?: number;
  readonly volumeUtilizationRate?: number;
  readonly estimatedMinutesUtilizationRate?: number;
  readonly overallUtilizationRate: number;
}

export interface WaveOrderEvaluation {
  readonly order: WaveOrder;
  readonly eligible: boolean;
  readonly selected: boolean;
  readonly score: number;
  readonly estimatedMinutes: number;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];
  readonly rejectionReasons:
    readonly string[];
}

export interface WaveOptimizationResult {
  readonly selectedOrders:
    readonly WaveOrderEvaluation[];
  readonly rejectedOrders:
    readonly WaveOrderEvaluation[];
  readonly evaluations:
    readonly WaveOrderEvaluation[];
  readonly totals:
    WaveOptimizationTotals;
  readonly limits:
    WaveOptimizationLimits;
  readonly utilization:
    WaveOptimizationUtilization;
  readonly candidateOrderCount: number;
  readonly eligibleOrderCount: number;
  readonly selectedOrderCount: number;
  readonly rejectedOrderCount: number;
  readonly generatedAt: string;
}

export interface WaveOptimizerDependencies {
  readonly now?: () => string;
  readonly baseMinutesPerOrder?: number;
  readonly minutesPerLine?: number;
  readonly minutesPerItem?: number;
}

interface MutableWaveOptimizationTotals {
  orderCount: number;
  lineCount: number;
  itemQuantity: number;
  totalWeight: number;
  totalVolume: number;
  estimatedMinutes: number;
}

export class WaveOptimizer {
  private readonly now: () => string;

  private readonly baseMinutesPerOrder:
    number;

  private readonly minutesPerLine:
    number;

  private readonly minutesPerItem:
    number;

  constructor(
    dependencies:
      WaveOptimizerDependencies = {},
  ) {
    this.now =
      dependencies.now ??
      (() => new Date().toISOString());

    this.baseMinutesPerOrder =
      this.normalizeRate(
        dependencies.baseMinutesPerOrder,
        2,
        "Sipariş temel işlem süresi",
      );

    this.minutesPerLine =
      this.normalizeRate(
        dependencies.minutesPerLine,
        1.5,
        "Satır başına işlem süresi",
      );

    this.minutesPerItem =
      this.normalizeRate(
        dependencies.minutesPerItem,
        0.15,
        "Ürün başına işlem süresi",
      );
  }

  optimize(
    input: WaveOptimizationInput,
  ): WaveOptimizationResult {
    if (input.orders.length === 0) {
      throw new InventoryValidationError(
        "Optimize edilecek sipariş bulunamadı.",
      );
    }

    if (
      input.rule !== undefined &&
      !input.rule.active
    ) {
      throw new InventoryValidationError(
        "Pasif dalga kuralıyla optimizasyon yapılamaz.",
      );
    }

    if (
      input.rule !== undefined &&
      input.capacity !== undefined &&
      (
        input.rule.tenantId !==
          input.capacity.tenantId ||
        (
          input.rule.warehouseId !==
            undefined &&
          input.rule.warehouseId !==
            input.capacity.warehouseId
        )
      )
    ) {
      throw new InventoryValidationError(
        "Dalga kuralı ile kapasite kaydı aynı firma ve depoya ait olmalıdır.",
      );
    }

    const generatedAt = this.now();

    const limits =
      this.resolveLimits({
        ...(input.rule !== undefined
          ? {
              rule: input.rule,
            }
          : {}),
        ...(input.capacity !== undefined
          ? {
              capacity:
                input.capacity,
            }
          : {}),
      });

    const initialEvaluations =
      input.orders.map(
        (order) =>
          this.evaluateOrder({
            order,
            evaluatedAt:
              generatedAt,
            allowOverdueOrders:
              input.allowOverdueOrders ??
              false,
            ...(input.rule !== undefined
              ? {
                  rule: input.rule,
                }
              : {}),
          }),
      );

    const eligibleEvaluations =
      initialEvaluations
        .filter(
          (evaluation) =>
            evaluation.eligible,
        )
        .sort(
          (left, right) =>
            right.score -
              left.score ||
            this.dateSortValue(
              left.order.cutoffAt,
            ) -
              this.dateSortValue(
                right.order.cutoffAt,
              ) ||
            this.dateSortValue(
              left.order.promisedAt,
            ) -
              this.dateSortValue(
                right.order.promisedAt,
              ) ||
            left.order.orderNumber
              .localeCompare(
                right.order
                  .orderNumber,
                "tr",
                { numeric: true },
              ),
        );

    const totals:
      MutableWaveOptimizationTotals = {
        orderCount: 0,
        lineCount: 0,
        itemQuantity: 0,
        totalWeight: 0,
        totalVolume: 0,
        estimatedMinutes: 0,
      };

    const selectedOrders:
      WaveOrderEvaluation[] = [];

    const capacityRejected:
      WaveOrderEvaluation[] = [];

    for (
      const evaluation
      of eligibleEvaluations
    ) {
      const violations =
        this.findLimitViolations({
          totals,
          evaluation,
          limits,
        });

      if (violations.length > 0) {
        capacityRejected.push({
          ...evaluation,
          selected: false,
          rejectionReasons: [
            ...evaluation
              .rejectionReasons,
            ...violations,
          ],
        });

        continue;
      }

      this.addToTotals(
        totals,
        evaluation,
      );

      selectedOrders.push({
        ...evaluation,
        selected: true,
        reasons: [
          ...evaluation.reasons,
          "Sipariş dalga kapasitesi içinde seçildi.",
        ],
      });
    }

    const initiallyRejected =
      initialEvaluations
        .filter(
          (evaluation) =>
            !evaluation.eligible,
        )
        .map(
          (evaluation) => ({
            ...evaluation,
            selected: false,
          }),
        );

    const rejectedOrders = [
      ...initiallyRejected,
      ...capacityRejected,
    ];

    const evaluations = [
      ...selectedOrders,
      ...rejectedOrders,
    ].sort(
      (left, right) =>
        right.score -
          left.score ||
        left.order.orderNumber
          .localeCompare(
            right.order.orderNumber,
            "tr",
            { numeric: true },
          ),
    );

    const finalTotals:
      WaveOptimizationTotals = {
      orderCount:
        totals.orderCount,
      lineCount:
        totals.lineCount,
      itemQuantity:
        this.round(
          totals.itemQuantity,
        ),
      totalWeight:
        this.round(
          totals.totalWeight,
        ),
      totalVolume:
        this.round(
          totals.totalVolume,
        ),
      estimatedMinutes:
        this.round(
          totals.estimatedMinutes,
        ),
    };

    return {
      selectedOrders,
      rejectedOrders,
      evaluations,
      totals: finalTotals,
      limits,
      utilization:
        this.calculateUtilization({
          totals: finalTotals,
          limits,
        }),
      candidateOrderCount:
        input.orders.length,
      eligibleOrderCount:
        eligibleEvaluations.length,
      selectedOrderCount:
        selectedOrders.length,
      rejectedOrderCount:
        rejectedOrders.length,
      generatedAt,
    };
  }

  evaluateOrder(input: {
    order: WaveOrder;
    rule?: WaveRule;
    evaluatedAt?: string;
    allowOverdueOrders?: boolean;
  }): WaveOrderEvaluation {
    const evaluatedAt =
      input.evaluatedAt ??
      this.now();

    const nowTimestamp =
      Date.parse(evaluatedAt);

    if (
      Number.isNaN(nowTimestamp)
    ) {
      throw new InventoryValidationError(
        "Dalga değerlendirme tarihi geçersiz.",
      );
    }

    const reasons: string[] = [];
    const warnings: string[] = [];
    const rejectionReasons:
      string[] = [];

    const order = input.order;

    if (
      order.status !== "pending" &&
      order.status !== "eligible"
    ) {
      rejectionReasons.push(
        "Sipariş dalga seçimine uygun durumda değildir.",
      );
    }

    if (
      order.lineCount <= 0 ||
      !Number.isInteger(
        order.lineCount,
      )
    ) {
      rejectionReasons.push(
        "Sipariş satır sayısı sıfırdan büyük tam sayı olmalıdır.",
      );
    }

    if (
      !Number.isFinite(
        order.itemQuantity,
      ) ||
      order.itemQuantity <= 0
    ) {
      rejectionReasons.push(
        "Sipariş ürün miktarı sıfırdan büyük olmalıdır.",
      );
    }

    if (
      order.totalWeight !==
        undefined &&
      (
        !Number.isFinite(
          order.totalWeight,
        ) ||
        order.totalWeight < 0
      )
    ) {
      rejectionReasons.push(
        "Sipariş toplam ağırlığı geçersizdir.",
      );
    }

    if (
      order.totalVolume !==
        undefined &&
      (
        !Number.isFinite(
          order.totalVolume,
        ) ||
        order.totalVolume < 0
      )
    ) {
      rejectionReasons.push(
        "Sipariş toplam hacmi geçersizdir.",
      );
    }

    if (
      input.rule !== undefined
    ) {
      this.evaluateRuleCompatibility({
        order,
        rule: input.rule,
        reasons,
        rejectionReasons,
      });
    }

    const cutoffTimestamp =
      this.optionalTimestamp(
        order.cutoffAt,
        "Sipariş kesim tarihi",
      );

    if (
      cutoffTimestamp !== undefined
    ) {
      const minutesToCutoff =
        (
          cutoffTimestamp -
          nowTimestamp
        ) /
        (60 * 1000);

      if (minutesToCutoff < 0) {
        if (
          input.allowOverdueOrders ===
          true
        ) {
          warnings.push(
            "Sipariş kesim saati aşılmış olmasına rağmen değerlendirmeye dahil edildi.",
          );
        } else {
          rejectionReasons.push(
            "Sipariş kesim saati aşılmıştır.",
          );
        }
      } else if (
        minutesToCutoff <= 60
      ) {
        warnings.push(
          "Sipariş kesim saatine bir saatten az süre kalmıştır.",
        );
      } else if (
        minutesToCutoff <= 240
      ) {
        warnings.push(
          "Sipariş kesim saati yaklaşıyor.",
        );
      }
    }

    const promisedTimestamp =
      this.optionalTimestamp(
        order.promisedAt,
        "Taahhüt edilen teslim tarihi",
      );

    if (
      promisedTimestamp !== undefined &&
      promisedTimestamp <
        nowTimestamp
    ) {
      warnings.push(
        "Siparişin taahhüt edilen teslim tarihi geçmiştir.",
      );
    }

    const estimatedMinutes =
      this.estimateOrderMinutes(
        order,
      );

    const score =
      this.calculateOrderScore({
        order,
        evaluatedAt,
        ...(input.rule !== undefined
          ? {
              rule: input.rule,
            }
          : {}),
      });

    if (
      rejectionReasons.length === 0
    ) {
      reasons.push(
        "Sipariş temel dalga seçim koşullarını karşılıyor.",
      );

      if (order.priority >= 80) {
        reasons.push(
          "Sipariş yüksek önceliğe sahiptir.",
        );
      }

      if (
        order.cutoffAt !== undefined
      ) {
        reasons.push(
          "Sipariş kesim zamanı puanlamaya dahil edildi.",
        );
      }

      if (
        order.promisedAt !==
        undefined
      ) {
        reasons.push(
          "Teslim taahhüdü puanlamaya dahil edildi.",
        );
      }
    }

    return {
      order:
        structuredClone(order),
      eligible:
        rejectionReasons.length === 0,
      selected: false,
      score,
      estimatedMinutes,
      reasons,
      warnings,
      rejectionReasons,
    };
  }

  calculateOrderScore(input: {
    order: WaveOrder;
    rule?: WaveRule;
    evaluatedAt?: string;
  }): number {
    const evaluatedAt =
      input.evaluatedAt ??
      this.now();

    const nowTimestamp =
      Date.parse(evaluatedAt);

    if (
      Number.isNaN(nowTimestamp)
    ) {
      throw new InventoryValidationError(
        "Dalga puanlama tarihi geçersiz.",
      );
    }

    let score =
      this.clampScore(
        input.order.priority,
      ) * 0.5;

    const cutoffTimestamp =
      this.optionalTimestamp(
        input.order.cutoffAt,
        "Sipariş kesim tarihi",
      );

    if (
      cutoffTimestamp !== undefined
    ) {
      const minutes =
        (
          cutoffTimestamp -
          nowTimestamp
        ) /
        (60 * 1000);

      if (minutes <= 0) {
        score += 25;
      } else if (minutes <= 60) {
        score += 24;
      } else if (minutes <= 240) {
        score += 20;
      } else if (minutes <= 720) {
        score += 14;
      } else if (minutes <= 1440) {
        score += 9;
      } else {
        score += 4;
      }
    }

    const promisedTimestamp =
      this.optionalTimestamp(
        input.order.promisedAt,
        "Taahhüt edilen teslim tarihi",
      );

    if (
      promisedTimestamp !== undefined
    ) {
      const minutes =
        (
          promisedTimestamp -
          nowTimestamp
        ) /
        (60 * 1000);

      if (minutes <= 0) {
        score += 15;
      } else if (minutes <= 240) {
        score += 14;
      } else if (minutes <= 720) {
        score += 11;
      } else if (minutes <= 1440) {
        score += 8;
      } else {
        score += 3;
      }
    }

    const complexityScore =
      this.calculateComplexityScore(
        input.order,
      );

    score += complexityScore * 0.1;

    if (
      input.rule !== undefined
    ) {
      score +=
        this.calculateRuleMatchScore(
          input.order,
          input.rule,
        ) * 0.1;
    }

    return this.clampScore(score);
  }

  estimateOrderMinutes(
    order: WaveOrder,
  ): number {
    if (
      order.lineCount <= 0 ||
      order.itemQuantity <= 0
    ) {
      return 0;
    }

    return this.round(
      this.baseMinutesPerOrder +
        order.lineCount *
          this.minutesPerLine +
        order.itemQuantity *
          this.minutesPerItem,
    );
  }

  resolveLimits(input: {
    rule?: WaveRule;
    capacity?: WaveCapacity;
  }): WaveOptimizationLimits {
    const maximumOrders =
      this.minimumDefined(
        input.rule?.maximumOrders,
        input.capacity
          ?.availableOrderCapacity,
      );

    const maximumLines =
      this.minimumDefined(
        input.rule?.maximumLines,
        input.capacity
          ?.availableLineCapacity,
      );

    const maximumItems =
      this.minimumDefined(
        input.rule?.maximumItems,
        input.capacity
          ?.availableItemCapacity,
      );

    const maximumWeight =
      this.minimumDefined(
        input.rule?.maximumWeight,
        input.capacity
          ?.availableWeightCapacity,
      );

    const maximumVolume =
      this.minimumDefined(
        input.rule?.maximumVolume,
        input.capacity
          ?.availableVolumeCapacity,
      );

    const maximumEstimatedMinutes =
      this.minimumDefined(
        input.rule
          ?.maximumEstimatedMinutes,
        input.capacity
          ?.availableLaborMinutes,
      );

    return {
      ...(maximumOrders !== undefined
        ? {
            maximumOrders:
              Math.floor(
                maximumOrders,
              ),
          }
        : {}),
      ...(maximumLines !== undefined
        ? {
            maximumLines:
              Math.floor(
                maximumLines,
              ),
          }
        : {}),
      ...(maximumItems !== undefined
        ? {
            maximumItems,
          }
        : {}),
      ...(maximumWeight !== undefined
        ? {
            maximumWeight,
          }
        : {}),
      ...(maximumVolume !== undefined
        ? {
            maximumVolume,
          }
        : {}),
      ...(maximumEstimatedMinutes !==
      undefined
        ? {
            maximumEstimatedMinutes,
          }
        : {}),
    };
  }

  calculateUtilization(input: {
    totals: WaveOptimizationTotals;
    limits: WaveOptimizationLimits;
  }): WaveOptimizationUtilization {
    const rates: number[] = [];

    const orderUtilizationRate =
      this.optionalUtilizationRate(
        input.totals.orderCount,
        input.limits.maximumOrders,
      );

    const lineUtilizationRate =
      this.optionalUtilizationRate(
        input.totals.lineCount,
        input.limits.maximumLines,
      );

    const itemUtilizationRate =
      this.optionalUtilizationRate(
        input.totals.itemQuantity,
        input.limits.maximumItems,
      );

    const weightUtilizationRate =
      this.optionalUtilizationRate(
        input.totals.totalWeight,
        input.limits.maximumWeight,
      );

    const volumeUtilizationRate =
      this.optionalUtilizationRate(
        input.totals.totalVolume,
        input.limits.maximumVolume,
      );

    const estimatedMinutesUtilizationRate =
      this.optionalUtilizationRate(
        input.totals
          .estimatedMinutes,
        input.limits
          .maximumEstimatedMinutes,
      );

    for (
      const rate
      of [
        orderUtilizationRate,
        lineUtilizationRate,
        itemUtilizationRate,
        weightUtilizationRate,
        volumeUtilizationRate,
        estimatedMinutesUtilizationRate,
      ]
    ) {
      if (rate !== undefined) {
        rates.push(rate);
      }
    }

    const overallUtilizationRate =
      rates.length === 0
        ? 0
        : this.round(
            rates.reduce(
              (total, rate) =>
                total + rate,
              0,
            ) / rates.length,
          );

    return {
      overallUtilizationRate,
      ...(orderUtilizationRate !==
      undefined
        ? {
            orderUtilizationRate,
          }
        : {}),
      ...(lineUtilizationRate !==
      undefined
        ? {
            lineUtilizationRate,
          }
        : {}),
      ...(itemUtilizationRate !==
      undefined
        ? {
            itemUtilizationRate,
          }
        : {}),
      ...(weightUtilizationRate !==
      undefined
        ? {
            weightUtilizationRate,
          }
        : {}),
      ...(volumeUtilizationRate !==
      undefined
        ? {
            volumeUtilizationRate,
          }
        : {}),
      ...(estimatedMinutesUtilizationRate !==
      undefined
        ? {
            estimatedMinutesUtilizationRate,
          }
        : {}),
    };
  }

  private evaluateRuleCompatibility(
    input: {
      order: WaveOrder;
      rule: WaveRule;
      reasons: string[];
      rejectionReasons: string[];
    },
  ): void {
    const {
      order,
      rule,
      reasons,
      rejectionReasons,
    } = input;

    if (
      order.tenantId !==
      rule.tenantId
    ) {
      rejectionReasons.push(
        "Sipariş farklı firmaya aittir.",
      );
    }

    if (
      rule.warehouseId !==
        undefined &&
      order.warehouseId !==
        rule.warehouseId
    ) {
      rejectionReasons.push(
        "Sipariş deposu dalga kuralıyla uyuşmuyor.",
      );
    }

    this.evaluateOptionalMatch({
      ruleValue: rule.routeId,
      orderValue: order.routeId,
      rejectionMessage:
        "Sipariş rotası dalga kuralıyla uyuşmuyor.",
      successMessage:
        "Sipariş rotası dalga kuralıyla uyumludur.",
      reasons,
      rejectionReasons,
    });

    this.evaluateOptionalMatch({
      ruleValue: rule.carrierId,
      orderValue: order.carrierId,
      rejectionMessage:
        "Sipariş taşıyıcısı dalga kuralıyla uyuşmuyor.",
      successMessage:
        "Sipariş taşıyıcısı dalga kuralıyla uyumludur.",
      reasons,
      rejectionReasons,
    });

    this.evaluateOptionalMatch({
      ruleValue:
        rule.serviceLevel,
      orderValue:
        order.serviceLevel,
      rejectionMessage:
        "Sipariş servis seviyesi dalga kuralıyla uyuşmuyor.",
      successMessage:
        "Sipariş servis seviyesi dalga kuralıyla uyumludur.",
      reasons,
      rejectionReasons,
    });

    this.evaluateOptionalMatch({
      ruleValue:
        rule.temperatureZone,
      orderValue:
        order.temperatureZone,
      rejectionMessage:
        "Sipariş sıcaklık koşulu dalga kuralıyla uyuşmuyor.",
      successMessage:
        "Sipariş sıcaklık koşulu dalga kuralıyla uyumludur.",
      reasons,
      rejectionReasons,
    });

    if (
      rule.minimumPriority !==
        undefined &&
      order.priority <
        rule.minimumPriority
    ) {
      rejectionReasons.push(
        `Sipariş önceliği kuralın minimum öncelik değerinin altındadır: ${rule.minimumPriority}.`,
      );
    }
  }

  private evaluateOptionalMatch(
    input: {
      ruleValue: string | undefined;
      orderValue: string | undefined;
      rejectionMessage: string;
      successMessage: string;
      reasons: string[];
      rejectionReasons: string[];
    },
  ): void {
    if (
      input.ruleValue === undefined
    ) {
      return;
    }

    if (
      input.orderValue !==
      input.ruleValue
    ) {
      input.rejectionReasons.push(
        input.rejectionMessage,
      );

      return;
    }

    input.reasons.push(
      input.successMessage,
    );
  }

  private findLimitViolations(
    input: {
      totals:
        MutableWaveOptimizationTotals;
      evaluation:
        WaveOrderEvaluation;
      limits:
        WaveOptimizationLimits;
    },
  ): string[] {
    const violations: string[] = [];

    const nextOrderCount =
      input.totals.orderCount + 1;

    const nextLineCount =
      input.totals.lineCount +
      input.evaluation.order.lineCount;

    const nextItemQuantity =
      input.totals.itemQuantity +
      input.evaluation
        .order.itemQuantity;

    const nextWeight =
      input.totals.totalWeight +
      (
        input.evaluation.order
          .totalWeight ?? 0
      );

    const nextVolume =
      input.totals.totalVolume +
      (
        input.evaluation.order
          .totalVolume ?? 0
      );

    const nextEstimatedMinutes =
      input.totals
        .estimatedMinutes +
      input.evaluation
        .estimatedMinutes;

    if (
      input.limits.maximumOrders !==
        undefined &&
      nextOrderCount >
        input.limits.maximumOrders
    ) {
      violations.push(
        `Maksimum sipariş kapasitesi aşılacaktır: ${input.limits.maximumOrders}.`,
      );
    }

    if (
      input.limits.maximumLines !==
        undefined &&
      nextLineCount >
        input.limits.maximumLines
    ) {
      violations.push(
        `Maksimum sipariş satırı kapasitesi aşılacaktır: ${input.limits.maximumLines}.`,
      );
    }

    if (
      input.limits.maximumItems !==
        undefined &&
      nextItemQuantity >
        input.limits.maximumItems
    ) {
      violations.push(
        `Maksimum ürün miktarı kapasitesi aşılacaktır: ${input.limits.maximumItems}.`,
      );
    }

    if (
      input.limits.maximumWeight !==
        undefined &&
      nextWeight >
        input.limits.maximumWeight
    ) {
      violations.push(
        `Maksimum ağırlık kapasitesi aşılacaktır: ${input.limits.maximumWeight}.`,
      );
    }

    if (
      input.limits.maximumVolume !==
        undefined &&
      nextVolume >
        input.limits.maximumVolume
    ) {
      violations.push(
        `Maksimum hacim kapasitesi aşılacaktır: ${input.limits.maximumVolume}.`,
      );
    }

    if (
      input.limits
        .maximumEstimatedMinutes !==
        undefined &&
      nextEstimatedMinutes >
        input.limits
          .maximumEstimatedMinutes
    ) {
      violations.push(
        `Maksimum tahmini operasyon süresi aşılacaktır: ${input.limits.maximumEstimatedMinutes} dakika.`,
      );
    }

    return violations;
  }

  private addToTotals(
    totals:
      MutableWaveOptimizationTotals,
    evaluation:
      WaveOrderEvaluation,
  ): void {
    totals.orderCount += 1;

    totals.lineCount +=
      evaluation.order.lineCount;

    totals.itemQuantity =
      this.round(
        totals.itemQuantity +
          evaluation.order
            .itemQuantity,
      );

    totals.totalWeight =
      this.round(
        totals.totalWeight +
          (
            evaluation.order
              .totalWeight ?? 0
          ),
      );

    totals.totalVolume =
      this.round(
        totals.totalVolume +
          (
            evaluation.order
              .totalVolume ?? 0
          ),
      );

    totals.estimatedMinutes =
      this.round(
        totals.estimatedMinutes +
          evaluation
            .estimatedMinutes,
      );
  }

  private calculateComplexityScore(
    order: WaveOrder,
  ): number {
    const lineScore =
      Math.min(
        100,
        order.lineCount * 8,
      );

    const itemScore =
      Math.min(
        100,
        order.itemQuantity * 2,
      );

    return this.round(
      (
        lineScore +
        itemScore
      ) / 2,
    );
  }

  private calculateRuleMatchScore(
    order: WaveOrder,
    rule: WaveRule,
  ): number {
    const checks: boolean[] = [];

    if (
      rule.warehouseId !== undefined
    ) {
      checks.push(
        order.warehouseId ===
          rule.warehouseId,
      );
    }

    if (rule.routeId !== undefined) {
      checks.push(
        order.routeId ===
          rule.routeId,
      );
    }

    if (
      rule.carrierId !== undefined
    ) {
      checks.push(
        order.carrierId ===
          rule.carrierId,
      );
    }

    if (
      rule.serviceLevel !==
      undefined
    ) {
      checks.push(
        order.serviceLevel ===
          rule.serviceLevel,
      );
    }

    if (
      rule.temperatureZone !==
      undefined
    ) {
      checks.push(
        order.temperatureZone ===
          rule.temperatureZone,
      );
    }

    if (checks.length === 0) {
      return 50;
    }

    const matched =
      checks.filter(Boolean).length;

    return this.round(
      (
        matched /
        checks.length
      ) * 100,
    );
  }

  private optionalUtilizationRate(
    used: number,
    limit: number | undefined,
  ): number | undefined {
    if (limit === undefined) {
      return undefined;
    }

    if (limit === 0) {
      return used === 0 ? 0 : 100;
    }

    return this.round(
      Math.min(
        100,
        Math.max(
          0,
          (
            used /
            limit
          ) * 100,
        ),
      ),
    );
  }

  private minimumDefined(
    left: number | undefined,
    right: number | undefined,
  ): number | undefined {
    if (
      left === undefined &&
      right === undefined
    ) {
      return undefined;
    }

    if (left === undefined) {
      return right;
    }

    if (right === undefined) {
      return left;
    }

    return Math.min(left, right);
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

  private dateSortValue(
    value: string | undefined,
  ): number {
    if (value === undefined) {
      return Number.MAX_SAFE_INTEGER;
    }

    const timestamp =
      Date.parse(value);

    return Number.isNaN(timestamp)
      ? Number.MAX_SAFE_INTEGER
      : timestamp;
  }

  private normalizeRate(
    value: number | undefined,
    defaultValue: number,
    fieldName: string,
  ): number {
    const normalized =
      value ?? defaultValue;

    if (
      !Number.isFinite(normalized) ||
      normalized < 0
    ) {
      throw new InventoryValidationError(
        `${fieldName} sıfır veya daha büyük olmalıdır.`,
      );
    }

    return normalized;
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
