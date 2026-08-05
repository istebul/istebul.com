import type {
  Putaway,
  PutawayListFilter,
} from "../types/Putaway";
import type { PutawayException } from "../types/PutawayException";
import type { PutawayItem } from "../types/PutawayItem";
import type { PutawaySuggestion } from "../types/PutawaySuggestion";
import type { PutawayTask } from "../types/PutawayTask";
import type { PutawayRepository } from "./PutawayRepository";

export class InMemoryPutawayRepository
  implements PutawayRepository
{
  private readonly putaways = new Map<string, Putaway>();
  private readonly suggestions =
    new Map<string, PutawaySuggestion>();
  private readonly tasks = new Map<string, PutawayTask>();
  private readonly exceptions =
    new Map<string, PutawayException>();

  async findById(
    tenantId: string,
    putawayId: string,
  ): Promise<Putaway | null> {
    const putaway = this.putaways.get(putawayId);

    if (!putaway || putaway.tenantId !== tenantId) {
      return null;
    }

    return structuredClone(putaway);
  }

  async findByNumber(
    tenantId: string,
    putawayNumber: string,
  ): Promise<Putaway | null> {
    for (const putaway of this.putaways.values()) {
      if (
        putaway.tenantId === tenantId &&
        putaway.putawayNumber === putawayNumber
      ) {
        return structuredClone(putaway);
      }
    }

    return null;
  }

  async findByReceivingId(
    tenantId: string,
    receivingId: string,
  ): Promise<Putaway | null> {
    for (const putaway of this.putaways.values()) {
      if (
        putaway.tenantId === tenantId &&
        putaway.receivingId === receivingId
      ) {
        return structuredClone(putaway);
      }
    }

    return null;
  }

  async findByQualityInspectionId(
    tenantId: string,
    qualityInspectionId: string,
  ): Promise<Putaway | null> {
    for (const putaway of this.putaways.values()) {
      if (
        putaway.tenantId === tenantId &&
        putaway.qualityInspectionId ===
          qualityInspectionId
      ) {
        return structuredClone(putaway);
      }
    }

    return null;
  }

  async list(filter: PutawayListFilter): Promise<Putaway[]> {
    const search = filter.search
      ?.trim()
      .toLocaleLowerCase("tr-TR");

    return [...this.putaways.values()]
      .filter(
        (putaway) =>
          putaway.tenantId === filter.tenantId,
      )
      .filter(
        (putaway) =>
          filter.warehouseId === undefined ||
          putaway.warehouseId === filter.warehouseId,
      )
      .filter(
        (putaway) =>
          filter.sourceLocationId === undefined ||
          putaway.sourceLocationId ===
            filter.sourceLocationId,
      )
      .filter(
        (putaway) =>
          filter.strategy === undefined ||
          putaway.strategy === filter.strategy,
      )
      .filter(
        (putaway) =>
          filter.status === undefined ||
          putaway.status === filter.status,
      )
      .filter(
        (putaway) =>
          filter.receivingId === undefined ||
          putaway.receivingId === filter.receivingId,
      )
      .filter(
        (putaway) =>
          filter.qualityInspectionId === undefined ||
          putaway.qualityInspectionId ===
            filter.qualityInspectionId,
      )
      .filter(
        (putaway) =>
          filter.referenceType === undefined ||
          putaway.referenceType === filter.referenceType,
      )
      .filter(
        (putaway) =>
          filter.referenceId === undefined ||
          putaway.referenceId === filter.referenceId,
      )
      .filter((putaway) => {
        if (!search) {
          return true;
        }

        return (
          putaway.putawayNumber
            .toLocaleLowerCase("tr-TR")
            .includes(search) ||
          putaway.referenceNumber
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true
        );
      })
      .sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      )
      .map((putaway) => structuredClone(putaway));
  }

  async save(putaway: Putaway): Promise<Putaway> {
    const stored = structuredClone(putaway);
    this.putaways.set(stored.id, stored);

    return structuredClone(stored);
  }

  async saveItem(item: PutawayItem): Promise<PutawayItem> {
    const putaway = this.putaways.get(item.putawayId);

    if (!putaway || putaway.tenantId !== item.tenantId) {
      throw new Error("Yerleştirme kaydı bulunamadı.");
    }

    const items = putaway.items.filter(
      (current) => current.id !== item.id,
    );

    items.push(structuredClone(item));
    items.sort(
      (left, right) => left.lineNumber - right.lineNumber,
    );

    this.putaways.set(putaway.id, {
      ...putaway,
      items,
      updatedAt: item.updatedAt,
    });

    return structuredClone(item);
  }

  async saveSuggestion(
    suggestion: PutawaySuggestion,
  ): Promise<PutawaySuggestion> {
    const putaway = this.putaways.get(
      suggestion.putawayId,
    );

    if (
      !putaway ||
      putaway.tenantId !== suggestion.tenantId
    ) {
      throw new Error("Yerleştirme kaydı bulunamadı.");
    }

    const stored = structuredClone(suggestion);
    this.suggestions.set(stored.id, stored);

    const suggestions = putaway.suggestions.filter(
      (current) => current.id !== stored.id,
    );

    suggestions.push(structuredClone(stored));

    this.putaways.set(putaway.id, {
      ...putaway,
      suggestions,
    });

    return structuredClone(stored);
  }

  async saveTask(task: PutawayTask): Promise<PutawayTask> {
    const stored = structuredClone(task);
    this.tasks.set(stored.id, stored);

    return structuredClone(stored);
  }

  async saveException(
    exception: PutawayException,
  ): Promise<PutawayException> {
    const putaway = this.putaways.get(
      exception.putawayId,
    );

    if (
      !putaway ||
      putaway.tenantId !== exception.tenantId
    ) {
      throw new Error("Yerleştirme kaydı bulunamadı.");
    }

    const stored = structuredClone(exception);
    this.exceptions.set(stored.id, stored);

    const exceptions = putaway.exceptions.filter(
      (current) => current.id !== stored.id,
    );

    exceptions.push(structuredClone(stored));

    this.putaways.set(putaway.id, {
      ...putaway,
      exceptions,
    });

    return structuredClone(stored);
  }

  async listSuggestions(
    tenantId: string,
    putawayId: string,
  ): Promise<PutawaySuggestion[]> {
    return [...this.suggestions.values()]
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          item.putawayId === putawayId,
      )
      .sort(
        (left, right) =>
          right.score.totalScore -
          left.score.totalScore,
      )
      .map((item) => structuredClone(item));
  }

  async listTasks(
    tenantId: string,
    putawayId: string,
  ): Promise<PutawayTask[]> {
    return [...this.tasks.values()]
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          item.putawayId === putawayId,
      )
      .sort(
        (left, right) =>
          left.priority - right.priority ||
          left.createdAt.localeCompare(right.createdAt),
      )
      .map((item) => structuredClone(item));
  }

  async listExceptions(
    tenantId: string,
    putawayId: string,
  ): Promise<PutawayException[]> {
    return [...this.exceptions.values()]
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          item.putawayId === putawayId,
      )
      .sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      )
      .map((item) => structuredClone(item));
  }
}
