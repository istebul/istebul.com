import type {
  Putaway,
  PutawayListFilter,
} from "../types/Putaway";
import type { PutawayException } from "../types/PutawayException";
import type { PutawayItem } from "../types/PutawayItem";
import type { PutawaySuggestion } from "../types/PutawaySuggestion";
import type { PutawayTask } from "../types/PutawayTask";

export interface PutawayRepository {
  findById(
    tenantId: string,
    putawayId: string,
  ): Promise<Putaway | null>;

  findByNumber(
    tenantId: string,
    putawayNumber: string,
  ): Promise<Putaway | null>;

  findByReceivingId(
    tenantId: string,
    receivingId: string,
  ): Promise<Putaway | null>;

  findByQualityInspectionId(
    tenantId: string,
    qualityInspectionId: string,
  ): Promise<Putaway | null>;

  list(filter: PutawayListFilter): Promise<Putaway[]>;

  save(putaway: Putaway): Promise<Putaway>;

  saveItem(item: PutawayItem): Promise<PutawayItem>;

  saveSuggestion(
    suggestion: PutawaySuggestion,
  ): Promise<PutawaySuggestion>;

  saveTask(task: PutawayTask): Promise<PutawayTask>;

  saveException(
    exception: PutawayException,
  ): Promise<PutawayException>;

  listSuggestions(
    tenantId: string,
    putawayId: string,
  ): Promise<PutawaySuggestion[]>;

  listTasks(
    tenantId: string,
    putawayId: string,
  ): Promise<PutawayTask[]>;

  listExceptions(
    tenantId: string,
    putawayId: string,
  ): Promise<PutawayException[]>;
}
