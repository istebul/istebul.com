import type {
  QualityInspection,
  QualityInspectionListFilter,
} from "../types/QualityInspection";
import type { QualityInspectionItem } from "../types/QualityInspectionItem";
import type { QualitySample } from "../types/QualitySample";
import type { QualityDocument } from "../types/QualityDocument";
import type { QualityTask } from "../types/QualityTask";
import type { QualityException } from "../types/QualityException";

export interface QualityInspectionRepository {
  findById(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityInspection | null>;

  findByNumber(
    tenantId: string,
    inspectionNumber: string,
  ): Promise<QualityInspection | null>;

  findByReceivingId(
    tenantId: string,
    receivingId: string,
  ): Promise<QualityInspection | null>;

  list(
    filter: QualityInspectionListFilter,
  ): Promise<QualityInspection[]>;

  save(
    inspection: QualityInspection,
  ): Promise<QualityInspection>;

  saveItem(
    item: QualityInspectionItem,
  ): Promise<QualityInspectionItem>;

  saveSample(sample: QualitySample): Promise<QualitySample>;

  saveDocument(
    document: QualityDocument,
  ): Promise<QualityDocument>;

  saveTask(task: QualityTask): Promise<QualityTask>;

  saveException(
    exception: QualityException,
  ): Promise<QualityException>;

  listExceptions(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityException[]>;

  listDocuments(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityDocument[]>;

  listTasks(
    tenantId: string,
    inspectionId: string,
  ): Promise<QualityTask[]>;
}
