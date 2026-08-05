import type {
  Packing,
  PackingListFilter,
} from "../types/Packing";
import type {
  PackingContainer,
} from "../types/PackingContainer";
import type {
  PackingException,
} from "../types/PackingException";
import type {
  PackingItem,
} from "../types/PackingItem";
import type {
  PackingLabel,
} from "../types/PackingLabel";
import type {
  PackingPackage,
} from "../types/PackingPackage";
import type {
  PackingSuggestion,
} from "../types/PackingSuggestion";
import type {
  PackingTask,
} from "../types/PackingTask";

export interface PackingRepository {
  findById(
    tenantId: string,
    packingId: string,
  ): Promise<Packing | null>;

  findByNumber(
    tenantId: string,
    packingNumber: string,
  ): Promise<Packing | null>;

  findByPickingId(
    tenantId: string,
    pickingId: string,
  ): Promise<Packing | null>;

  findByOrderId(
    tenantId: string,
    orderId: string,
  ): Promise<Packing | null>;

  findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<Packing | null>;

  list(
    filter: PackingListFilter,
  ): Promise<Packing[]>;

  save(
    packing: Packing,
  ): Promise<Packing>;

  saveItem(
    item: PackingItem,
  ): Promise<PackingItem>;

  savePackage(
    packingPackage: PackingPackage,
  ): Promise<PackingPackage>;

  saveLabel(
    label: PackingLabel,
  ): Promise<PackingLabel>;

  saveSuggestion(
    suggestion: PackingSuggestion,
  ): Promise<PackingSuggestion>;

  saveTask(
    task: PackingTask,
  ): Promise<PackingTask>;

  saveException(
    exception: PackingException,
  ): Promise<PackingException>;

  saveContainer(
    container: PackingContainer,
  ): Promise<PackingContainer>;

  findContainerById(
    tenantId: string,
    containerId: string,
  ): Promise<PackingContainer | null>;

  findContainerByCode(
    tenantId: string,
    code: string,
  ): Promise<PackingContainer | null>;

  listContainers(
    tenantId: string,
    activeOnly?: boolean,
  ): Promise<PackingContainer[]>;

  listPackages(
    tenantId: string,
    packingId: string,
  ): Promise<PackingPackage[]>;

  listLabels(
    tenantId: string,
    packingId: string,
  ): Promise<PackingLabel[]>;

  listSuggestions(
    tenantId: string,
    packingId: string,
  ): Promise<PackingSuggestion[]>;

  listTasks(
    tenantId: string,
    packingId: string,
  ): Promise<PackingTask[]>;

  listExceptions(
    tenantId: string,
    packingId: string,
  ): Promise<PackingException[]>;
}
