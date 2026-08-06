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
import {
  InventoryValidationError,
} from "../types/InventoryErrors";
import type {
  ReplenishmentRepository,
} from "./ReplenishmentRepository";

export class InMemoryReplenishmentRepository
  implements ReplenishmentRepository
{
  private readonly replenishments =
    new Map<string, Replenishment>();

  private readonly demands =
    new Map<string, ReplenishmentDemand>();

  private readonly tasks =
    new Map<string, ReplenishmentTask>();

  private readonly rules =
    new Map<string, ReplenishmentRule>();

  private key(
    tenantId: string,
    id: string,
  ): string {
    return `${tenantId}:${id}`;
  }

  async findById(
    tenantId: string,
    replenishmentId: string,
  ): Promise<Replenishment | null> {
    const replenishment =
      this.replenishments.get(
        this.key(
          tenantId,
          replenishmentId,
        ),
      );

    return replenishment
      ? structuredClone(replenishment)
      : null;
  }

  async findByNumber(
    tenantId: string,
    replenishmentNumber: string,
  ): Promise<Replenishment | null> {
    const replenishment =
      [...this.replenishments.values()]
        .find(
          (current) =>
            current.tenantId === tenantId &&
            current.replenishmentNumber ===
              replenishmentNumber,
        );

    return replenishment
      ? structuredClone(replenishment)
      : null;
  }

  async findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<Replenishment | null> {
    const replenishment =
      [...this.replenishments.values()]
        .find(
          (current) =>
            current.tenantId === tenantId &&
            current.source.type ===
              referenceType &&
            current.source.referenceId ===
              referenceId,
        );

    return replenishment
      ? structuredClone(replenishment)
      : null;
  }

  async list(
    filter: ReplenishmentListFilter,
  ): Promise<Replenishment[]> {
    return [...this.replenishments.values()]
      .filter(
        (replenishment) =>
          replenishment.tenantId ===
          filter.tenantId,
      )
      .filter(
        (replenishment) =>
          filter.warehouseId ===
            undefined ||
          replenishment.warehouseId ===
            filter.warehouseId,
      )
      .filter(
        (replenishment) =>
          filter.status === undefined ||
          replenishment.status ===
            filter.status,
      )
      .filter(
        (replenishment) =>
          filter.strategy === undefined ||
          replenishment.strategy ===
            filter.strategy,
      )
      .filter(
        (replenishment) =>
          filter.productId === undefined ||
          replenishment.items.some(
            (item) =>
              item.productId ===
              filter.productId,
          ),
      )
      .filter(
        (replenishment) =>
          filter.destinationLocationId ===
            undefined ||
          replenishment.items.some(
            (item) =>
              item.destinationLocationId ===
              filter.destinationLocationId,
          ),
      )
      .filter(
        (replenishment) =>
          filter.createdFrom ===
            undefined ||
          replenishment.createdAt >=
            filter.createdFrom,
      )
      .filter(
        (replenishment) =>
          filter.createdTo === undefined ||
          replenishment.createdAt <=
            filter.createdTo,
      )
      .sort(
        (left, right) =>
          right.priority -
            left.priority ||
          right.createdAt.localeCompare(
            left.createdAt,
          ),
      )
      .map((replenishment) =>
        structuredClone(replenishment),
      );
  }

  async save(
    replenishment: Replenishment,
  ): Promise<Replenishment> {
    this.replenishments.set(
      this.key(
        replenishment.tenantId,
        replenishment.id,
      ),
      structuredClone(replenishment),
    );

    return structuredClone(
      replenishment,
    );
  }

  async saveItem(
    item: ReplenishmentItem,
  ): Promise<ReplenishmentItem> {
    const replenishment =
      this.requireReplenishment(
        item.tenantId,
        item.replenishmentId,
      );

    const items = [
      ...replenishment.items,
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
      ...replenishment,
      items,
      updatedAt: item.updatedAt,
    });

    return structuredClone(item);
  }

  async saveDemand(
    demand: ReplenishmentDemand,
  ): Promise<ReplenishmentDemand> {
    this.requireReplenishment(
      demand.tenantId,
      demand.replenishmentId,
    );

    this.demands.set(
      this.key(
        demand.tenantId,
        demand.id,
      ),
      structuredClone(demand),
    );

    return structuredClone(demand);
  }

  async saveAllocation(
    allocation: ReplenishmentAllocation,
  ): Promise<ReplenishmentAllocation> {
    const replenishment =
      this.requireReplenishment(
        allocation.tenantId,
        allocation.replenishmentId,
      );

    const allocations = [
      ...replenishment.allocations,
    ];

    const index =
      allocations.findIndex(
        (current) =>
          current.id === allocation.id,
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
      ...replenishment,
      allocations,
      updatedAt: allocation.updatedAt,
    });

    return structuredClone(allocation);
  }

  async saveSuggestion(
    suggestion: ReplenishmentSuggestion,
  ): Promise<ReplenishmentSuggestion> {
    const replenishment =
      this.requireReplenishment(
        suggestion.tenantId,
        suggestion.replenishmentId,
      );

    const suggestions = [
      ...replenishment.suggestions,
    ];

    const index =
      suggestions.findIndex(
        (current) =>
          current.id === suggestion.id,
      );

    if (index >= 0) {
      suggestions[index] =
        structuredClone(suggestion);
    } else {
      suggestions.push(
        structuredClone(suggestion),
      );
    }

    await this.save({
      ...replenishment,
      suggestions,
      updatedAt:
        suggestion.createdAt,
    });

    return structuredClone(suggestion);
  }

  async saveTask(
    task: ReplenishmentTask,
  ): Promise<ReplenishmentTask> {
    this.requireReplenishment(
      task.tenantId,
      task.replenishmentId,
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

  async saveException(
    exception: ReplenishmentException,
  ): Promise<ReplenishmentException> {
    const replenishment =
      this.requireReplenishment(
        exception.tenantId,
        exception.replenishmentId,
      );

    const exceptions = [
      ...replenishment.exceptions,
    ];

    const index =
      exceptions.findIndex(
        (current) =>
          current.id === exception.id,
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
      ...replenishment,
      exceptions,
      updatedAt:
        exception.resolvedAt ??
        exception.createdAt,
    });

    return structuredClone(exception);
  }

  async saveRule(
    rule: ReplenishmentRule,
  ): Promise<ReplenishmentRule> {
    this.rules.set(
      this.key(
        rule.tenantId,
        rule.id,
      ),
      structuredClone(rule),
    );

    return structuredClone(rule);
  }

  async findRuleById(
    tenantId: string,
    ruleId: string,
  ): Promise<ReplenishmentRule | null> {
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
  ): Promise<ReplenishmentRule | null> {
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
  ): Promise<ReplenishmentRule[]> {
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

  async listItems(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentItem[]> {
    return [
      ...structuredClone(
        this.requireReplenishment(
          tenantId,
          replenishmentId,
        ).items,
      ),
    ];
  }

  async listDemands(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentDemand[]> {
    this.requireReplenishment(
      tenantId,
      replenishmentId,
    );

    return [...this.demands.values()]
      .filter(
        (demand) =>
          demand.tenantId === tenantId &&
          demand.replenishmentId ===
            replenishmentId,
      )
      .map((demand) =>
        structuredClone(demand),
      );
  }

  async listAllocations(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentAllocation[]> {
    return [
      ...structuredClone(
        this.requireReplenishment(
          tenantId,
          replenishmentId,
        ).allocations,
      ),
    ];
  }

  async listSuggestions(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentSuggestion[]> {
    return [
      ...structuredClone(
        this.requireReplenishment(
          tenantId,
          replenishmentId,
        ).suggestions,
      ),
    ];
  }

  async listTasks(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentTask[]> {
    this.requireReplenishment(
      tenantId,
      replenishmentId,
    );

    return [...this.tasks.values()]
      .filter(
        (task) =>
          task.tenantId === tenantId &&
          task.replenishmentId ===
            replenishmentId,
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
    replenishmentId: string,
  ): Promise<ReplenishmentException[]> {
    return [
      ...structuredClone(
        this.requireReplenishment(
          tenantId,
          replenishmentId,
        ).exceptions,
      ),
    ];
  }

  private requireReplenishment(
    tenantId: string,
    replenishmentId: string,
    allowMissing = false,
  ): Replenishment {
    const replenishment =
      this.replenishments.get(
        this.key(
          tenantId,
          replenishmentId,
        ),
      );

    if (!replenishment) {
      if (allowMissing) {
        return {
          id: replenishmentId,
          tenantId,
          replenishmentNumber: "",
          warehouseId: "",
          strategy:
            "minimum_maximum",
          source: {
            type: "manual",
          },
          status: "draft",
          priority: 0,
          items: [],
          allocations: [],
          suggestions: [],
          exceptions: [],
          createdBy: "",
          createdAt: "",
          updatedAt: "",
        };
      }

      throw new InventoryValidationError(
        `İkmal kaydı bulunamadı: ${replenishmentId}`,
      );
    }

    return structuredClone(
      replenishment,
    );
  }
}
