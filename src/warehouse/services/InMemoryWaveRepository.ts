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
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  WaveRepository,
} from "./WaveRepository";

export class InMemoryWaveRepository
  implements WaveRepository
{
  private readonly waves =
    new Map<string, Wave>();

  private readonly tasks =
    new Map<string, WaveTask>();

  private readonly rules =
    new Map<string, WaveRule>();

  private readonly schedules =
    new Map<string, WaveSchedule>();

  private key(
    tenantId: string,
    id: string,
  ): string {
    return `${tenantId}:${id}`;
  }

  async findById(
    tenantId: string,
    waveId: string,
  ): Promise<Wave | null> {
    const wave =
      this.waves.get(
        this.key(
          tenantId,
          waveId,
        ),
      );

    return wave
      ? structuredClone(wave)
      : null;
  }

  async findByNumber(
    tenantId: string,
    waveNumber: string,
  ): Promise<Wave | null> {
    const normalizedNumber =
      waveNumber.trim().toUpperCase();

    const wave =
      [...this.waves.values()]
        .find(
          (current) =>
            current.tenantId === tenantId &&
            current.waveNumber
              .toUpperCase() ===
              normalizedNumber,
        );

    return wave
      ? structuredClone(wave)
      : null;
  }

  async list(
    filter: WaveListFilter,
  ): Promise<Wave[]> {
    return [...this.waves.values()]
      .filter(
        (wave) =>
          wave.tenantId ===
          filter.tenantId,
      )
      .filter(
        (wave) =>
          filter.warehouseId ===
            undefined ||
          wave.warehouseId ===
            filter.warehouseId,
      )
      .filter(
        (wave) =>
          filter.status === undefined ||
          wave.status === filter.status,
      )
      .filter(
        (wave) =>
          filter.strategy === undefined ||
          wave.strategy ===
            filter.strategy,
      )
      .filter(
        (wave) =>
          filter.ruleId === undefined ||
          wave.ruleId ===
            filter.ruleId,
      )
      .filter(
        (wave) =>
          filter.plannedFrom ===
            undefined ||
          (
            wave.plannedAt !== undefined &&
            wave.plannedAt >=
              filter.plannedFrom
          ),
      )
      .filter(
        (wave) =>
          filter.plannedTo ===
            undefined ||
          (
            wave.plannedAt !== undefined &&
            wave.plannedAt <=
              filter.plannedTo
          ),
      )
      .filter(
        (wave) =>
          filter.createdFrom ===
            undefined ||
          wave.createdAt >=
            filter.createdFrom,
      )
      .filter(
        (wave) =>
          filter.createdTo === undefined ||
          wave.createdAt <=
            filter.createdTo,
      )
      .sort(
        (left, right) =>
          right.priority -
            left.priority ||
          (
            left.plannedAt ??
            left.createdAt
          ).localeCompare(
            right.plannedAt ??
            right.createdAt,
          ),
      )
      .map((wave) =>
        structuredClone(wave),
      );
  }

  async save(
    wave: Wave,
  ): Promise<Wave> {
    this.waves.set(
      this.key(
        wave.tenantId,
        wave.id,
      ),
      structuredClone(wave),
    );

    return structuredClone(wave);
  }

  async saveOrder(
    order: WaveOrder,
  ): Promise<WaveOrder> {
    const wave =
      this.requireWave(
        order.tenantId,
        order.waveId,
      );

    const orders = [
      ...wave.orders,
    ];

    const index =
      orders.findIndex(
        (current) =>
          current.id === order.id,
      );

    if (index >= 0) {
      orders[index] =
        structuredClone(order);
    } else {
      orders.push(
        structuredClone(order),
      );
    }

    await this.save({
      ...wave,
      orders,
      updatedAt: order.updatedAt,
    });

    return structuredClone(order);
  }

  async saveItem(
    item: WaveItem,
  ): Promise<WaveItem> {
    const wave =
      this.requireWave(
        item.tenantId,
        item.waveId,
      );

    const items = [
      ...wave.items,
    ];

    const index =
      items.findIndex(
        (current) =>
          current.id === item.id,
      );

    if (index >= 0) {
      items[index] =
        structuredClone(item);
    } else {
      items.push(
        structuredClone(item),
      );
    }

    await this.save({
      ...wave,
      items,
      updatedAt: item.updatedAt,
    });

    return structuredClone(item);
  }

  async saveAllocation(
    allocation: WaveAllocation,
  ): Promise<WaveAllocation> {
    const wave =
      this.requireWave(
        allocation.tenantId,
        allocation.waveId,
      );

    const allocations = [
      ...wave.allocations,
    ];

    const index =
      allocations.findIndex(
        (current) =>
          current.id ===
          allocation.id,
      );

    if (index >= 0) {
      allocations[index] =
        structuredClone(allocation);
    } else {
      allocations.push(
        structuredClone(allocation),
      );
    }

    await this.save({
      ...wave,
      allocations,
      updatedAt:
        allocation.updatedAt,
    });

    return structuredClone(
      allocation,
    );
  }

  async saveTask(
    task: WaveTask,
  ): Promise<WaveTask> {
    this.requireWave(
      task.tenantId,
      task.waveId,
    );

    this.tasks.set(
      this.key(
        task.tenantId,
        task.id,
      ),
      structuredClone(task),
    );

    return structuredClone(task);
  }

  async saveCapacity(
    capacity: WaveCapacity,
  ): Promise<WaveCapacity> {
    if (capacity.waveId === undefined) {
      throw new InventoryValidationError(
        "Dalga kapasite kaydında dalga kimliği zorunludur.",
      );
    }

    const wave =
      this.requireWave(
        capacity.tenantId,
        capacity.waveId,
      );

    await this.save({
      ...wave,
      capacity:
        structuredClone(capacity),
      updatedAt:
        capacity.calculatedAt,
    });

    return structuredClone(capacity);
  }

  async saveRelease(
    release: WaveRelease,
  ): Promise<WaveRelease> {
    const wave =
      this.requireWave(
        release.tenantId,
        release.waveId,
      );

    const releases = [
      ...wave.releases,
    ];

    const index =
      releases.findIndex(
        (current) =>
          current.id === release.id,
      );

    if (index >= 0) {
      releases[index] =
        structuredClone(release);
    } else {
      releases.push(
        structuredClone(release),
      );
    }

    await this.save({
      ...wave,
      releases,
      updatedAt: release.updatedAt,
    });

    return structuredClone(release);
  }

  async saveException(
    exception: WaveException,
  ): Promise<WaveException> {
    const wave =
      this.requireWave(
        exception.tenantId,
        exception.waveId,
      );

    const exceptions = [
      ...wave.exceptions,
    ];

    const index =
      exceptions.findIndex(
        (current) =>
          current.id ===
          exception.id,
      );

    if (index >= 0) {
      exceptions[index] =
        structuredClone(exception);
    } else {
      exceptions.push(
        structuredClone(exception),
      );
    }

    await this.save({
      ...wave,
      exceptions,
      updatedAt:
        exception.resolvedAt ??
        exception.createdAt,
    });

    return structuredClone(
      exception,
    );
  }

  async saveRule(
    rule: WaveRule,
  ): Promise<WaveRule> {
    this.rules.set(
      this.key(
        rule.tenantId,
        rule.id,
      ),
      structuredClone(rule),
    );

    return structuredClone(rule);
  }

  async saveSchedule(
    schedule: WaveSchedule,
  ): Promise<WaveSchedule> {
    this.schedules.set(
      this.key(
        schedule.tenantId,
        schedule.id,
      ),
      structuredClone(schedule),
    );

    return structuredClone(schedule);
  }

  async findRuleById(
    tenantId: string,
    ruleId: string,
  ): Promise<WaveRule | null> {
    const rule =
      this.rules.get(
        this.key(
          tenantId,
          ruleId,
        ),
      );

    return rule
      ? structuredClone(rule)
      : null;
  }

  async findRuleByCode(
    tenantId: string,
    code: string,
  ): Promise<WaveRule | null> {
    const normalizedCode =
      code.trim().toUpperCase();

    const rule =
      [...this.rules.values()]
        .find(
          (current) =>
            current.tenantId === tenantId &&
            current.code.toUpperCase() ===
              normalizedCode,
        );

    return rule
      ? structuredClone(rule)
      : null;
  }

  async listRules(
    tenantId: string,
    activeOnly = false,
  ): Promise<WaveRule[]> {
    return [...this.rules.values()]
      .filter(
        (rule) =>
          rule.tenantId === tenantId,
      )
      .filter(
        (rule) =>
          !activeOnly || rule.active,
      )
      .sort(
        (left, right) =>
          right.priority -
            left.priority ||
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
  ): Promise<WaveSchedule | null> {
    const schedule =
      this.schedules.get(
        this.key(
          tenantId,
          scheduleId,
        ),
      );

    return schedule
      ? structuredClone(schedule)
      : null;
  }

  async listSchedules(
    tenantId: string,
    activeOnly = false,
  ): Promise<WaveSchedule[]> {
    return [...this.schedules.values()]
      .filter(
        (schedule) =>
          schedule.tenantId ===
          tenantId,
      )
      .filter(
        (schedule) =>
          !activeOnly ||
          schedule.active,
      )
      .sort(
        (left, right) =>
          (
            left.nextRunAt ??
            left.startDate
          ).localeCompare(
            right.nextRunAt ??
            right.startDate,
          ),
      )
      .map((schedule) =>
        structuredClone(schedule),
      );
  }

  async listOrders(
    tenantId: string,
    waveId: string,
  ): Promise<WaveOrder[]> {
    return [
      ...structuredClone(
        this.requireWave(
          tenantId,
          waveId,
        ).orders,
      ),
    ];
  }

  async listItems(
    tenantId: string,
    waveId: string,
  ): Promise<WaveItem[]> {
    return [
      ...structuredClone(
        this.requireWave(
          tenantId,
          waveId,
        ).items,
      ),
    ];
  }

  async listAllocations(
    tenantId: string,
    waveId: string,
  ): Promise<WaveAllocation[]> {
    return [
      ...structuredClone(
        this.requireWave(
          tenantId,
          waveId,
        ).allocations,
      ),
    ];
  }

  async listTasks(
    tenantId: string,
    waveId: string,
  ): Promise<WaveTask[]> {
    this.requireWave(
      tenantId,
      waveId,
    );

    return [...this.tasks.values()]
      .filter(
        (task) =>
          task.tenantId === tenantId &&
          task.waveId === waveId,
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

  async listReleases(
    tenantId: string,
    waveId: string,
  ): Promise<WaveRelease[]> {
    return [
      ...structuredClone(
        this.requireWave(
          tenantId,
          waveId,
        ).releases,
      ),
    ];
  }

  async listExceptions(
    tenantId: string,
    waveId: string,
  ): Promise<WaveException[]> {
    return [
      ...structuredClone(
        this.requireWave(
          tenantId,
          waveId,
        ).exceptions,
      ),
    ];
  }

  private requireWave(
    tenantId: string,
    waveId: string,
  ): Wave {
    const wave =
      this.waves.get(
        this.key(
          tenantId,
          waveId,
        ),
      );

    if (!wave) {
      throw new InventoryValidationError(
        `Dalga kaydı bulunamadı: ${waveId}`,
      );
    }

    return structuredClone(wave);
  }
}
