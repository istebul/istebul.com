import type {
  Wave,
  WaveListFilter,
} from "../types/Wave";
import type {
  WaveAllocation,
} from "../types/WaveAllocation";
import type {
  WaveCapacity,
} from "../types/WaveCapacity";
import type {
  WaveException,
} from "../types/WaveException";
import type {
  WaveItem,
} from "../types/WaveItem";
import type {
  WaveOrder,
} from "../types/WaveOrder";
import type {
  WaveRelease,
} from "../types/WaveRelease";
import type {
  WaveRule,
} from "../types/WaveRule";
import type {
  WaveSchedule,
} from "../types/WaveSchedule";
import type {
  WaveTask,
} from "../types/WaveTask";

export interface WaveRepository {
  findById(
    tenantId: string,
    waveId: string,
  ): Promise<Wave | null>;

  findByNumber(
    tenantId: string,
    waveNumber: string,
  ): Promise<Wave | null>;

  list(
    filter: WaveListFilter,
  ): Promise<Wave[]>;

  save(
    wave: Wave,
  ): Promise<Wave>;

  saveOrder(
    order: WaveOrder,
  ): Promise<WaveOrder>;

  saveItem(
    item: WaveItem,
  ): Promise<WaveItem>;

  saveAllocation(
    allocation: WaveAllocation,
  ): Promise<WaveAllocation>;

  saveTask(
    task: WaveTask,
  ): Promise<WaveTask>;

  saveCapacity(
    capacity: WaveCapacity,
  ): Promise<WaveCapacity>;

  saveRelease(
    release: WaveRelease,
  ): Promise<WaveRelease>;

  saveException(
    exception: WaveException,
  ): Promise<WaveException>;

  saveRule(
    rule: WaveRule,
  ): Promise<WaveRule>;

  saveSchedule(
    schedule: WaveSchedule,
  ): Promise<WaveSchedule>;

  findRuleById(
    tenantId: string,
    ruleId: string,
  ): Promise<WaveRule | null>;

  findRuleByCode(
    tenantId: string,
    code: string,
  ): Promise<WaveRule | null>;

  listRules(
    tenantId: string,
    activeOnly?: boolean,
  ): Promise<WaveRule[]>;

  findScheduleById(
    tenantId: string,
    scheduleId: string,
  ): Promise<WaveSchedule | null>;

  listSchedules(
    tenantId: string,
    activeOnly?: boolean,
  ): Promise<WaveSchedule[]>;

  listOrders(
    tenantId: string,
    waveId: string,
  ): Promise<WaveOrder[]>;

  listItems(
    tenantId: string,
    waveId: string,
  ): Promise<WaveItem[]>;

  listAllocations(
    tenantId: string,
    waveId: string,
  ): Promise<WaveAllocation[]>;

  listTasks(
    tenantId: string,
    waveId: string,
  ): Promise<WaveTask[]>;

  listReleases(
    tenantId: string,
    waveId: string,
  ): Promise<WaveRelease[]>;

  listExceptions(
    tenantId: string,
    waveId: string,
  ): Promise<WaveException[]>;
}
