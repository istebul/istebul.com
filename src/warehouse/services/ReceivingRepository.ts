import type {
  Receiving,
  ReceivingListFilter,
} from "../types/Receiving";
import type { ReceivingDocument } from "../types/ReceivingDocument";
import type { ReceivingItem } from "../types/ReceivingItem";
import type { ReceivingTask } from "../types/ReceivingTask";

export interface ReceivingRepository {
  findById(
    tenantId: string,
    receivingId: string,
  ): Promise<Receiving | null>;

  findByNumber(
    tenantId: string,
    receivingNumber: string,
  ): Promise<Receiving | null>;

  findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<Receiving | null>;

  list(filter: ReceivingListFilter): Promise<Receiving[]>;

  save(receiving: Receiving): Promise<Receiving>;

  saveItem(item: ReceivingItem): Promise<ReceivingItem>;

  saveDocument(
    document: ReceivingDocument,
  ): Promise<ReceivingDocument>;

  saveTask(task: ReceivingTask): Promise<ReceivingTask>;

  listDocuments(
    tenantId: string,
    receivingId: string,
  ): Promise<ReceivingDocument[]>;

  listTasks(
    tenantId: string,
    receivingId: string,
  ): Promise<ReceivingTask[]>;
}
