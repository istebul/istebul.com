import type {
  QualityInspection,
  QualityInspectionListFilter,
} from "../types/QualityInspection";
import type { QualityInspectionItem } from "../types/QualityInspectionItem";
import type { QualitySample } from "../types/QualitySample";
import type { QualityDocument } from "../types/QualityDocument";
import type { QualityTask } from "../types/QualityTask";
import type { QualityException } from "../types/QualityException";
import type { QualityInspectionRepository } from "./QualityInspectionRepository";

export class InMemoryQualityInspectionRepository
  implements QualityInspectionRepository
{
  private readonly inspections =
    new Map<string, QualityInspection>();
  private readonly documents =
    new Map<string, QualityDocument>();
  private readonly tasks = new Map<string, QualityTask>();
  private readonly exceptions =
    new Map<string, QualityException>();

  async findById(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityInspection | null> {
    const inspection = this.inspections.get(inspectionId);

    if (!inspection || inspection.tenantId !== tenantId) {
      return null;
    }

    return structuredClone(inspection);
  }

  async findByNumber(
    tenantId: string,
    inspectionNumber: string,
  ): Promise<QualityInspection | null> {
    for (const inspection of this.inspections.values()) {
      if (
        inspection.tenantId === tenantId &&
        inspection.inspectionNumber === inspectionNumber
      ) {
        return structuredClone(inspection);
      }
    }

    return null;
  }

  async findByReceivingId(
    tenantId: string,
    receivingId: string,
  ): Promise<QualityInspection | null> {
    for (const inspection of this.inspections.values()) {
      if (
        inspection.tenantId === tenantId &&
        inspection.receivingId === receivingId
      ) {
        return structuredClone(inspection);
      }
    }

    return null;
  }

  async list(
    filter: QualityInspectionListFilter,
  ): Promise<QualityInspection[]> {
    const search = filter.search
      ?.trim()
      .toLocaleLowerCase("tr-TR");

    return [...this.inspections.values()]
      .filter((item) => item.tenantId === filter.tenantId)
      .filter((item) =>
        filter.warehouseId === undefined ||
        item.warehouseId === filter.warehouseId)
      .filter((item) =>
        filter.locationId === undefined ||
        item.locationId === filter.locationId)
      .filter((item) =>
        filter.receivingId === undefined ||
        item.receivingId === filter.receivingId)
      .filter((item) =>
        filter.status === undefined ||
        item.status === filter.status)
      .filter((item) =>
        filter.finalDecision === undefined ||
        item.finalDecision === filter.finalDecision)
      .filter((item) =>
        filter.referenceType === undefined ||
        item.referenceType === filter.referenceType)
      .filter((item) =>
        filter.referenceId === undefined ||
        item.referenceId === filter.referenceId)
      .filter((item) => {
        if (!search) return true;
        return (
          item.inspectionNumber
            .toLocaleLowerCase("tr-TR")
            .includes(search) ||
          item.referenceNumber
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true
        );
      })
      .sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt))
      .map((item) => structuredClone(item));
  }

  async save(
    inspection: QualityInspection,
  ): Promise<QualityInspection> {
    const stored = structuredClone(inspection);
    this.inspections.set(stored.id, stored);
    return structuredClone(stored);
  }

  async saveItem(
    item: QualityInspectionItem,
  ): Promise<QualityInspectionItem> {
    const inspection = this.inspections.get(item.inspectionId);
    if (!inspection || inspection.tenantId !== item.tenantId) {
      throw new Error("Kalite kontrol kaydı bulunamadı.");
    }

    const items = inspection.items.filter(
      (current) => current.id !== item.id,
    );
    items.push(structuredClone(item));
    items.sort((left, right) => left.lineNumber - right.lineNumber);

    this.inspections.set(inspection.id, {
      ...inspection,
      items,
      updatedAt: item.updatedAt,
    });

    return structuredClone(item);
  }

  async saveSample(sample: QualitySample): Promise<QualitySample> {
    const inspection = this.inspections.get(sample.inspectionId);
    if (!inspection || inspection.tenantId !== sample.tenantId) {
      throw new Error("Kalite kontrol kaydı bulunamadı.");
    }

    const samples = inspection.samples.filter(
      (current) => current.id !== sample.id,
    );
    samples.push(structuredClone(sample));

    this.inspections.set(inspection.id, {
      ...inspection,
      samples,
      updatedAt: sample.updatedAt,
    });

    return structuredClone(sample);
  }

  async saveDocument(document: QualityDocument): Promise<QualityDocument> {
    const stored = structuredClone(document);
    this.documents.set(stored.id, stored);
    return structuredClone(stored);
  }

  async saveTask(task: QualityTask): Promise<QualityTask> {
    const stored = structuredClone(task);
    this.tasks.set(stored.id, stored);
    return structuredClone(stored);
  }

  async saveException(
    exception: QualityException,
  ): Promise<QualityException> {
    const inspection = this.inspections.get(
      exception.inspectionId,
    );

    if (
      !inspection ||
      inspection.tenantId !== exception.tenantId
    ) {
      throw new Error(
        "Kalite kontrol kaydı bulunamadı.",
      );
    }

    const stored = structuredClone(exception);
    this.exceptions.set(stored.id, stored);

    const exceptions = inspection.exceptions.filter(
      (current) => current.id !== stored.id,
    );

    exceptions.push(structuredClone(stored));

    this.inspections.set(inspection.id, {
      ...inspection,
      exceptions,
    });

    return structuredClone(stored);
  }

  async listExceptions(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityException[]> {
    return [...this.exceptions.values()]
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          item.inspectionId === inspectionId,
      )
      .sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      )
      .map((item) => structuredClone(item));
  }

  async listDocuments(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityDocument[]> {
    return [...this.documents.values()]
      .filter((item) =>
        item.tenantId === tenantId &&
        item.inspectionId === inspectionId)
      .map((item) => structuredClone(item));
  }

  async listTasks(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityTask[]> {
    return [...this.tasks.values()]
      .filter((item) =>
        item.tenantId === tenantId &&
        item.inspectionId === inspectionId)
      .sort((left, right) =>
        left.priority - right.priority ||
        left.createdAt.localeCompare(right.createdAt))
      .map((item) => structuredClone(item));
  }
}
