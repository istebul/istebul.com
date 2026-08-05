import type {
  CreateQualityInspectionInput,
  QualityInspection,
  QualityInspectionListFilter,
} from "../types/QualityInspection";
import type {
  CreateQualityInspectionItemInput,
  QualityInspectionItem,
  RecordQualityInspectionResultInput,
} from "../types/QualityInspectionItem";
import type {
  CreateQualitySampleInput,
  QualitySample,
} from "../types/QualitySample";
import type {
  CreateQualityDocumentInput,
  QualityDocument,
} from "../types/QualityDocument";
import type {
  CreateQualityTaskInput,
  QualityTask,
} from "../types/QualityTask";
import type {
  QualityException,
  QualityExceptionType,
} from "../types/QualityException";
import type { QualityInspectionRepository } from "./QualityInspectionRepository";
import { InventoryValidationError } from "../types/InventoryErrors";
import {
  validateCreateQualityInspection,
  validateCreateQualityInspectionItem,
  validateQualityResultTotals,
  validateRecordQualityInspectionResult,
} from "./QualityInspectionValidator";

export interface QualityInspectionServiceDependencies {
  repository: QualityInspectionRepository;
  createId?: () => string;
  now?: () => string;
  sequence?: () => number;
}

export class QualityInspectionService {
  private readonly repository: QualityInspectionRepository;
  private readonly createId: () => string;
  private readonly now: () => string;
  private readonly sequence: () => number;

  constructor(
    dependencies: QualityInspectionServiceDependencies,
  ) {
    let internalSequence = 0;

    this.repository = dependencies.repository;
    this.createId =
      dependencies.createId ?? (() => crypto.randomUUID());
    this.now =
      dependencies.now ?? (() => new Date().toISOString());
    this.sequence =
      dependencies.sequence ?? (() => ++internalSequence);
  }

