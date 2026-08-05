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

export interface PickingRepository {
  findById(
    tenantId: string,
    pickingId: string,
  ): Promise<Picking | null>;

  findByNumber(
    tenantId: string,
    pickingNumber: string,
  ): Promise<Picking | null>;

  findByOrderId(
    tenantId: string,
    orderId: string,
  ): Promise<Picking | null>;

  list(filter: PickingListFilter): Promise<Picking[]>;

  save(picking: Picking): Promise<Picking>;

  saveItem(item: PickingItem): Promise<PickingItem>;

  saveSuggestion(
    suggestion: PickingSuggestion,
  ): Promise<PickingSuggestion>;

  saveTask(task: PickingTask): Promise<PickingTask>;

  saveRoute(route: PickingRoute): Promise<PickingRoute>;

  saveException(
    exception: PickingException,
  ): Promise<PickingException>;

  saveWave(wave: PickingWave): Promise<PickingWave>;

  saveBatch(batch: PickingBatch): Promise<PickingBatch>;

  listSuggestions(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingSuggestion[]>;

  listTasks(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingTask[]>;

  listRoutes(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingRoute[]>;

  listExceptions(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingException[]>;

  listWaves(
    tenantId: string,
    warehouseId?: string,
  ): Promise<PickingWave[]>;

  listBatches(
    tenantId: string,
    warehouseId?: string,
  ): Promise<PickingBatch[]>;
}
