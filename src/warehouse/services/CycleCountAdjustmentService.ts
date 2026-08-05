import type {
  CreateCycleCountAdjustmentInput,
  CycleCountAdjustment,
} from "../types/CycleCountAdjustment";
import type {
  ApproveCycleCountInput,
  CreateCycleCountApprovalInput,
  CycleCountApproval,
  RejectCycleCountInput,
} from "../types/CycleCountApproval";
import type {
  CycleCountItem,
} from "../types/CycleCountItem";
import type {
  CycleCountResult,
} from "../types/CycleCountResult";
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  CycleCountRepository,
} from "./CycleCountRepository";
import {
  validateCreateCycleCountAdjustment,
  validateCreateCycleCountApproval,
} from "./CycleCountValidator";

export interface CycleCountAdjustmentExecutionInput {
  readonly adjustment: CycleCountAdjustment;
  readonly item: CycleCountItem;
  readonly result: CycleCountResult;
  readonly processedBy: string;
}

export interface CycleCountAdjustmentExecutionResult {
  readonly inventoryMovementId: string;
  readonly externalReferenceId?: string;
}

export interface CycleCountAdjustmentExecutor {
  execute(
    input: CycleCountAdjustmentExecutionInput,
  ): Promise<CycleCountAdjustmentExecutionResult>;
}

export interface CycleCountAdjustmentServiceDependencies {
  repository: CycleCountRepository;
  executor?: CycleCountAdjustmentExecutor;
  createId?: () => string;
  now?: () => string;
  approvalQuantityThreshold?: number;
  approvalValueThreshold?: number;
}

let internalSequence = 0;

export class CycleCountAdjustmentService {
  private readonly repository:
    CycleCountRepository;

  private readonly executor:
    CycleCountAdjustmentExecutor | undefined;

  private readonly createId: () => string;

  private readonly now: () => string;

  private readonly approvalQuantityThreshold:
    number;

  private readonly approvalValueThreshold:
    number;

  constructor(
    dependencies:
      CycleCountAdjustmentServiceDependencies,
  ) {
    this.repository =
      dependencies.repository;

    this.executor =
      dependencies.executor;

    this.createId =
      dependencies.createId ??
      (() =>
        `cycle-count-adjustment-${String(
          ++internalSequence,
        ).padStart(6, "0")}`);

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());

    this.approvalQuantityThreshold =
      dependencies
        .approvalQuantityThreshold ??
      0;

    this.approvalValueThreshold =
      dependencies
        .approvalValueThreshold ??
      0;

    this.requireNonNegativeNumber(
      this.approvalQuantityThreshold,
      "Miktar onay eşiği",
    );

