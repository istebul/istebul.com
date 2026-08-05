import type {
  CycleCount,
  CycleCountListFilter,
} from "../types/CycleCount";
import type {
  CycleCountAdjustment,
} from "../types/CycleCountAdjustment";
import type {
  CycleCountApproval,
} from "../types/CycleCountApproval";
import type {
  CycleCountException,
} from "../types/CycleCountException";
import type {
  CycleCountItem,
} from "../types/CycleCountItem";
import type {
  CycleCountResult,
} from "../types/CycleCountResult";
import type {
  CycleCountRule,
} from "../types/CycleCountRule";
import type {
  CycleCountSchedule,
} from "../types/CycleCountSchedule";
import type {
  CycleCountTask,
} from "../types/CycleCountTask";

export interface CycleCountRepository {
  findById(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCount | null>;

  findByNumber(
    tenantId: string,
    cycleCountNumber: string,
  ): Promise<CycleCount | null>;

  findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<CycleCount | null>;

  list(
    filter: CycleCountListFilter,
  ): Promise<CycleCount[]>;

  save(
    cycleCount: CycleCount,
  ): Promise<CycleCount>;

  saveItem(
    item: CycleCountItem,
  ): Promise<CycleCountItem>;

  saveResult(
    result: CycleCountResult,
  ): Promise<CycleCountResult>;

  saveTask(
    task: CycleCountTask,
  ): Promise<CycleCountTask>;

  saveException(
    exception: CycleCountException,
  ): Promise<CycleCountException>;

  saveAdjustment(
    adjustment: CycleCountAdjustment,
  ): Promise<CycleCountAdjustment>;

  saveApproval(
    approval: CycleCountApproval,
  ): Promise<CycleCountApproval>;

  saveRule(
    rule: CycleCountRule,
  ): Promise<CycleCountRule>;

  saveSchedule(
    schedule: CycleCountSchedule,
  ): Promise<CycleCountSchedule>;

  findRuleById(
    tenantId: string,
    ruleId: string,
  ): Promise<CycleCountRule | null>;

  findRuleByCode(
    tenantId: string,
    code: string,
  ): Promise<CycleCountRule | null>;

  listRules(
    tenantId: string,
    activeOnly?: boolean,
  ): Promise<CycleCountRule[]>;

  findScheduleById(
    tenantId: string,
    scheduleId: string,
  ): Promise<CycleCountSchedule | null>;

  listSchedules(
    tenantId: string,
    warehouseId?: string,
    activeOnly?: boolean,
  ): Promise<CycleCountSchedule[]>;

  listItems(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountItem[]>;

  listResults(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountResult[]>;

  listTasks(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountTask[]>;

  listExceptions(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountException[]>;

  listAdjustments(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountAdjustment[]>;

  listApprovals(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountApproval[]>;
}
