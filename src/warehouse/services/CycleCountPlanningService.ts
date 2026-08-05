import type {
  CycleCount,
} from "../types/CycleCount";
import type {
  CreateCycleCountItemInput,
} from "../types/CycleCountItem";
import type {
  CreateCycleCountRuleInput,
  CycleCountAbcClass,
  CycleCountRule,
} from "../types/CycleCountRule";
import type {
  CreateCycleCountScheduleInput,
  CycleCountSchedule,
} from "../types/CycleCountSchedule";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  CycleCountRepository,
} from "./CycleCountRepository";
import {
  validateCreateCycleCountRule,
  validateCreateCycleCountSchedule,
} from "./CycleCountValidator";

export interface CycleCountPlanningCandidate {
  readonly tenantId: string;
  readonly warehouseId: string;
  readonly locationId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly inventoryBalanceId?: string;
  readonly stockStatus?: string;
  readonly unit: string;
  readonly expectedQuantity: number;
  readonly unitCost?: number;
  readonly currency?: string;
  readonly abcClass?: CycleCountAbcClass;
  readonly productCategoryId?: string;
  readonly zoneId?: string;
  readonly locationType?: string;
  readonly movementCount?: number;
  readonly lastCountedAt?: string;
  readonly riskScore?: number;
}

export interface CycleCountPlanningEvaluation {
  readonly candidate: CycleCountPlanningCandidate;
  readonly eligible: boolean;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];
}

export interface CycleCountPlan {
  readonly rule: CycleCountRule;
  readonly schedule?: CycleCountSchedule;
  readonly candidates: readonly CycleCountPlanningEvaluation[];
  readonly selectedItems: readonly CreateCycleCountItemInput[];
  readonly generatedAt: string;
}

export interface GenerateCycleCountPlanInput {
  tenantId: string;
  ruleId: string;
  candidates: readonly CycleCountPlanningCandidate[];
  createdBy: string;
  scheduleId?: string;
  maximumItems?: number;
  referenceDate?: string;
}

export interface CycleCountPlanningServiceDependencies {
  repository: CycleCountRepository;
  createId?: () => string;
  now?: () => string;
}

let internalSequence = 0;

export class CycleCountPlanningService {
  private readonly repository:
    CycleCountRepository;

  private readonly createId: () => string;

  private readonly now: () => string;

  constructor(
    dependencies:
      CycleCountPlanningServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.createId =
      dependencies.createId ??
      (() =>
        `cycle-count-planning-${String(
          ++internalSequence,
        ).padStart(6, "0")}`);

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  async createRule(
    input: CreateCycleCountRuleInput,
  ): Promise<CycleCountRule> {
    const normalized =
      validateCreateCycleCountRule(
        input,
      );

    const existing =
      await this.repository
        .findRuleByCode(
          normalized.tenantId,
          normalized.code,
        );

    if (existing) {
      throw new InventoryValidationError(
        "Bu sayım kuralı kodu daha önce kullanılmış.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveRule({
      id: this.createId(),
      tenantId:
        normalized.tenantId,
      code: normalized.code,
      name: normalized.name,
      strategy: normalized.strategy,
      frequencyDays:
        normalized.frequencyDays,
      blindCount:
        normalized.blindCount ??
        false,
      recountRequired:
        normalized.recountRequired ??
        true,
      approvalRequired:
        normalized.approvalRequired ??
        true,
      freezeInventory:
        normalized.freezeInventory ??
        false,
      priority:
        normalized.priority ?? 50,
      active: true,
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.description !==
      undefined
        ? {
            description:
              normalized.description,
          }
        : {}),
      ...(normalized.abcClass !==
      undefined
        ? {
            abcClass:
              normalized.abcClass,
          }
        : {}),
      ...(normalized.warehouseId !==
      undefined
        ? {
            warehouseId:
              normalized.warehouseId,
          }
        : {}),
      ...(normalized.zoneId !==
      undefined
        ? {
            zoneId:
              normalized.zoneId,
          }
        : {}),
      ...(normalized.locationType !==
      undefined
        ? {
            locationType:
              normalized.locationType,
          }
        : {}),
      ...(normalized.productCategoryId !==
      undefined
        ? {
            productCategoryId:
              normalized.productCategoryId,
          }
        : {}),
      ...(normalized.productId !==
      undefined
        ? {
            productId:
              normalized.productId,
          }
        : {}),
      ...(normalized.stockStatus !==
      undefined
        ? {
            stockStatus:
              normalized.stockStatus,
          }
        : {}),
      ...(normalized.minimumStockValue !==
      undefined
        ? {
            minimumStockValue:
              normalized.minimumStockValue,
          }
        : {}),
      ...(normalized.maximumStockValue !==
      undefined
        ? {
            maximumStockValue:
              normalized.maximumStockValue,
          }
        : {}),
      ...(normalized.minimumMovementCount !==
      undefined
        ? {
            minimumMovementCount:
              normalized.minimumMovementCount,
          }
        : {}),
      ...(normalized.maximumDaysSinceLastCount !==
      undefined
        ? {
            maximumDaysSinceLastCount:
              normalized.maximumDaysSinceLastCount,
          }
        : {}),
      ...(normalized.toleranceQuantity !==
      undefined
        ? {
            toleranceQuantity:
              normalized.toleranceQuantity,
          }
        : {}),
      ...(normalized.tolerancePercentage !==
      undefined
        ? {
            tolerancePercentage:
              normalized.tolerancePercentage,
          }
        : {}),
    });
  }

