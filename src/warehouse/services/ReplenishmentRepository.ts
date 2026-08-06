import type {
  Replenishment,
  ReplenishmentListFilter,
} from "../types/Replenishment";
import type {
  ReplenishmentAllocation,
} from "../types/ReplenishmentAllocation";
import type {
  ReplenishmentDemand,
} from "../types/ReplenishmentDemand";
import type {
  ReplenishmentException,
} from "../types/ReplenishmentException";
import type {
  ReplenishmentItem,
} from "../types/ReplenishmentItem";
import type {
  ReplenishmentRule,
} from "../types/ReplenishmentRule";
import type {
  ReplenishmentSuggestion,
} from "../types/ReplenishmentSuggestion";
import type {
  ReplenishmentTask,
} from "../types/ReplenishmentTask";

export interface ReplenishmentRepository {
  findById(
    tenantId: string,
    replenishmentId: string,
  ): Promise<Replenishment | null>;

  findByNumber(
    tenantId: string,
    replenishmentNumber: string,
  ): Promise<Replenishment | null>;

  findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<Replenishment | null>;

  list(
    filter: ReplenishmentListFilter,
  ): Promise<Replenishment[]>;

  save(
    replenishment: Replenishment,
  ): Promise<Replenishment>;

  saveItem(
    item: ReplenishmentItem,
  ): Promise<ReplenishmentItem>;

  saveDemand(
    demand: ReplenishmentDemand,
  ): Promise<ReplenishmentDemand>;

  saveAllocation(
    allocation: ReplenishmentAllocation,
  ): Promise<ReplenishmentAllocation>;

  saveSuggestion(
    suggestion: ReplenishmentSuggestion,
  ): Promise<ReplenishmentSuggestion>;

  saveTask(
    task: ReplenishmentTask,
  ): Promise<ReplenishmentTask>;

  saveException(
    exception: ReplenishmentException,
  ): Promise<ReplenishmentException>;

  saveRule(
    rule: ReplenishmentRule,
  ): Promise<ReplenishmentRule>;

  findRuleById(
    tenantId: string,
    ruleId: string,
  ): Promise<ReplenishmentRule | null>;

  findRuleByCode(
    tenantId: string,
    code: string,
  ): Promise<ReplenishmentRule | null>;

  listRules(
    tenantId: string,
    activeOnly?: boolean,
  ): Promise<ReplenishmentRule[]>;

  listItems(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentItem[]>;

  listDemands(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentDemand[]>;

  listAllocations(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentAllocation[]>;

  listSuggestions(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentSuggestion[]>;

  listTasks(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentTask[]>;

  listExceptions(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentException[]>;
}