  async create(
    input: CreateQualityInspectionInput,
  ): Promise<QualityInspection> {
    const normalized =
      validateCreateQualityInspection(input);

    if (normalized.receivingId !== undefined) {
      const existing =
        await this.repository.findByReceivingId(
          normalized.tenantId,
          normalized.receivingId,
        );

      if (existing) {
        throw new InventoryValidationError(
          "Bu mal kabul kaydı için daha önce kalite kontrol oluşturulmuş.",
        );
      }
    }

    const timestamp = this.now();

    return this.repository.save({
      id: this.createId(),
      tenantId: normalized.tenantId,
      inspectionNumber:
        this.generateInspectionNumber(),
      warehouseId: normalized.warehouseId,
      locationId: normalized.locationId,
      status: "draft",
      finalDecision: "pending",
      items: [],
      samples: [],
      exceptions: [],
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.receivingId !== undefined
        ? { receivingId: normalized.receivingId }
        : {}),
      ...(normalized.referenceType !== undefined
        ? { referenceType: normalized.referenceType }
        : {}),
      ...(normalized.referenceId !== undefined
        ? { referenceId: normalized.referenceId }
        : {}),
      ...(normalized.referenceNumber !== undefined
        ? {
            referenceNumber:
              normalized.referenceNumber,
          }
        : {}),
      ...(normalized.plannedAt !== undefined
        ? { plannedAt: normalized.plannedAt }
        : {}),
      ...(normalized.notes !== undefined
        ? { notes: normalized.notes }
        : {}),
    });
  }

  async get(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityInspection> {
    const normalizedTenantId = tenantId.trim();
    const normalizedInspectionId =
      inspectionId.trim();

    if (!normalizedTenantId) {
      throw new InventoryValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    if (!normalizedInspectionId) {
      throw new InventoryValidationError(
        "Kalite kontrol kimliği boş bırakılamaz.",
      );
    }

    const inspection =
      await this.repository.findById(
        normalizedTenantId,
        normalizedInspectionId,
      );

    if (!inspection) {
      throw new InventoryValidationError(
        `Kalite kontrol kaydı bulunamadı: ${inspectionId}`,
      );
    }

    return inspection;
  }

  async list(
    filter: QualityInspectionListFilter,
  ): Promise<QualityInspection[]> {
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

  async addItem(
    input: CreateQualityInspectionItemInput,
  ): Promise<QualityInspectionItem> {
    const normalized =
      validateCreateQualityInspectionItem(input);

    const inspection = await this.get(
      normalized.tenantId,
      normalized.inspectionId,
    );

    if (
      inspection.status !== "draft" &&
      inspection.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Kalite kontrol satırı yalnızca taslak veya planlanmış kayda eklenebilir.",
      );
    }

    if (
      inspection.warehouseId !==
      normalized.warehouseId
    ) {
      throw new InventoryValidationError(
        "Kontrol satırındaki depo, kalite kontrol deposuyla aynı olmalıdır.",
      );
    }

    if (
      inspection.locationId !==
      normalized.locationId
    ) {
      throw new InventoryValidationError(
        "Kontrol satırındaki lokasyon, kalite kontrol lokasyonuyla aynı olmalıdır.",
      );
    }

    if (
      inspection.receivingId !== undefined &&
      normalized.receivingId !== undefined &&
      inspection.receivingId !== normalized.receivingId
    ) {
      throw new InventoryValidationError(
        "Kontrol satırındaki mal kabul, kalite kontrol kaydıyla aynı olmalıdır.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveItem({
      id: this.createId(),
      tenantId: normalized.tenantId,
      inspectionId: normalized.inspectionId,
      lineNumber: inspection.items.length + 1,
      productId: normalized.productId,
      warehouseId: normalized.warehouseId,
      locationId: normalized.locationId,
      controlType: normalized.controlType,
      inspectedQuantity:
        normalized.inspectedQuantity,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      conditionalQuantity: 0,
      holdQuantity: 0,
      unit: normalized.unit,
      decision: "pending",
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.skuId !== undefined
        ? { skuId: normalized.skuId }
        : {}),
      ...(normalized.receivingId !== undefined
        ? { receivingId: normalized.receivingId }
        : {}),
      ...(normalized.receivingItemId !== undefined
        ? {
            receivingItemId:
              normalized.receivingItemId,
          }
        : {}),
      ...(normalized.tracking !== undefined
        ? { tracking: normalized.tracking }
        : {}),
      ...(normalized.expectedValue !== undefined
        ? {
            expectedValue:
              normalized.expectedValue,
          }
        : {}),
      ...(normalized.notes !== undefined
        ? { notes: normalized.notes }
        : {}),
    });
  }

  async start(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityInspection> {
    const inspection = await this.get(
      tenantId,
      inspectionId,
    );

    if (
      inspection.status !== "draft" &&
      inspection.status !== "planned"
    ) {
      throw new InventoryValidationError(
        "Yalnızca taslak veya planlanmış kalite kontrol başlatılabilir.",
      );
    }

    if (inspection.items.length === 0) {
      throw new InventoryValidationError(
        "Kalite kontrol başlatılmadan önce en az bir kontrol satırı eklenmelidir.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...inspection,
      status: "in_progress",
      startedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async recordResult(
    input: RecordQualityInspectionResultInput,
  ): Promise<QualityInspectionItem> {
    const normalized =
      validateRecordQualityInspectionResult(input);

    const inspection = await this.get(
      normalized.tenantId,
      normalized.inspectionId,
    );

    if (inspection.status !== "in_progress") {
      throw new InventoryValidationError(
        "Sonuç yalnızca devam eden kalite kontrol işlemine girilebilir.",
      );
    }

    const item = inspection.items.find(
      (current) =>
        current.id ===
        normalized.inspectionItemId,
    );

    if (!item) {
      throw new InventoryValidationError(
        `Kalite kontrol satırı bulunamadı: ${normalized.inspectionItemId}`,
      );
    }

    validateQualityResultTotals(
      item.inspectedQuantity,
      normalized,
    );

    const updatedItem =
      await this.repository.saveItem({
        ...item,
        acceptedQuantity:
          normalized.acceptedQuantity,
        rejectedQuantity:
          normalized.rejectedQuantity,
        conditionalQuantity:
          normalized.conditionalQuantity ?? 0,
        holdQuantity:
          normalized.holdQuantity ?? 0,
        decision: normalized.decision,
        inspectedBy: normalized.inspectedBy,
        inspectedAt: this.now(),
        updatedAt: this.now(),
        ...(normalized.measuredValue !== undefined
          ? {
              measuredValue:
                normalized.measuredValue,
            }
          : {}),
        ...(normalized.notes !== undefined
          ? { notes: normalized.notes }
          : {}),
      });

    const refreshed = await this.get(
      normalized.tenantId,
      normalized.inspectionId,
    );

    const allItemsCompleted =
      refreshed.items.every(
        (current) =>
          current.decision !== "pending",
      );

    if (allItemsCompleted) {
      await this.repository.save({
        ...refreshed,
        status: "waiting_result",
        updatedAt: this.now(),
      });
    }

    return updatedItem;
  }

  async createSample(
    input: CreateQualitySampleInput,
  ): Promise<QualitySample> {
    const inspection = await this.get(
      input.tenantId.trim(),
      input.inspectionId.trim(),
    );

    if (
      inspection.status === "completed" ||
      inspection.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş kalite kontrol için numune oluşturulamaz.",
      );
    }

    if (
      !Number.isFinite(input.quantity) ||
      input.quantity <= 0
    ) {
      throw new InventoryValidationError(
        "Numune miktarı sıfırdan büyük olmalıdır.",
      );
    }

    const unit = input.unit.trim();
    const createdBy = input.createdBy.trim();

    if (!unit) {
      throw new InventoryValidationError(
        "Numune ölçü birimi boş bırakılamaz.",
      );
    }

    if (!createdBy) {
      throw new InventoryValidationError(
        "Numuneyi oluşturan kullanıcı boş bırakılamaz.",
      );
    }

    if (input.inspectionItemId?.trim()) {
      const itemExists = inspection.items.some(
        (item) =>
          item.id === input.inspectionItemId?.trim(),
      );

      if (!itemExists) {
        throw new InventoryValidationError(
          "Numunenin bağlı olduğu kalite kontrol satırı bulunamadı.",
        );
      }
    }

    const timestamp = this.now();

    return this.repository.saveSample({
      id: this.createId(),
      tenantId: inspection.tenantId,
      inspectionId: inspection.id,
      sampleNumber: this.generateSampleNumber(),
      quantity: input.quantity,
      unit,
      status: "planned",
      createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(input.inspectionItemId?.trim()
        ? {
            inspectionItemId:
              input.inspectionItemId.trim(),
          }
        : {}),
      ...(input.lotNumber?.trim()
        ? { lotNumber: input.lotNumber.trim() }
        : {}),
      ...(input.serialNumber?.trim()
        ? {
            serialNumber:
              input.serialNumber.trim(),
          }
        : {}),
      ...(input.notes?.trim()
        ? { notes: input.notes.trim() }
        : {}),
    });
  }

  async addDocument(
    input: CreateQualityDocumentInput,
  ): Promise<QualityDocument> {
    const inspection = await this.get(
      input.tenantId.trim(),
      input.inspectionId.trim(),
    );

    if (inspection.status === "cancelled") {
      throw new InventoryValidationError(
        "İptal edilmiş kalite kontrole belge eklenemez.",
      );
    }

    const createdBy = input.createdBy.trim();

    if (!createdBy) {
      throw new InventoryValidationError(
        "Belgeyi ekleyen kullanıcı boş bırakılamaz.",
      );
    }

    const documentDate = input.documentDate
      ? this.normalizeDate(
          input.documentDate,
          "Belge tarihi",
        )
      : undefined;

    return this.repository.saveDocument({
      id: this.createId(),
      tenantId: inspection.tenantId,
      inspectionId: inspection.id,
      type: input.type,
      createdBy,
      createdAt: this.now(),
      ...(input.inspectionItemId?.trim()
        ? {
            inspectionItemId:
              input.inspectionItemId.trim(),
          }
        : {}),
      ...(input.documentNumber?.trim()
        ? {
            documentNumber:
              input.documentNumber.trim(),
          }
        : {}),
      ...(documentDate !== undefined
        ? { documentDate }
        : {}),
      ...(input.fileName?.trim()
        ? { fileName: input.fileName.trim() }
        : {}),
      ...(input.fileUrl?.trim()
        ? { fileUrl: input.fileUrl.trim() }
        : {}),
      ...(input.notes?.trim()
        ? { notes: input.notes.trim() }
        : {}),
    });
  }

  async listDocuments(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityDocument[]> {
    await this.get(tenantId, inspectionId);

    return this.repository.listDocuments(
      tenantId.trim(),
      inspectionId.trim(),
    );
  }

  async createTask(
    input: CreateQualityTaskInput,
  ): Promise<QualityTask> {
    const inspection = await this.get(
      input.tenantId.trim(),
      input.inspectionId.trim(),
    );

    if (
      inspection.status === "completed" ||
      inspection.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş kalite kontrol için görev oluşturulamaz.",
      );
    }

    const priority = input.priority ?? 50;

    if (
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 100
    ) {
      throw new InventoryValidationError(
        "Görev önceliği 1 ile 100 arasında tam sayı olmalıdır.",
      );
    }

    const createdBy = input.createdBy.trim();

    if (!createdBy) {
      throw new InventoryValidationError(
        "Görevi oluşturan kullanıcı boş bırakılamaz.",
      );
    }

    const timestamp = this.now();

    return this.repository.saveTask({
      id: this.createId(),
      tenantId: inspection.tenantId,
      inspectionId: inspection.id,
      type: input.type,
      status: input.assignedUserId?.trim()
        ? "assigned"
        : "pending",
      priority,
      createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(input.inspectionItemId?.trim()
        ? {
            inspectionItemId:
              input.inspectionItemId.trim(),
          }
        : {}),
      ...(input.assignedUserId?.trim()
        ? {
            assignedUserId:
              input.assignedUserId.trim(),
          }
        : {}),
      ...(input.plannedAt
        ? {
            plannedAt: this.normalizeDate(
              input.plannedAt,
              "Görev planlama tarihi",
            ),
          }
        : {}),
      ...(input.notes?.trim()
        ? { notes: input.notes.trim() }
        : {}),
    });
  }

  async listTasks(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityTask[]> {
    await this.get(tenantId, inspectionId);

    return this.repository.listTasks(
      tenantId.trim(),
      inspectionId.trim(),
    );
  }

  async createException(input: {
    tenantId: string;
    inspectionId: string;
    inspectionItemId?: string;
    type: QualityExceptionType;
    message: string;
    ruleId?: string;
    sampleId?: string;
    expectedValue?: string;
    actualValue?: string;
  }): Promise<QualityException> {
    const inspection = await this.get(
      input.tenantId.trim(),
      input.inspectionId.trim(),
    );

    if (
      inspection.status === "completed" ||
      inspection.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş kalite kontrol için istisna oluşturulamaz.",
      );
    }

    const message = input.message.trim();

    if (!message) {
      throw new InventoryValidationError(
        "Kalite istisnası mesajı boş bırakılamaz.",
      );
    }

    if (input.inspectionItemId?.trim()) {
      const itemExists = inspection.items.some(
        (item) =>
          item.id === input.inspectionItemId?.trim(),
      );

      if (!itemExists) {
        throw new InventoryValidationError(
          "İstisnanın bağlı olduğu kalite kontrol satırı bulunamadı.",
        );
      }
    }

    return this.repository.saveException({
      id: this.createId(),
      tenantId: inspection.tenantId,
      inspectionId: inspection.id,
      type: input.type,
      message,
      resolved: false,
      createdAt: this.now(),
      ...(input.inspectionItemId?.trim()
        ? {
            inspectionItemId:
              input.inspectionItemId.trim(),
          }
        : {}),
      ...(input.ruleId?.trim()
        ? { ruleId: input.ruleId.trim() }
        : {}),
      ...(input.sampleId?.trim()
        ? { sampleId: input.sampleId.trim() }
        : {}),
      ...(input.expectedValue?.trim()
        ? {
            expectedValue:
              input.expectedValue.trim(),
          }
        : {}),
      ...(input.actualValue?.trim()
        ? { actualValue: input.actualValue.trim() }
        : {}),
    });
  }

  async resolveException(input: {
    tenantId: string;
    inspectionId: string;
    exceptionId: string;
    resolvedBy: string;
    resolutionNotes?: string;
  }): Promise<QualityException> {
    const inspection = await this.get(
      input.tenantId.trim(),
      input.inspectionId.trim(),
    );

    const exception = inspection.exceptions.find(
      (current) =>
        current.id === input.exceptionId.trim(),
    );

    if (!exception) {
      throw new InventoryValidationError(
        `Kalite istisnası bulunamadı: ${input.exceptionId}`,
      );
    }

    if (exception.resolved) {
      throw new InventoryValidationError(
        "Kalite istisnası daha önce çözülmüş.",
      );
    }

    const resolvedBy = input.resolvedBy.trim();

    if (!resolvedBy) {
      throw new InventoryValidationError(
        "İstisnayı çözen kullanıcı boş bırakılamaz.",
      );
    }

    return this.repository.saveException({
      ...exception,
      resolved: true,
      resolvedBy,
      resolvedAt: this.now(),
      ...(input.resolutionNotes?.trim()
        ? {
            resolutionNotes:
              input.resolutionNotes.trim(),
          }
        : {}),
    });
  }

  async listExceptions(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityException[]> {
    await this.get(tenantId, inspectionId);

    return this.repository.listExceptions(
      tenantId.trim(),
      inspectionId.trim(),
    );
  }

  async complete(
    tenantId: string,
    inspectionId: string,
    completedBy: string,
  ): Promise<QualityInspection> {
    const inspection = await this.get(
      tenantId,
      inspectionId,
    );

    if (inspection.status !== "waiting_result") {
      throw new InventoryValidationError(
        "Yalnızca sonuç bekleyen kalite kontrol tamamlanabilir.",
      );
    }

    const normalizedCompletedBy = completedBy.trim();

    if (!normalizedCompletedBy) {
      throw new InventoryValidationError(
        "Kalite kontrolü tamamlayan kullanıcı boş bırakılamaz.",
      );
    }

    if (inspection.items.length === 0) {
      throw new InventoryValidationError(
        "Kontrol satırı bulunmayan kalite kontrol tamamlanamaz.",
      );
    }

    const hasPendingItem = inspection.items.some(
      (item) => item.decision === "pending",
    );

    if (hasPendingItem) {
      throw new InventoryValidationError(
        "Kararı bekleyen kontrol satırları bulunduğu için kalite kontrol tamamlanamaz.",
      );
    }

    const finalDecision =
      this.resolveFinalDecision(inspection);

    const timestamp = this.now();

    return this.repository.save({
      ...inspection,
      status: "completed",
      finalDecision,
      completedAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async cancel(
    tenantId: string,
    inspectionId: string,
    reason: string,
  ): Promise<QualityInspection> {
    const inspection = await this.get(
      tenantId,
      inspectionId,
    );

    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      throw new InventoryValidationError(
        "İptal nedeni boş bırakılamaz.",
      );
    }

    if (
      inspection.status === "completed" ||
      inspection.status === "cancelled"
    ) {
      throw new InventoryValidationError(
        "Tamamlanmış veya iptal edilmiş kalite kontrol tekrar iptal edilemez.",
      );
    }

    const timestamp = this.now();

    return this.repository.save({
      ...inspection,
      status: "cancelled",
      cancellationReason: normalizedReason,
      cancelledAt: timestamp,
      updatedAt: timestamp,
    });
  }

  private resolveFinalDecision(
    inspection: QualityInspection,
  ): QualityInspection["finalDecision"] {
    const decisions = new Set(
      inspection.items.map((item) => item.decision),
    );

    if (decisions.has("return_to_supplier")) {
      return "return_to_supplier";
    }

    if (decisions.has("scrap")) {
      return "scrap";
    }

    if (decisions.has("rejected")) {
      return "rejected";
    }

    if (decisions.has("rework")) {
      return "rework";
    }

    if (decisions.has("hold")) {
      return "hold";
    }

    if (decisions.has("conditionally_accepted")) {
      return "conditionally_accepted";
    }

    return "accepted";
  }

  private normalizeDate(
    value: string,
    fieldName: string,
  ): string {
    const timestamp = Date.parse(value);

    if (Number.isNaN(timestamp)) {
      throw new InventoryValidationError(
        `${fieldName} geçerli bir tarih olmalıdır.`,
      );
    }

    return new Date(timestamp).toISOString();
  }

  private generateSampleNumber(): string {
    const date = this.now()
      .slice(0, 10)
      .replaceAll("-", "");

    const sequence = String(
      this.sequence(),
    ).padStart(6, "0");

    return `NUM-${date}-${sequence}`;
  }

  private generateInspectionNumber(): string {
    const date = this.now()
      .slice(0, 10)
      .replaceAll("-", "");

    const sequence = String(
      this.sequence(),
    ).padStart(6, "0");

    return `KK-${date}-${sequence}`;
  }
}