    this.requireNonNegativeNumber(
      this.approvalValueThreshold,
      "Değer onay eşiği",
    );
  }

  async create(
    input: CreateCycleCountAdjustmentInput,
  ): Promise<CycleCountAdjustment> {
    const normalized =
      validateCreateCycleCountAdjustment(
        input,
      );

    const cycleCount =
      await this.requireCycleCount(
        normalized.tenantId,
        normalized.cycleCountId,
      );

    if (
      cycleCount.status !==
        "under_review" &&
      cycleCount.status !==
        "approved" &&
      cycleCount.status !==
        "counted" &&
      cycleCount.status !==
        "recount_required"
    ) {
      throw new InventoryValidationError(
        "Stok düzeltmesi mevcut sayım durumunda oluşturulamaz.",
      );
    }

    const item =
      this.requireItem(
        cycleCount.items,
        normalized.cycleCountItemId,
      );

    const result =
      this.requireResult(
        cycleCount.results,
        normalized.resultId,
      );

    if (
      result.cycleCountItemId !== item.id
    ) {
      throw new InventoryValidationError(
        "Sayım sonucu seçilen sayım satırına ait değildir.",
      );
    }

    if (!result.adjustmentRequired) {
      throw new InventoryValidationError(
        "Seçilen sayım sonucu için stok düzeltmesi gerekmemektedir.",
      );
    }

    const existing =
      (
        await this.repository
          .listAdjustments(
            cycleCount.tenantId,
            cycleCount.id,
          )
      ).find(
        (adjustment) =>
          adjustment
            .cycleCountItemId ===
            item.id &&
          adjustment.status !==
            "cancelled" &&
          adjustment.status !==
            "failed",
      );

    if (existing) {
      throw new InventoryValidationError(
        "Bu sayım satırı için aktif stok düzeltmesi zaten bulunmaktadır.",
      );
    }

    this.validateAdjustmentDirection(
      normalized,
      result,
    );

    const approvalRequired =
      this.requiresApproval(
        normalized,
        result,
      );

    const timestamp = this.now();

    return this.repository
      .saveAdjustment({
        id: this.createId(),
        tenantId:
          cycleCount.tenantId,
        cycleCountId:
          cycleCount.id,
        cycleCountItemId:
          item.id,
        resultId: result.id,
        type: normalized.type,
        status: approvalRequired
          ? "approval_required"
          : "approved",
        warehouseId:
          normalized.warehouseId,
        locationId:
          normalized.locationId,
        productId:
          normalized.productId,
        quantity:
          normalized.quantity,
        unit: normalized.unit,
        previousQuantity:
          normalized.previousQuantity,
        adjustedQuantity:
          normalized.adjustedQuantity,
        requestedBy:
          normalized.requestedBy,
        requestedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...(normalized.skuId !==
        undefined
          ? { skuId: normalized.skuId }
          : {}),
        ...(normalized.stockStatus !==
        undefined
          ? {
              stockStatus:
                normalized.stockStatus,
            }
          : {}),
        ...(normalized
          .targetStockStatus !==
        undefined
          ? {
              targetStockStatus:
                normalized
                  .targetStockStatus,
            }
          : {}),
        ...(normalized.externalSystem !==
        undefined
          ? {
              externalSystem:
                normalized.externalSystem,
            }
          : {}),
        ...(normalized.notes !== undefined
          ? { notes: normalized.notes }
          : {}),
        ...(!approvalRequired
          ? {
              approvedBy:
                normalized.requestedBy,
              approvedAt: timestamp,
            }
          : {}),
      });
  }

  async createApproval(
    input: CreateCycleCountApprovalInput,
  ): Promise<CycleCountApproval> {
    const normalized =
      validateCreateCycleCountApproval(
        input,
      );

    const cycleCount =
      await this.requireCycleCount(
        normalized.tenantId,
        normalized.cycleCountId,
      );

    if (
      normalized.adjustmentId ===
      undefined
    ) {
      throw new InventoryValidationError(
        "Stok düzeltme onayı için düzeltme kimliği gereklidir.",
      );
    }

    const adjustment =
      this.requireAdjustment(
        cycleCount.adjustments,
        normalized.adjustmentId,
      );

    if (
      adjustment.status !==
      "approval_required"
    ) {
      throw new InventoryValidationError(
        "Yalnızca onay bekleyen stok düzeltmesi için onay kaydı oluşturulabilir.",
      );
    }

    const existing =
      (
        await this.repository
          .listApprovals(
            cycleCount.tenantId,
            cycleCount.id,
          )
      ).find(
        (approval) =>
          approval.adjustmentId ===
            adjustment.id &&
          approval.status === "pending",
      );

    if (existing) {
      throw new InventoryValidationError(
        "Bu stok düzeltmesi için bekleyen bir onay kaydı zaten bulunmaktadır.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveApproval({
      id: this.createId(),
      tenantId:
        cycleCount.tenantId,
      cycleCountId:
        cycleCount.id,
      adjustmentId:
        adjustment.id,
      status: "pending",
      level:
        normalized.level ?? 1,
      requestedBy:
        normalized.requestedBy,
      requestedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized
        .cycleCountItemId !== undefined
        ? {
            cycleCountItemId:
              normalized
                .cycleCountItemId,
          }
        : {}),
      ...(normalized.approverRole !==
      undefined
        ? {
            approverRole:
              normalized.approverRole,
          }
        : {}),
      ...(normalized.approverId !==
      undefined
        ? {
            approverId:
              normalized.approverId,
          }
        : {}),
      ...(normalized.notes !== undefined
        ? { notes: normalized.notes }
        : {}),
    });
  }

  async approve(
    input: ApproveCycleCountInput,
  ): Promise<CycleCountApproval> {
    const tenantId =
      this.requireText(
        input.tenantId,
        "Firma kimliği",
      );

    const cycleCountId =
      this.requireText(
        input.cycleCountId,
        "Sayım kimliği",
      );

    const approvalId =
      this.requireText(
        input.approvalId,
        "Onay kimliği",
      );

    const approvedBy =
      this.requireText(
        input.approvedBy,
        "Onaylayan kullanıcı",
      );

    const cycleCount =
      await this.requireCycleCount(
        tenantId,
        cycleCountId,
      );

    const approval =
      this.requireApproval(
        cycleCount.approvals,
        approvalId,
      );

    if (approval.status !== "pending") {
      throw new InventoryValidationError(
        "Yalnızca bekleyen onay kaydı onaylanabilir.",
      );
    }

    if (
      approval.adjustmentId ===
      undefined
    ) {
      throw new InventoryValidationError(
        "Onay kaydına bağlı stok düzeltmesi bulunmamaktadır.",
      );
    }

    const adjustment =
      this.requireAdjustment(
        cycleCount.adjustments,
        approval.adjustmentId,
      );

    if (
      adjustment.status !==
      "approval_required"
    ) {
      throw new InventoryValidationError(
        "Stok düzeltmesi onay bekleyen durumda değildir.",
      );
    }

    const timestamp = this.now();

    const notes =
      this.normalizeOptionalText(
        input.notes,
      );

    const updatedApproval =
      await this.repository
        .saveApproval({
          ...approval,
          status: "approved",
          approvedBy,
          approvedAt: timestamp,
          updatedAt: timestamp,
          ...(notes !== undefined
            ? { notes }
            : {}),
        });

    await this.repository
      .saveAdjustment({
        ...adjustment,
        status: "approved",
        approvedBy,
        approvedAt: timestamp,
        updatedAt: timestamp,
      });

    return updatedApproval;
  }

  async reject(
    input: RejectCycleCountInput,
  ): Promise<CycleCountApproval> {
    const tenantId =
      this.requireText(
        input.tenantId,
        "Firma kimliği",
      );

    const cycleCountId =
      this.requireText(
        input.cycleCountId,
        "Sayım kimliği",
      );

    const approvalId =
      this.requireText(
        input.approvalId,
        "Onay kimliği",
      );

    const rejectedBy =
      this.requireText(
        input.rejectedBy,
        "Reddeden kullanıcı",
      );

    const rejectionReason =
      this.requireText(
        input.rejectionReason,
        "Ret nedeni",
      );

    const cycleCount =
      await this.requireCycleCount(
        tenantId,
        cycleCountId,
      );

    const approval =
      this.requireApproval(
        cycleCount.approvals,
        approvalId,
      );

    if (approval.status !== "pending") {
      throw new InventoryValidationError(
        "Yalnızca bekleyen onay kaydı reddedilebilir.",
      );
    }

    const timestamp = this.now();

    const updatedApproval =
      await this.repository
        .saveApproval({
          ...approval,
          status: "rejected",
          rejectedBy,
          rejectedAt: timestamp,
          rejectionReason,
          updatedAt: timestamp,
        });

    if (
      approval.adjustmentId !==
      undefined
    ) {
      const adjustment =
        this.requireAdjustment(
          cycleCount.adjustments,
          approval.adjustmentId,
        );

      await this.repository
        .saveAdjustment({
          ...adjustment,
          status: "cancelled",
          failureReason:
            `Stok düzeltme talebi reddedildi: ${rejectionReason}`,
          updatedAt: timestamp,
        });
    }

    return updatedApproval;
  }

  async process(input: {
    tenantId: string;
    cycleCountId: string;
    adjustmentId: string;
    processedBy: string;
  }): Promise<CycleCountAdjustment> {
    const tenantId =
      this.requireText(
        input.tenantId,
        "Firma kimliği",
      );

    const cycleCountId =
      this.requireText(
        input.cycleCountId,
        "Sayım kimliği",
      );

    const adjustmentId =
      this.requireText(
        input.adjustmentId,
        "Stok düzeltme kimliği",
      );

    const processedBy =
      this.requireText(
        input.processedBy,
        "Düzeltmeyi işleyen kullanıcı",
      );

    const cycleCount =
      await this.requireCycleCount(
        tenantId,
        cycleCountId,
      );

    const adjustment =
      this.requireAdjustment(
        cycleCount.adjustments,
        adjustmentId,
      );

    if (adjustment.status !== "approved") {
      throw new InventoryValidationError(
        "Yalnızca onaylanmış stok düzeltmesi işlenebilir.",
      );
    }

    const item =
      this.requireItem(
        cycleCount.items,
        adjustment.cycleCountItemId,
      );

    const result =
      this.requireResult(
        cycleCount.results,
        adjustment.resultId,
      );

    if (!this.executor) {
      throw new InventoryValidationError(
        "Stok düzeltme yürütücüsü yapılandırılmamış.",
      );
    }

    const processingAt = this.now();

    await this.repository
      .saveAdjustment({
        ...adjustment,
        status: "processing",
        processedBy,
        updatedAt: processingAt,
      });

    try {
      const execution =
        await this.executor.execute({
          adjustment,
          item,
          result,
          processedBy,
        });

      const inventoryMovementId =
        this.requireText(
          execution.inventoryMovementId,
          "Stok hareketi kimliği",
        );

      const completedAt = this.now();

      const completed =
        await this.repository
          .saveAdjustment({
            ...adjustment,
            status: "completed",
            inventoryMovementId,
            processedBy,
            processedAt: completedAt,
            updatedAt: completedAt,
            ...(execution
              .externalReferenceId !==
            undefined
              ? {
                  externalReferenceId:
                    execution
                      .externalReferenceId,
                }
              : {}),
          });

      await this.repository.saveItem({
        ...item,
        status: "adjusted",
        adjustmentRequired: false,
        updatedAt: completedAt,
        ...(adjustment.approvedBy !==
        undefined
          ? {
              approvedBy:
                adjustment.approvedBy,
            }
          : {}),
        ...(adjustment.approvedAt !==
        undefined
          ? {
              approvedAt:
                adjustment.approvedAt,
            }
          : {}),
      });

      return completed;
    } catch (error) {
      const failedAt = this.now();

      await this.repository
        .saveAdjustment({
          ...adjustment,
          status: "failed",
          processedBy,
          processedAt: failedAt,
          failureReason:
            error instanceof Error
              ? error.message
              : "Stok düzeltmesi sırasında bilinmeyen hata oluştu.",
          updatedAt: failedAt,
        });

      throw error;
    }
  }

  async cancel(input: {
    tenantId: string;
    cycleCountId: string;
    adjustmentId: string;
    reason: string;
  }): Promise<CycleCountAdjustment> {
    const cycleCount =
      await this.requireCycleCount(
        this.requireText(
          input.tenantId,
          "Firma kimliği",
        ),
        this.requireText(
          input.cycleCountId,
          "Sayım kimliği",
        ),
      );

    const adjustment =
      this.requireAdjustment(
        cycleCount.adjustments,
        this.requireText(
          input.adjustmentId,
          "Stok düzeltme kimliği",
        ),
      );

    if (
      adjustment.status ===
        "completed" ||
      adjustment.status ===
        "processing"
    ) {
      throw new InventoryValidationError(
        "İşlenmiş veya işlenmekte olan stok düzeltmesi iptal edilemez.",
      );
    }

    if (
      adjustment.status ===
      "cancelled"
    ) {
      throw new InventoryValidationError(
        "Stok düzeltmesi daha önce iptal edilmiş.",
      );
    }

    return this.repository
      .saveAdjustment({
        ...adjustment,
        status: "cancelled",
        failureReason:
          this.requireText(
            input.reason,
            "İptal nedeni",
          ),
        updatedAt: this.now(),
      });
  }

  async listAdjustments(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountAdjustment[]> {
    await this.requireCycleCount(
      tenantId,
      cycleCountId,
    );

    return this.repository
      .listAdjustments(
        tenantId,
        cycleCountId,
      );
  }

  async listApprovals(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountApproval[]> {
    await this.requireCycleCount(
      tenantId,
      cycleCountId,
    );

    return this.repository
      .listApprovals(
        tenantId,
        cycleCountId,
      );
  }

  requiresApproval(
    input: CreateCycleCountAdjustmentInput,
    result?: CycleCountResult,
  ): boolean {
    const absoluteQuantity =
      Math.abs(input.quantity);

    const varianceValue =
      Math.abs(
        result?.varianceValue ?? 0,
      );

    return (
      (
        this.approvalQuantityThreshold >
          0 &&
        absoluteQuantity >=
          this.approvalQuantityThreshold
      ) ||
      (
        this.approvalValueThreshold >
          0 &&
        varianceValue >=
          this.approvalValueThreshold
      )
    );
  }

  private validateAdjustmentDirection(
    input: CreateCycleCountAdjustmentInput,
    result: CycleCountResult,
  ): void {
    if (
      result.varianceQuantity > 0 &&
      input.type !== "increase"
    ) {
      throw new InventoryValidationError(
        "Fazla stok farkı için stok artırma düzeltmesi kullanılmalıdır.",
      );
    }

    if (
      result.varianceQuantity < 0 &&
      input.type !== "decrease" &&
      input.type !== "damage"
    ) {
      throw new InventoryValidationError(
        "Eksik stok farkı için stok azaltma veya hasar düzeltmesi kullanılmalıdır.",
      );
    }

    if (
      input.type === "increase" &&
      input.adjustedQuantity <=
        input.previousQuantity
    ) {
      throw new InventoryValidationError(
        "Stok artırma düzeltmesinde yeni miktar önceki miktardan büyük olmalıdır.",
      );
    }

    if (
      (
        input.type === "decrease" ||
        input.type === "damage"
      ) &&
      input.adjustedQuantity >=
        input.previousQuantity
    ) {
      throw new InventoryValidationError(
        "Stok azaltma düzeltmesinde yeni miktar önceki miktardan küçük olmalıdır.",
      );
    }

    if (
      input.type ===
        "stock_status_change" &&
      input.targetStockStatus ===
        undefined
    ) {
      throw new InventoryValidationError(
        "Stok durumu değişikliği için hedef stok durumu zorunludur.",
      );
    }
  }

  private async requireCycleCount(
    tenantId: string,
    cycleCountId: string,
  ) {
    const cycleCount =
      await this.repository.findById(
        tenantId,
        cycleCountId,
      );

    if (!cycleCount) {
      throw new InventoryValidationError(
        `Döngüsel sayım kaydı bulunamadı: ${cycleCountId}`,
      );
    }

    return cycleCount;
  }

  private requireItem(
    items: readonly CycleCountItem[],
    itemId: string,
  ): CycleCountItem {
    const item = items.find(
      (current) =>
        current.id === itemId,
    );

    if (!item) {
      throw new InventoryValidationError(
        `Sayım satırı bulunamadı: ${itemId}`,
      );
    }

    return item;
  }

  private requireResult(
    results: readonly CycleCountResult[],
    resultId: string,
  ): CycleCountResult {
    const result = results.find(
      (current) =>
        current.id === resultId,
    );

    if (!result) {
      throw new InventoryValidationError(
        `Sayım sonucu bulunamadı: ${resultId}`,
      );
    }

    return result;
  }

  private requireAdjustment(
    adjustments:
      readonly CycleCountAdjustment[],
    adjustmentId: string,
  ): CycleCountAdjustment {
    const adjustment =
      adjustments.find(
        (current) =>
          current.id ===
          adjustmentId,
      );

    if (!adjustment) {
      throw new InventoryValidationError(
        `Stok düzeltme kaydı bulunamadı: ${adjustmentId}`,
      );
    }

    return adjustment;
  }

  private requireApproval(
    approvals:
      readonly CycleCountApproval[],
    approvalId: string,
  ): CycleCountApproval {
    const approval =
      approvals.find(
        (current) =>
          current.id === approvalId,
      );

    if (!approval) {
      throw new InventoryValidationError(
        `Onay kaydı bulunamadı: ${approvalId}`,
      );
    }

    return approval;
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

  private normalizeOptionalText(
    value: unknown,
  ): string | undefined {
    if (
      value === undefined ||
      value === null
    ) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new InventoryValidationError(
        "İsteğe bağlı metin alanı geçersiz.",
      );
    }

    const normalized = value.trim();

    return normalized || undefined;
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
}
