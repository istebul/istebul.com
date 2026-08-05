import type {
  Picking,
  PickingListFilter,
} from "../types/Picking";
import type { PickingBatch } from "../types/PickingBatch";
import type { PickingException } from "../types/PickingException";
import type { PickingItem } from "../types/PickingItem";
import type { PickingRoute } from "../types/PickingRoute";
import type { PickingSuggestion } from "../types/PickingSuggestion";
import type { PickingTask } from "../types/PickingTask";
import type { PickingWave } from "../types/PickingWave";
import type { PickingRepository } from "./PickingRepository";

export class InMemoryPickingRepository
  implements PickingRepository
{
  private readonly pickings = new Map<string, Picking>();
  private readonly suggestions =
    new Map<string, PickingSuggestion>();
  private readonly tasks = new Map<string, PickingTask>();
  private readonly routes = new Map<string, PickingRoute>();
  private readonly exceptions =
    new Map<string, PickingException>();
  private readonly waves = new Map<string, PickingWave>();
  private readonly batches = new Map<string, PickingBatch>();

  async findById(
    tenantId: string,
    pickingId: string,
  ): Promise<Picking | null> {
    const picking = this.pickings.get(pickingId);

    if (!picking || picking.tenantId !== tenantId) {
      return null;
    }

    return structuredClone(picking);
  }

  async findByNumber(
    tenantId: string,
    pickingNumber: string,
  ): Promise<Picking | null> {
    for (const picking of this.pickings.values()) {
      if (
        picking.tenantId === tenantId &&
        picking.pickingNumber === pickingNumber
      ) {
        return structuredClone(picking);
      }
    }

    return null;
  }

  async findByOrderId(
    tenantId: string,
    orderId: string,
  ): Promise<Picking | null> {
    for (const picking of this.pickings.values()) {
      if (
        picking.tenantId === tenantId &&
        picking.orderId === orderId
      ) {
        return structuredClone(picking);
      }
    }

    return null;
  }

  async list(filter: PickingListFilter): Promise<Picking[]> {
    const search = filter.search
      ?.trim()
      .toLocaleLowerCase("tr-TR");

    return [...this.pickings.values()]
      .filter(
        (picking) =>
          picking.tenantId === filter.tenantId,
      )
      .filter(
        (picking) =>
          filter.warehouseId === undefined ||
          picking.warehouseId === filter.warehouseId,
      )
      .filter(
        (picking) =>
          filter.destinationLocationId === undefined ||
          picking.destinationLocationId ===
            filter.destinationLocationId,
      )
      .filter(
        (picking) =>
          filter.strategy === undefined ||
          picking.strategy === filter.strategy,
      )
      .filter(
        (picking) =>
          filter.status === undefined ||
          picking.status === filter.status,
      )
      .filter(
        (picking) =>
          filter.orderId === undefined ||
          picking.orderId === filter.orderId,
      )
      .filter(
        (picking) =>
          filter.waveId === undefined ||
          picking.waveId === filter.waveId,
      )
      .filter(
        (picking) =>
          filter.batchId === undefined ||
          picking.batchId === filter.batchId,
      )
      .filter(
        (picking) =>
          filter.referenceType === undefined ||
          picking.referenceType === filter.referenceType,
      )
      .filter(
        (picking) =>
          filter.referenceId === undefined ||
          picking.referenceId === filter.referenceId,
      )
      .filter((picking) => {
        if (!search) {
          return true;
        }

        return (
          picking.pickingNumber
            .toLocaleLowerCase("tr-TR")
            .includes(search) ||
          picking.orderNumber
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true ||
          picking.referenceNumber
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true
        );
      })
      .sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      )
      .map((picking) => structuredClone(picking));
  }

  async save(picking: Picking): Promise<Picking> {
    const stored = structuredClone(picking);
    this.pickings.set(stored.id, stored);

    return structuredClone(stored);
  }

  async saveItem(item: PickingItem): Promise<PickingItem> {
    const picking = this.pickings.get(item.pickingId);

    if (!picking || picking.tenantId !== item.tenantId) {
      throw new Error("Toplama kaydı bulunamadı.");
    }

    const items = picking.items.filter(
      (current) => current.id !== item.id,
    );

    items.push(structuredClone(item));
    items.sort(
      (left, right) => left.lineNumber - right.lineNumber,
    );

    this.pickings.set(picking.id, {
      ...picking,
      items,
      updatedAt: item.updatedAt,
    });

    return structuredClone(item);
  }

  async saveSuggestion(
    suggestion: PickingSuggestion,
  ): Promise<PickingSuggestion> {
    const picking = this.pickings.get(
      suggestion.pickingId,
    );

    if (
      !picking ||
      picking.tenantId !== suggestion.tenantId
    ) {
      throw new Error("Toplama kaydı bulunamadı.");
    }

    const stored = structuredClone(suggestion);
    this.suggestions.set(stored.id, stored);

    const suggestions = picking.suggestions.filter(
      (current) => current.id !== stored.id,
    );

    suggestions.push(structuredClone(stored));

    this.pickings.set(picking.id, {
      ...picking,
      suggestions,
    });

    return structuredClone(stored);
  }

  async saveTask(task: PickingTask): Promise<PickingTask> {
    const stored = structuredClone(task);
    this.tasks.set(stored.id, stored);

    return structuredClone(stored);
  }

  async saveRoute(route: PickingRoute): Promise<PickingRoute> {
    const picking = this.pickings.get(route.pickingId);

    if (!picking || picking.tenantId !== route.tenantId) {
      throw new Error("Toplama kaydı bulunamadı.");
    }

    const stored = structuredClone(route);
    this.routes.set(stored.id, stored);

    const routes = picking.routes.filter(
      (current) => current.id !== stored.id,
    );

    routes.push(structuredClone(stored));

    this.pickings.set(picking.id, {
      ...picking,
      routes,
    });

    return structuredClone(stored);
  }

  async saveException(
    exception: PickingException,
  ): Promise<PickingException> {
    const picking = this.pickings.get(
      exception.pickingId,
    );

    if (
      !picking ||
      picking.tenantId !== exception.tenantId
    ) {
      throw new Error("Toplama kaydı bulunamadı.");
    }

    const stored = structuredClone(exception);
    this.exceptions.set(stored.id, stored);

    const exceptions = picking.exceptions.filter(
      (current) => current.id !== stored.id,
    );

    exceptions.push(structuredClone(stored));

    this.pickings.set(picking.id, {
      ...picking,
      exceptions,
    });

    return structuredClone(stored);
  }

  async saveWave(wave: PickingWave): Promise<PickingWave> {
    const stored = structuredClone(wave);
    this.waves.set(stored.id, stored);

    return structuredClone(stored);
  }

  async saveBatch(batch: PickingBatch): Promise<PickingBatch> {
    const stored = structuredClone(batch);
    this.batches.set(stored.id, stored);

    return structuredClone(stored);
  }

  async listSuggestions(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingSuggestion[]> {
    return [...this.suggestions.values()]
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          item.pickingId === pickingId,
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
    pickingId: string,
  ): Promise<PickingTask[]> {
    return [...this.tasks.values()]
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          item.pickingId === pickingId,
      )
      .sort(
        (left, right) =>
          left.sequence - right.sequence ||
          left.priority - right.priority,
      )
      .map((item) => structuredClone(item));
  }

  async listRoutes(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingRoute[]> {
    return [...this.routes.values()]
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          item.pickingId === pickingId,
      )
      .sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      )
      .map((item) => structuredClone(item));
  }

  async listExceptions(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingException[]> {
    return [...this.exceptions.values()]
      .filter(
        (item) =>
          item.tenantId === tenantId &&
          item.pickingId === pickingId,
      )
      .sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      )
      .map((item) => structuredClone(item));
  }

  async listWaves(
    tenantId: string,
    warehouseId?: string,
  ): Promise<PickingWave[]> {
    return [...this.waves.values()]
      .filter((wave) => wave.tenantId === tenantId)
      .filter(
        (wave) =>
          warehouseId === undefined ||
          wave.warehouseId === warehouseId,
      )
      .sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      )
      .map((wave) => structuredClone(wave));
  }

  async listBatches(
    tenantId: string,
    warehouseId?: string,
  ): Promise<PickingBatch[]> {
    return [...this.batches.values()]
      .filter((batch) => batch.tenantId === tenantId)
      .filter(
        (batch) =>
          warehouseId === undefined ||
          batch.warehouseId === warehouseId,
      )
      .sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      )
      .map((batch) => structuredClone(batch));
  }
}