  async createSchedule(
    input: CreateCycleCountScheduleInput,
  ): Promise<CycleCountSchedule> {
    const normalized =
      validateCreateCycleCountSchedule(
        input,
      );

    const rule =
      await this.repository.findRuleById(
        normalized.tenantId,
        normalized.ruleId,
      );

    if (!rule) {
      throw new InventoryValidationError(
        "Sayım planına bağlı kural bulunamadı.",
      );
    }

    if (!rule.active) {
      throw new InventoryValidationError(
        "Pasif sayım kuralı için plan oluşturulamaz.",
      );
    }

    if (
      rule.warehouseId !== undefined &&
      rule.warehouseId !==
        normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "Sayım planı deposu ile kural deposu uyuşmuyor.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveSchedule({
      id: this.createId(),
      tenantId:
        normalized.tenantId,
      ruleId: normalized.ruleId,
      warehouseId:
        normalized.warehouseId,
      name: normalized.name,
      status: "active",
      startDate:
        normalized.startDate,
      frequencyDays:
        normalized.frequencyDays,
      assignedUserIds: [
        ...(normalized
          .assignedUserIds ?? []),
      ],
      automaticRelease:
        normalized.automaticRelease ??
        false,
      createdBy:
        normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      nextRunAt:
        normalized.startDate,
      ...(normalized.endDate !==
      undefined
        ? {
            endDate:
              normalized.endDate,
          }
        : {}),
      ...(normalized.maximumItemsPerRun !==
      undefined
        ? {
            maximumItemsPerRun:
              normalized.maximumItemsPerRun,
          }
        : {}),
      ...(normalized.assignedTeamId !==
      undefined
        ? {
            assignedTeamId:
              normalized.assignedTeamId,
          }
        : {}),
    });
  }

  async generate(
    input: GenerateCycleCountPlanInput,
  ): Promise<CycleCountPlan> {
    const tenantId =
      this.requireText(
        input.tenantId,
        "Firma kimliği",
      );

    const ruleId =
      this.requireText(
        input.ruleId,
        "Sayım kuralı kimliği",
      );

    const createdBy =
      this.requireText(
        input.createdBy,
        "Oluşturan kullanıcı",
      );

    const rule =
      await this.repository.findRuleById(
        tenantId,
        ruleId,
      );

    if (!rule) {
      throw new InventoryValidationError(
        "Sayım kuralı bulunamadı.",
      );
    }

    if (!rule.active) {
      throw new InventoryValidationError(
        "Pasif sayım kuralı çalıştırılamaz.",
      );
    }

    const schedule =
      input.scheduleId === undefined
        ? undefined
        : await this.repository
            .findScheduleById(
              tenantId,
              this.requireText(
                input.scheduleId,
                "Sayım planı kimliği",
              ),
            );

    if (
      input.scheduleId !== undefined &&
      !schedule
    ) {
      throw new InventoryValidationError(
        "Sayım planı bulunamadı.",
      );
    }

    if (
      schedule &&
      schedule.ruleId !== rule.id
    ) {
      throw new InventoryValidationError(
        "Sayım planı seçilen kurala ait değildir.",
      );
    }

    if (
      schedule &&
      schedule.status !== "active"
    ) {
      throw new InventoryValidationError(
        "Yalnızca aktif sayım planı çalıştırılabilir.",
      );
    }

    const referenceDate =
      input.referenceDate === undefined
        ? this.now()
        : this.requireDate(
            input.referenceDate,
            "Referans tarihi",
          );

    const evaluations =
      input.candidates
        .filter(
          (candidate) =>
            candidate.tenantId ===
            tenantId,
        )
        .map((candidate) =>
          this.evaluateCandidate({
            candidate,
            rule,
            referenceDate,
          }),
        )
        .sort(
          (left, right) =>
            Number(right.eligible) -
              Number(left.eligible) ||
            right.score -
              left.score ||
            left.candidate.locationId
              .localeCompare(
                right.candidate.locationId,
                "tr",
                { numeric: true },
              ),
        );

    const eligible =
      evaluations.filter(
        (evaluation) =>
          evaluation.eligible,
      );

    const maximumItems =
      input.maximumItems ??
      schedule?.maximumItemsPerRun ??
      eligible.length;

    if (
      !Number.isInteger(maximumItems) ||
      maximumItems <= 0
    ) {
      throw new InventoryValidationError(
        "Maksimum sayım satırı sıfırdan büyük tam sayı olmalıdır.",
      );
    }

    const selected =
      eligible.slice(0, maximumItems);

    const selectedItems =
      selected.map(
        (
          evaluation,
          index,
        ): CreateCycleCountItemInput => {
          const candidate =
            evaluation.candidate;

          return {
            tenantId,
            cycleCountId:
              "PLANLAMA_SIRASINDA_ATANACAK",
            warehouseId:
              candidate.warehouseId,
            locationId:
              candidate.locationId,
            productId:
              candidate.productId,
            unit: candidate.unit,
            expectedQuantity:
              candidate.expectedQuantity,
            blindCount:
              rule.blindCount,
            toleranceQuantity:
              rule.toleranceQuantity ??
              0,
            tolerancePercentage:
              rule.tolerancePercentage ??
              0,
            createdBy,
            notes:
              `Planlama sırası: ${index + 1}; puan: ${evaluation.score}`,
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
            ...(candidate.stockStatus !==
            undefined
              ? {
                  stockStatus:
                    candidate.stockStatus,
                }
              : {}),
            ...(candidate.unitCost !==
            undefined
              ? {
                  unitCost:
                    candidate.unitCost,
                }
              : {}),
            ...(candidate.currency !==
            undefined
              ? {
                  currency:
                    candidate.currency,
                }
              : {}),
          };
        },
      );

    return {
      rule,
      candidates: evaluations,
      selectedItems,
      generatedAt: this.now(),
      ...(schedule !== undefined &&
      schedule !== null
        ? { schedule }
        : {}),
    };
  }

  evaluateCandidate(input: {
    candidate: CycleCountPlanningCandidate;
    rule: CycleCountRule;
    referenceDate: string;
  }): CycleCountPlanningEvaluation {
    const {
      candidate,
      rule,
      referenceDate,
    } = input;

    const reasons: string[] = [];
    const warnings: string[] = [];

    let eligible = true;
    let score = rule.priority;

    if (
      candidate.tenantId !==
      rule.tenantId
    ) {
      eligible = false;
      warnings.push(
        "Aday farklı firmaya aittir.",
      );
    }

    if (
      rule.warehouseId !== undefined &&
      candidate.warehouseId !==
        rule.warehouseId
    ) {
      eligible = false;
      warnings.push(
        "Aday depo kuralıyla uyuşmuyor.",
      );
    }

    if (
      rule.zoneId !== undefined &&
      candidate.zoneId !==
        rule.zoneId
    ) {
      eligible = false;
      warnings.push(
        "Aday bölge kuralıyla uyuşmuyor.",
      );
    }

    if (
      rule.locationType !== undefined &&
      candidate.locationType !==
        rule.locationType
    ) {
      eligible = false;
      warnings.push(
        "Lokasyon türü kuralıyla uyuşmuyor.",
      );
    }

    if (
      rule.productCategoryId !==
        undefined &&
      candidate.productCategoryId !==
        rule.productCategoryId
    ) {
      eligible = false;
      warnings.push(
        "Ürün kategorisi kuralıyla uyuşmuyor.",
      );
    }

    if (
      rule.productId !== undefined &&
      candidate.productId !==
        rule.productId
    ) {
      eligible = false;
      warnings.push(
        "Ürün kuralıyla uyuşmuyor.",
      );
    }

    if (
      rule.stockStatus !== undefined &&
      candidate.stockStatus !==
        rule.stockStatus
    ) {
      eligible = false;
      warnings.push(
        "Stok durumu kuralıyla uyuşmuyor.",
      );
    }

    if (
      rule.abcClass !== undefined &&
      candidate.abcClass !==
        rule.abcClass
    ) {
      eligible = false;
      warnings.push(
        "ABC stok sınıfı kuralıyla uyuşmuyor.",
      );
    }

    const stockValue =
      candidate.expectedQuantity *
      (candidate.unitCost ?? 0);

    if (
      rule.minimumStockValue !==
        undefined &&
      stockValue <
        rule.minimumStockValue
    ) {
      eligible = false;
      warnings.push(
        "Stok değeri minimum sınırın altında.",
      );
    }

    if (
      rule.maximumStockValue !==
        undefined &&
      stockValue >
        rule.maximumStockValue
    ) {
      eligible = false;
      warnings.push(
        "Stok değeri maksimum sınırı aşıyor.",
      );
    }

    if (
      rule.minimumMovementCount !==
        undefined &&
      (
        candidate.movementCount ?? 0
      ) <
        rule.minimumMovementCount
    ) {
      eligible = false;
      warnings.push(
        "Stok hareket sayısı minimum sınırın altında.",
      );
    }

    const daysSinceLastCount =
      this.calculateDaysSince(
        candidate.lastCountedAt,
        referenceDate,
      );

    if (
      rule.maximumDaysSinceLastCount !==
        undefined &&
      daysSinceLastCount <
        rule.maximumDaysSinceLastCount
    ) {
      eligible = false;
      warnings.push(
        "Son sayımdan sonra yeterli süre geçmedi.",
      );
    }

    if (candidate.abcClass === "A") {
      score += 30;
      reasons.push(
        "A sınıfı kritik stok.",
      );
    } else if (
      candidate.abcClass === "B"
    ) {
      score += 20;
      reasons.push(
        "B sınıfı stok.",
      );
    } else if (
      candidate.abcClass === "C"
    ) {
      score += 10;
      reasons.push(
        "C sınıfı stok.",
      );
    }

    if (
      candidate.movementCount !==
      undefined
    ) {
      score += Math.min(
        25,
        candidate.movementCount,
      );

      reasons.push(
        "Stok hareket yoğunluğu puana eklendi.",
      );
    }

    if (
      candidate.riskScore !==
      undefined
    ) {
      score += Math.min(
        30,
        Math.max(
          0,
          candidate.riskScore,
        ),
      );

      reasons.push(
        "Stok risk puanı dikkate alındı.",
      );
    }

    if (
      Number.isFinite(
        daysSinceLastCount,
      )
    ) {
      score += Math.min(
        30,
        Math.max(
          0,
          daysSinceLastCount,
        ),
      );

      reasons.push(
        "Son sayımdan geçen süre puana eklendi.",
      );
    }

    if (
      candidate.expectedQuantity === 0
    ) {
      warnings.push(
        "Sistem stok miktarı sıfır.",
      );
    }

    return {
      candidate:
        structuredClone(candidate),
      eligible,
      score: Math.round(score * 100) / 100,
      reasons,
      warnings,
    };
  }

  async updateScheduleAfterRun(input: {
    tenantId: string;
    scheduleId: string;
    executedAt?: string;
  }): Promise<CycleCountSchedule> {
    const tenantId =
      this.requireText(
        input.tenantId,
        "Firma kimliği",
      );

    const scheduleId =
      this.requireText(
        input.scheduleId,
        "Sayım planı kimliği",
      );

    const schedule =
      await this.repository
        .findScheduleById(
          tenantId,
          scheduleId,
        );

    if (!schedule) {
      throw new InventoryValidationError(
        "Sayım planı bulunamadı.",
      );
    }

    const executedAt =
      input.executedAt === undefined
        ? this.now()
        : this.requireDate(
            input.executedAt,
            "Çalıştırma tarihi",
          );

    const nextRunAt =
      new Date(
        Date.parse(executedAt) +
        schedule.frequencyDays *
          24 *
          60 *
          60 *
          1000,
      ).toISOString();

    const completed =
      schedule.endDate !== undefined &&
      nextRunAt > schedule.endDate;

    return this.repository
      .saveSchedule({
        ...schedule,
        status: completed
          ? "completed"
          : schedule.status,
        lastRunAt: executedAt,
        updatedAt: this.now(),
        ...(completed
          ? {}
          : { nextRunAt }),
      });
  }

  async setRuleActive(
    tenantId: string,
    ruleId: string,
    active: boolean,
  ): Promise<CycleCountRule> {
    const rule =
      await this.repository.findRuleById(
        this.requireText(
          tenantId,
          "Firma kimliği",
        ),
        this.requireText(
          ruleId,
          "Sayım kuralı kimliği",
        ),
      );

    if (!rule) {
      throw new InventoryValidationError(
        "Sayım kuralı bulunamadı.",
      );
    }

    return this.repository.saveRule({
      ...rule,
      active,
      updatedAt: this.now(),
    });
  }

  async listRules(
    tenantId: string,
    activeOnly = false,
  ): Promise<CycleCountRule[]> {
    return this.repository.listRules(
      this.requireText(
        tenantId,
        "Firma kimliği",
      ),
      activeOnly,
    );
  }

  async listSchedules(
    tenantId: string,
    warehouseId?: string,
    activeOnly = false,
  ): Promise<CycleCountSchedule[]> {
    return this.repository.listSchedules(
      this.requireText(
        tenantId,
        "Firma kimliği",
      ),
      warehouseId,
      activeOnly,
    );
  }

  private calculateDaysSince(
    lastCountedAt: string | undefined,
    referenceDate: string,
  ): number {
    if (lastCountedAt === undefined) {
      return 36500;
    }

    const lastTimestamp =
      Date.parse(lastCountedAt);

    if (Number.isNaN(lastTimestamp)) {
      throw new InventoryValidationError(
        "Son sayım tarihi geçerli bir tarih olmalıdır.",
      );
    }

    const referenceTimestamp =
      Date.parse(referenceDate);

    return Math.max(
      0,
      Math.floor(
        (
          referenceTimestamp -
          lastTimestamp
        ) /
          (
            24 *
            60 *
            60 *
            1000
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

    const normalized = value.trim();

    if (!normalized) {
      throw new InventoryValidationError(
        `${fieldName} boş bırakılamaz.`,
      );
    }

    return normalized;
  }

  private requireDate(
    value: unknown,
    fieldName: string,
  ): string {
    const text =
      this.requireText(
        value,
        fieldName,
      );

    const timestamp =
      Date.parse(text);

    if (Number.isNaN(timestamp)) {
      throw new InventoryValidationError(
        `${fieldName} geçerli bir tarih olmalıdır.`,
      );
    }

    return new Date(
      timestamp,
    ).toISOString();
  }
}
