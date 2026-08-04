import type {
  Receiving,
  ReceivingListFilter,
} from "../types/Receiving";
import type { ReceivingDocument } from "../types/ReceivingDocument";
import type { ReceivingItem } from "../types/ReceivingItem";
import type { ReceivingTask } from "../types/ReceivingTask";
import type { ReceivingRepository } from "./ReceivingRepository";

export class InMemoryReceivingRepository
  implements ReceivingRepository
{
  private readonly receivings = new Map<string, Receiving>();
  private readonly documents =
    new Map<string, ReceivingDocument>();
  private readonly tasks = new Map<string, ReceivingTask>();

  async findById(
    tenantId: string,
    receivingId: string,
  ): Promise<Receiving | null> {
    const receiving = this.receivings.get(receivingId);

    if (!receiving || receiving.tenantId !== tenantId) {
      return null;
    }

    return structuredClone(receiving);
  }

  async findByNumber(
    tenantId: string,
    receivingNumber: string,
  ): Promise<Receiving | null> {
    for (const receiving of this.receivings.values()) {
      if (
        receiving.tenantId === tenantId &&
        receiving.receivingNumber === receivingNumber
      ) {
        return structuredClone(receiving);
      }
    }

    return null;
  }

  async findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<Receiving | null> {
    for (const receiving of this.receivings.values()) {
      if (
        receiving.tenantId === tenantId &&
        receiving.referenceType === referenceType &&
        receiving.referenceId === referenceId
      ) {
        return structuredClone(receiving);
      }
    }

    return null;
  }

  async list(filter: ReceivingListFilter): Promise<Receiving[]> {
    const search = filter.search
      ?.trim()
      .toLocaleLowerCase("tr-TR");

    return [...this.receivings.values()]
      .filter(
        (receiving) => receiving.tenantId === filter.tenantId,
      )
      .filter(
        (receiving) =>
          filter.warehouseId === undefined ||
          receiving.warehouseId === filter.warehouseId,
      )
      .filter(
        (receiving) =>
          filter.receivingLocationId === undefined ||
          receiving.receivingLocationId ===
            filter.receivingLocationId,
      )
      .filter(
        (receiving) =>
          filter.source === undefined ||
          receiving.source === filter.source,
      )
      .filter(
        (receiving) =>
          filter.status === undefined ||
          receiving.status === filter.status,
      )
      .filter(
        (receiving) =>
          filter.supplierId === undefined ||
          receiving.supplierId === filter.supplierId,
      )
      .filter(
        (receiving) =>
          filter.referenceType === undefined ||
          receiving.referenceType === filter.referenceType,
      )
      .filter(
        (receiving) =>
          filter.referenceId === undefined ||
          receiving.referenceId === filter.referenceId,
      )
      .filter((receiving) => {
        if (!search) {
          return true;
        }

        return (
          receiving.receivingNumber
            .toLocaleLowerCase("tr-TR")
            .includes(search) ||
          receiving.referenceNumber
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true ||
          receiving.supplierName
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true
        );
      })
      .sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      )
      .map((receiving) => structuredClone(receiving));
  }

  async save(receiving: Receiving): Promise<Receiving> {
    const stored = structuredClone(receiving);
    this.receivings.set(stored.id, stored);

    return structuredClone(stored);
  }

  async saveItem(item: ReceivingItem): Promise<ReceivingItem> {
    const receiving = this.receivings.get(item.receivingId);

    if (!receiving || receiving.tenantId !== item.tenantId) {
      throw new Error("Mal kabul kaydı bulunamadı.");
    }

    const items = receiving.items.filter(
      (current) => current.id !== item.id,
    );

    items.push(structuredClone(item));
    items.sort((left, right) => left.lineNumber - right.lineNumber);

    this.receivings.set(receiving.id, {
      ...receiving,
      items,
      updatedAt: item.updatedAt,
    });

    return structuredClone(item);
  }

  async saveDocument(
    document: ReceivingDocument,
  ): Promise<ReceivingDocument> {
    const stored = structuredClone(document);
    this.documents.set(stored.id, stored);

    return structuredClone(stored);
  }

  async saveTask(task: ReceivingTask): Promise<ReceivingTask> {
    const stored = structuredClone(task);
    this.tasks.set(stored.id, stored);

    return structuredClone(stored);
  }

  async listDocuments(
    tenantId: string,
    receivingId: string,
  ): Promise<ReceivingDocument[]> {
    return [...this.documents.values()]
      .filter(
        (document) =>
          document.tenantId === tenantId &&
          document.receivingId === receivingId,
      )
      .sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      )
      .map((document) => structuredClone(document));
  }

  async listTasks(
    tenantId: string,
    receivingId: string,
  ): Promise<ReceivingTask[]> {
    return [...this.tasks.values()]
      .filter(
        (task) =>
          task.tenantId === tenantId &&
          task.receivingId === receivingId,
      )
      .sort((left, right) =>
        left.priority - right.priority ||
        left.createdAt.localeCompare(right.createdAt),
      )
      .map((task) => structuredClone(task));
  }
}
