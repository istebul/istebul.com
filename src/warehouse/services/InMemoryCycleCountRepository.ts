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
import type {
  CycleCountRepository,
} from "./CycleCountRepository";

export class InMemoryCycleCountRepository
  implements CycleCountRepository
{
  private readonly cycleCounts =
    new Map<string, CycleCount>();

  private readonly results =
    new Map<string, CycleCountResult>();

  private readonly tasks =
    new Map<string, CycleCountTask>();

  private readonly exceptions =
    new Map<string, CycleCountException>();

  private readonly adjustments =
    new Map<string, CycleCountAdjustment>();

  private readonly approvals =
    new Map<string, CycleCountApproval>();

  private readonly rules =
    new Map<string, CycleCountRule>();

  private readonly schedules =
    new Map<string, CycleCountSchedule>();

  async findById(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCount | null> {
    const cycleCount =
      this.cycleCounts.get(cycleCountId);

    if (
      !cycleCount ||
      cycleCount.tenantId !== tenantId
    ) {
      return null;
    }

    return structuredClone(cycleCount);
  }

  async findByNumber(
    tenantId: string,
    cycleCountNumber: string,
  ): Promise<CycleCount | null> {
    for (
      const cycleCount
      of this.cycleCounts.values()
    ) {
      if (
        cycleCount.tenantId === tenantId &&
        cycleCount.cycleCountNumber ===
          cycleCountNumber
      ) {
        return structuredClone(cycleCount);
      }
    }

    return null;
  }

  async findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<CycleCount | null> {
    for (
      const cycleCount
      of this.cycleCounts.values()
    ) {
      if (
        cycleCount.tenantId === tenantId &&
        cycleCount.referenceType ===
          referenceType &&
        cycleCount.referenceId ===
          referenceId
      ) {
        return structuredClone(cycleCount);
      }
    }

    return null;
  }

  async list(
    filter: CycleCountListFilter,
  ): Promise<CycleCount[]> {
    const search =
      filter.search
        ?.trim()
        .toLocaleLowerCase("tr-TR");

    return [...this.cycleCounts.values()]
      .filter(
        (cycleCount) =>
          cycleCount.tenantId ===
          filter.tenantId,
      )
      .filter(
        (cycleCount) =>
          filter.warehouseId ===
            undefined ||
          cycleCount.warehouseId ===
            filter.warehouseId,
      )
      .filter(
        (cycleCount) =>
          filter.strategy === undefined ||
          cycleCount.strategy ===
            filter.strategy,
      )
      .filter(
        (cycleCount) =>
          filter.status === undefined ||
          cycleCount.status ===
            filter.status,
      )
      .filter(
        (cycleCount) =>
          filter.ruleId === undefined ||
          cycleCount.ruleId ===
            filter.ruleId,
      )
      .filter(
        (cycleCount) =>
          filter.scheduleId ===
            undefined ||
          cycleCount.scheduleId ===
            filter.scheduleId,
      )
      .filter(
        (cycleCount) =>
          filter.plannedFrom ===
            undefined ||
          (
            cycleCount.plannedAt !==
              undefined &&
            cycleCount.plannedAt >=
              filter.plannedFrom
          ),
      )
      .filter(
        (cycleCount) =>
          filter.plannedTo ===
            undefined ||
          (
            cycleCount.plannedAt !==
              undefined &&
            cycleCount.plannedAt <=
              filter.plannedTo
          ),
      )
      .filter((cycleCount) => {
        if (!search) {
          return true;
        }

        return (
          cycleCount.cycleCountNumber
            .toLocaleLowerCase("tr-TR")
            .includes(search) ||
          cycleCount.referenceNumber
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true
        );
      })
      .sort((left, right) =>
        right.createdAt.localeCompare(
          left.createdAt,
        ),
      )
      .map((cycleCount) =>
        structuredClone(cycleCount),
      );
  }

  async save(
    cycleCount: CycleCount,
  ): Promise<CycleCount> {
    const stored =
      structuredClone(cycleCount);

    this.cycleCounts.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveItem(
    item: CycleCountItem,
  ): Promise<CycleCountItem> {
    const cycleCount =
      this.requireCycleCount(
        item.tenantId,
        item.cycleCountId,
      );

    const items =
      cycleCount.items.filter(
        (current) =>
          current.id !== item.id,
      );

    items.push(
      structuredClone(item),
    );

    items.sort(
      (left, right) =>
        left.lineNumber -
        right.lineNumber,
    );

    this.cycleCounts.set(
      cycleCount.id,
      {
        ...cycleCount,
        items,
        updatedAt: item.updatedAt,
      },
    );

    return structuredClone(item);
  }

  async saveResult(
    result: CycleCountResult,
  ): Promise<CycleCountResult> {
    const cycleCount =
      this.requireCycleCount(
        result.tenantId,
        result.cycleCountId,
      );

    const stored =
      structuredClone(result);

    this.results.set(
      stored.id,
      stored,
    );

    const results =
      cycleCount.results.filter(
        (current) =>
          current.id !== stored.id,
      );

    results.push(
      structuredClone(stored),
    );

    this.cycleCounts.set(
      cycleCount.id,
      {
        ...cycleCount,
        results,
      },
    );

    return structuredClone(stored);
  }

  async saveTask(
    task: CycleCountTask,
  ): Promise<CycleCountTask> {
    this.requireCycleCount(
      task.tenantId,
      task.cycleCountId,
    );

    const stored =
      structuredClone(task);

    this.tasks.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveException(
    exception: CycleCountException,
  ): Promise<CycleCountException> {
    const cycleCount =
      this.requireCycleCount(
        exception.tenantId,
        exception.cycleCountId,
      );

    const stored =
      structuredClone(exception);

    this.exceptions.set(
      stored.id,
      stored,
    );

    const exceptions =
      cycleCount.exceptions.filter(
        (current) =>
          current.id !== stored.id,
      );

    exceptions.push(
      structuredClone(stored),
    );

    this.cycleCounts.set(
      cycleCount.id,
      {
        ...cycleCount,
        exceptions,
      },
    );

    return structuredClone(stored);
  }

  async saveAdjustment(
    adjustment: CycleCountAdjustment,
  ): Promise<CycleCountAdjustment> {
    const cycleCount =
      this.requireCycleCount(
        adjustment.tenantId,
        adjustment.cycleCountId,
      );

    const stored =
      structuredClone(adjustment);

    this.adjustments.set(
      stored.id,
      stored,
    );

    const adjustments =
      cycleCount.adjustments.filter(
        (current) =>
          current.id !== stored.id,
      );

    adjustments.push(
      structuredClone(stored),
    );

    this.cycleCounts.set(
      cycleCount.id,
      {
        ...cycleCount,
        adjustments,
      },
    );

    return structuredClone(stored);
  }

  async saveApproval(
    approval: CycleCountApproval,
  ): Promise<CycleCountApproval> {
    const cycleCount =
      this.requireCycleCount(
        approval.tenantId,
        approval.cycleCountId,
      );

    const stored =
      structuredClone(approval);

    this.approvals.set(
      stored.id,
      stored,
    );

    const approvals =
      cycleCount.approvals.filter(
        (current) =>
          current.id !== stored.id,
      );

    approvals.push(
      structuredClone(stored),
    );

    this.cycleCounts.set(
      cycleCount.id,
      {
        ...cycleCount,
        approvals,
      },
    );

    return structuredClone(stored);
  }

  async saveRule(
    rule: CycleCountRule,
  ): Promise<CycleCountRule> {
    const stored =
      structuredClone(rule);

    this.rules.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async saveSchedule(
    schedule: CycleCountSchedule,
  ): Promise<CycleCountSchedule> {
    const stored =
      structuredClone(schedule);

    this.schedules.set(
      stored.id,
      stored,
    );

    return structuredClone(stored);
  }

  async findRuleById(
    tenantId: string,
    ruleId: string,
  ): Promise<CycleCountRule | null> {
    const rule =
      this.rules.get(ruleId);

    if (
      !rule ||
      rule.tenantId !== tenantId
    ) {
      return null;
    }

    return structuredClone(rule);
  }

  async findRuleByCode(
    tenantId: string,
    code: string,
  ): Promise<CycleCountRule | null> {
    for (
      const rule
      of this.rules.values()
    ) {
      if (
        rule.tenantId === tenantId &&
        rule.code === code
      ) {
        return structuredClone(rule);
      }
    }

    return null;
  }

  async listRules(
    tenantId: string,
    activeOnly = false,
  ): Promise<CycleCountRule[]> {
    return [...this.rules.values()]
      .filter(
        (rule) =>
          rule.tenantId === tenantId,
      )
      .filter(
        (rule) =>
          !activeOnly || rule.active,
      )
      .sort((left, right) =>
        left.code.localeCompare(
          right.code,
          "tr",
          { numeric: true },
        ),
      )
      .map((rule) =>
        structuredClone(rule),
      );
  }

  async findScheduleById(
    tenantId: string,
    scheduleId: string,
  ): Promise<CycleCountSchedule | null> {
    const schedule =
      this.schedules.get(scheduleId);

    if (
      !schedule ||
      schedule.tenantId !== tenantId
    ) {
      return null;
    }

    return structuredClone(schedule);
  }

  async listSchedules(
    tenantId: string,
    warehouseId?: string,
    activeOnly = false,
  ): Promise<CycleCountSchedule[]> {
    return [...this.schedules.values()]
      .filter(
        (schedule) =>
          schedule.tenantId === tenantId,
      )
      .filter(
        (schedule) =>
          warehouseId === undefined ||
          schedule.warehouseId ===
            warehouseId,
      )
      .filter(
        (schedule) =>
          !activeOnly ||
          schedule.status === "active",
      )
      .sort((left, right) =>
        left.startDate.localeCompare(
          right.startDate,
        ),
      )
      .map((schedule) =>
        structuredClone(schedule),
      );
  }

  async listItems(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountItem[]> {
    return [
      ...structuredClone(
        this.requireCycleCount(
          tenantId,
          cycleCountId,
        ).items,
      ),
    ];
  }

  async listResults(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountResult[]> {
    return [
      ...structuredClone(
        this.requireCycleCount(
          tenantId,
          cycleCountId,
        ).results,
      ),
    ];
  }

  async listTasks(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountTask[]> {
    this.requireCycleCount(
      tenantId,
      cycleCountId,
    );

    return [...this.tasks.values()]
      .filter(
        (task) =>
          task.tenantId === tenantId &&
          task.cycleCountId ===
            cycleCountId,
      )
      .sort(
        (left, right) =>
          left.sequence -
            right.sequence ||
          right.priority -
            left.priority,
      )
      .map((task) =>
        structuredClone(task),
      );
  }

  async listExceptions(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountException[]> {
    return [
      ...structuredClone(
        this.requireCycleCount(
          tenantId,
          cycleCountId,
        ).exceptions,
      ),
    ];
  }

  async listAdjustments(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountAdjustment[]> {
    return [
      ...structuredClone(
        this.requireCycleCount(
          tenantId,
          cycleCountId,
        ).adjustments,
      ),
    ];
  }

  async listApprovals(
    tenantId: string,
    cycleCountId: string,
  ): Promise<CycleCountApproval[]> {
    return [
      ...structuredClone(
        this.requireCycleCount(
          tenantId,
          cycleCountId,
        ).approvals,
      ),
    ];
  }

  private requireCycleCount(
    tenantId: string,
    cycleCountId: string,
  ): CycleCount {
    const cycleCount =
      this.cycleCounts.get(cycleCountId);

    if (
      !cycleCount ||
      cycleCount.tenantId !== tenantId
    ) {
      throw new Error(
        "Döngüsel sayım kaydı bulunamadı.",
      );
    }

    return cycleCount;
  }
}
