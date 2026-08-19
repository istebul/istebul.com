import type {
  SupabaseClient,
} from "@supabase/supabase-js";

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

import type {
  ReplenishmentRepository,
} from "./ReplenishmentRepository";


const REPLENISHMENT_TABLE =
  "warehouse_replenishments";

const ITEM_TABLE =
  "warehouse_replenishment_items";

const DEMAND_TABLE =
  "warehouse_replenishment_demands";

const ALLOCATION_TABLE =
  "warehouse_replenishment_allocations";

const SUGGESTION_TABLE =
  "warehouse_replenishment_suggestions";

const TASK_TABLE =
  "warehouse_replenishment_tasks";

const EXCEPTION_TABLE =
  "warehouse_replenishment_exceptions";

const RULE_TABLE =
  "warehouse_replenishment_rules";


type DatabaseRow =
  Record<string, unknown>;

type QueryBuilder = any;


function nullable<T>(
  value: T | undefined,
): T | null {
  return value === undefined
    ? null
    : value;
}


function numberValue(
  value: unknown,
): number {
  return Number(value ?? 0);
}


function stringValue(
  value: unknown,
): string {
  return String(value ?? "");
}


export class SupabaseReplenishmentRepository
  implements ReplenishmentRepository
{
  private readonly client:
    SupabaseClient;

  constructor(
    client: SupabaseClient,
  ) {
    this.client = client;
  }


  async findById(
    tenantId: string,
    replenishmentId: string,
  ): Promise<Replenishment | null> {
    const { data, error } =
      await this.table(
        REPLENISHMENT_TABLE,
      )
        .select("*")
        .eq(
          "account_id",
          tenantId,
        )
        .eq(
          "id",
          replenishmentId,
        )
        .maybeSingle();

    this.throwIfError(
      error,
      "İkmal kaydı okunamadı.",
    );

    if (!data) {
      return null;
    }

    return this.hydrate(
      data as DatabaseRow,
    );
  }


  async findByNumber(
    tenantId: string,
    replenishmentNumber: string,
  ): Promise<Replenishment | null> {
    const { data, error } =
      await this.table(
        REPLENISHMENT_TABLE,
      )
        .select("*")
        .eq(
          "account_id",
          tenantId,
        )
        .eq(
          "replenishment_number",
          replenishmentNumber,
        )
        .maybeSingle();

    this.throwIfError(
      error,
      "İkmal numarası okunamadı.",
    );

    if (!data) {
      return null;
    }

    return this.hydrate(
      data as DatabaseRow,
    );
  }


  async findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<Replenishment | null> {
    const { data, error } =
      await this.table(
        REPLENISHMENT_TABLE,
      )
        .select("*")
        .eq(
          "account_id",
          tenantId,
        )
        .contains(
          "source",
          {
            type: referenceType,
            referenceId,
          },
        )
        .limit(1);

    this.throwIfError(
      error,
      "İkmal kaynak referansı okunamadı.",
    );

    const row =
      Array.isArray(data)
        ? data[0]
        : undefined;

    if (!row) {
      return null;
    }

    return this.hydrate(
      row as DatabaseRow,
    );
  }


  async list(
    filter: ReplenishmentListFilter,
  ): Promise<Replenishment[]> {
    let query =
      this.table(
        REPLENISHMENT_TABLE,
      )
        .select("*")
        .eq(
          "account_id",
          filter.tenantId,
        );

    if (
      filter.warehouseId !==
      undefined
    ) {
      query =
        query.eq(
          "warehouse_id",
          filter.warehouseId,
        );
    }

    if (
      filter.status !==
      undefined
    ) {
      query =
        query.eq(
          "status",
          filter.status,
        );
    }

    if (
      filter.strategy !==
      undefined
    ) {
      query =
        query.eq(
          "strategy",
          filter.strategy,
        );
    }

    if (
      filter.createdFrom !==
      undefined
    ) {
      query =
        query.gte(
          "created_at",
          filter.createdFrom,
        );
    }

    if (
      filter.createdTo !==
      undefined
    ) {
      query =
        query.lte(
          "created_at",
          filter.createdTo,
        );
    }

    const { data, error } =
      await query
        .order(
          "priority",
          {
            ascending: false,
          },
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

    this.throwIfError(
      error,
      "İkmal listesi okunamadı.",
    );

    const hydrated =
      await Promise.all(
        ((data ?? []) as DatabaseRow[])
          .map(
            (row) =>
              this.hydrate(row),
          ),
      );

    return hydrated
      .filter(
        (replenishment) =>
          filter.productId ===
            undefined ||
          replenishment.items.some(
            (item) =>
              item.productId ===
              filter.productId,
          ),
      )
      .filter(
        (replenishment) =>
          filter
            .destinationLocationId ===
            undefined ||
          replenishment.items.some(
            (item) =>
              item
                .destinationLocationId ===
              filter
                .destinationLocationId,
          ),
      );
  }


  async save(
    replenishment: Replenishment,
  ): Promise<Replenishment> {
    const payload = {
      id:
        replenishment.id,

      account_id:
        replenishment.tenantId,

      replenishment_number:
        replenishment
          .replenishmentNumber,

      warehouse_id:
        replenishment.warehouseId,

      strategy:
        replenishment.strategy,

      source:
        replenishment.source,

      status:
        replenishment.status,

      priority:
        replenishment.priority,

      rule_id:
        nullable(
          replenishment.ruleId,
        ),

      planned_at:
        nullable(
          replenishment.plannedAt,
        ),

      released_at:
        nullable(
          replenishment.releasedAt,
        ),

      started_at:
        nullable(
          replenishment.startedAt,
        ),

      completed_at:
        nullable(
          replenishment.completedAt,
        ),

      cancelled_at:
        nullable(
          replenishment.cancelledAt,
        ),

      cancellation_reason:
        nullable(
          replenishment
            .cancellationReason,
        ),

      notes:
        nullable(
          replenishment.notes,
        ),

      created_by:
        replenishment.createdBy,

      created_at:
        replenishment.createdAt,

      updated_at:
        replenishment.updatedAt,
    };

    const { data, error } =
      await this.table(
        REPLENISHMENT_TABLE,
      )
        .upsert(
          payload,
          {
            onConflict: "id",
          },
        )
        .select("*")
        .single();

    this.throwIfError(
      error,
      "İkmal kaydı yazılamadı.",
    );

    return {
      ...this.mapReplenishment(
        data as DatabaseRow,
      ),

      items:
        replenishment.items,

      allocations:
        replenishment.allocations,

      suggestions:
        replenishment.suggestions,

      exceptions:
        replenishment.exceptions,
    };
  }


  async saveItem(
    item: ReplenishmentItem,
  ): Promise<ReplenishmentItem> {
    const payload = {
      id:
        item.id,

      account_id:
        item.tenantId,

      replenishment_id:
        item.replenishmentId,

      line_number:
        item.lineNumber,

      warehouse_id:
        item.warehouseId,

      destination_location_id:
        item.destinationLocationId,

      product_id:
        item.productId,

      sku_id:
        nullable(
          item.skuId,
        ),

      stock_status:
        item.stockStatus,

      unit:
        item.unit,

      requested_quantity:
        item.requestedQuantity,

      allocated_quantity:
        item.allocatedQuantity,

      transferred_quantity:
        item.transferredQuantity,

      remaining_quantity:
        item.remainingQuantity,

      minimum_quantity:
        nullable(
          item.minimumQuantity,
        ),

      maximum_quantity:
        nullable(
          item.maximumQuantity,
        ),

      current_destination_quantity:
        item
          .currentDestinationQuantity,

      priority:
        item.priority,

      status:
        item.status,

      tracking:
        nullable(
          item.tracking,
        ),

      required_at:
        nullable(
          item.requiredAt,
        ),

      started_at:
        nullable(
          item.startedAt,
        ),

      completed_at:
        nullable(
          item.completedAt,
        ),

      notes:
        nullable(
          item.notes,
        ),

      created_by:
        item.createdBy,

      created_at:
        item.createdAt,

      updated_at:
        item.updatedAt,
    };

    const { data, error } =
      await this.table(
        ITEM_TABLE,
      )
        .upsert(
          payload,
          {
            onConflict: "id",
          },
        )
        .select("*")
        .single();

    this.throwIfError(
      error,
      "İkmal satırı yazılamadı.",
    );

    return this.mapItem(
      data as DatabaseRow,
    );
  }


  async saveDemand(
    demand: ReplenishmentDemand,
  ): Promise<ReplenishmentDemand> {
    const payload = {
      id:
        demand.id,

      account_id:
        demand.tenantId,

      replenishment_id:
        demand.replenishmentId,

      warehouse_id:
        demand.warehouseId,

      destination_location_id:
        demand.destinationLocationId,

      product_id:
        demand.productId,

      sku_id:
        nullable(
          demand.skuId,
        ),

      stock_status:
        demand.stockStatus,

      unit:
        demand.unit,

      current_quantity:
        demand.currentQuantity,

      minimum_quantity:
        nullable(
          demand.minimumQuantity,
        ),

      maximum_quantity:
        nullable(
          demand.maximumQuantity,
        ),

      order_demand_quantity:
        demand.orderDemandQuantity,

      forecast_demand_quantity:
        demand.forecastDemandQuantity,

      safety_stock_quantity:
        demand.safetyStockQuantity,

      required_quantity:
        demand.requiredQuantity,

      urgency_score:
        demand.urgencyScore,

      priority:
        demand.priority,

      source:
        demand.source,

      tracking:
        nullable(
          demand.tracking,
        ),

      required_at:
        nullable(
          demand.requiredAt,
        ),

      created_at:
        demand.createdAt,
    };

    const { data, error } =
      await this.table(
        DEMAND_TABLE,
      )
        .upsert(
          payload,
          {
            onConflict: "id",
          },
        )
        .select("*")
        .single();

    this.throwIfError(
      error,
      "İkmal talebi yazılamadı.",
    );

    return this.mapDemand(
      data as DatabaseRow,
    );
  }


  async saveAllocation(
    allocation:
      ReplenishmentAllocation,
  ): Promise<ReplenishmentAllocation> {
    const payload = {
      id:
        allocation.id,

      account_id:
        allocation.tenantId,

      replenishment_id:
        allocation.replenishmentId,

      replenishment_item_id:
        allocation
          .replenishmentItemId,

      source_location_id:
        allocation.sourceLocationId,

      destination_location_id:
        allocation
          .destinationLocationId,

      product_id:
        allocation.productId,

      sku_id:
        nullable(
          allocation.skuId,
        ),

      inventory_balance_id:
        nullable(
          allocation
            .inventoryBalanceId,
        ),

      stock_status:
        allocation.stockStatus,

      unit:
        allocation.unit,

      allocated_quantity:
        allocation
          .allocatedQuantity,

      transferred_quantity:
        allocation
          .transferredQuantity,

      remaining_quantity:
        allocation
          .remainingQuantity,

      sequence:
        allocation.sequence,

      score:
        allocation.score,

      status:
        allocation.status,

      tracking:
        nullable(
          allocation.tracking,
        ),

      inventory_reservation_id:
        nullable(
          allocation
            .inventoryReservationId,
        ),

      inventory_movement_id:
        nullable(
          allocation
            .inventoryMovementId,
        ),

      reserved_at:
        nullable(
          allocation.reservedAt,
        ),

      started_at:
        nullable(
          allocation.startedAt,
        ),

      completed_at:
        nullable(
          allocation.completedAt,
        ),

      created_at:
        allocation.createdAt,

      updated_at:
        allocation.updatedAt,
    };

    const { data, error } =
      await this.table(
        ALLOCATION_TABLE,
      )
        .upsert(
          payload,
          {
            onConflict: "id",
          },
        )
        .select("*")
        .single();

    this.throwIfError(
      error,
      "İkmal tahsisi yazılamadı.",
    );

    return this.mapAllocation(
      data as DatabaseRow,
    );
  }


  async saveSuggestion(
    suggestion:
      ReplenishmentSuggestion,
  ): Promise<ReplenishmentSuggestion> {
    const payload = {
      id:
        suggestion.id,

      account_id:
        suggestion.tenantId,

      replenishment_id:
        suggestion.replenishmentId,

      replenishment_item_id:
        suggestion
          .replenishmentItemId,

      source_location_id:
        suggestion.sourceLocationId,

      destination_location_id:
        suggestion
          .destinationLocationId,

      product_id:
        suggestion.productId,

      sku_id:
        nullable(
          suggestion.skuId,
        ),

      inventory_balance_id:
        nullable(
          suggestion
            .inventoryBalanceId,
        ),

      stock_status:
        suggestion.stockStatus,

      unit:
        suggestion.unit,

      suggested_quantity:
        suggestion
          .suggestedQuantity,

      available_quantity:
        suggestion
          .availableQuantity,

      source_remaining_quantity:
        suggestion
          .sourceRemainingQuantity,

      source_distance:
        suggestion.sourceDistance,

      capacity_score:
        suggestion.capacityScore,

      distance_score:
        suggestion.distanceScore,

      stock_age_score:
        suggestion.stockAgeScore,

      compatibility_score:
        suggestion
          .compatibilityScore,

      total_score:
        suggestion.totalScore,

      reasons:
        [...suggestion.reasons],

      warnings:
        [...suggestion.warnings],

      tracking:
        nullable(
          suggestion.tracking,
        ),

      created_at:
        suggestion.createdAt,
    };

    const { data, error } =
      await this.table(
        SUGGESTION_TABLE,
      )
        .upsert(
          payload,
          {
            onConflict: "id",
          },
        )
        .select("*")
        .single();

    this.throwIfError(
      error,
      "İkmal önerisi yazılamadı.",
    );

    return this.mapSuggestion(
      data as DatabaseRow,
    );
  }


  async saveTask(
    task: ReplenishmentTask,
  ): Promise<ReplenishmentTask> {
    const payload = {
      id:
        task.id,

      account_id:
        task.tenantId,

      replenishment_id:
        task.replenishmentId,

      replenishment_item_id:
        nullable(
          task.replenishmentItemId,
        ),

      allocation_id:
        nullable(
          task.allocationId,
        ),

      warehouse_id:
        task.warehouseId,

      source_location_id:
        nullable(
          task.sourceLocationId,
        ),

      destination_location_id:
        nullable(
          task.destinationLocationId,
        ),

      product_id:
        nullable(
          task.productId,
        ),

      type:
        task.type,

      status:
        task.status,

      priority:
        task.priority,

      sequence:
        task.sequence,

      assigned_user_id:
        nullable(
          task.assignedUserId,
        ),

      assigned_team_id:
        nullable(
          task.assignedTeamId,
        ),

      assigned_equipment_id:
        nullable(
          task.assignedEquipmentId,
        ),

      planned_at:
        nullable(
          task.plannedAt,
        ),

      started_at:
        nullable(
          task.startedAt,
        ),

      completed_at:
        nullable(
          task.completedAt,
        ),

      notes:
        nullable(
          task.notes,
        ),

      created_by:
        task.createdBy,

      created_at:
        task.createdAt,

      updated_at:
        task.updatedAt,
    };

    const { data, error } =
      await this.table(
        TASK_TABLE,
      )
        .upsert(
          payload,
          {
            onConflict: "id",
          },
        )
        .select("*")
        .single();

    this.throwIfError(
      error,
      "İkmal görevi yazılamadı.",
    );

    return this.mapTask(
      data as DatabaseRow,
    );
  }


  async saveException(
    exception:
      ReplenishmentException,
  ): Promise<ReplenishmentException> {
    const payload = {
      id:
        exception.id,

      account_id:
        exception.tenantId,

      replenishment_id:
        exception.replenishmentId,

      replenishment_item_id:
        nullable(
          exception
            .replenishmentItemId,
        ),

      task_id:
        nullable(
          exception.taskId,
        ),

      allocation_id:
        nullable(
          exception.allocationId,
        ),

      warehouse_id:
        nullable(
          exception.warehouseId,
        ),

      source_location_id:
        nullable(
          exception
            .sourceLocationId,
        ),

      destination_location_id:
        nullable(
          exception
            .destinationLocationId,
        ),

      product_id:
        nullable(
          exception.productId,
        ),

      sku_id:
        nullable(
          exception.skuId,
        ),

      type:
        exception.type,

      message:
        exception.message,

      resolved:
        exception.resolved,

      resolved_by:
        nullable(
          exception.resolvedBy,
        ),

      resolved_at:
        nullable(
          exception.resolvedAt,
        ),

      resolution_notes:
        nullable(
          exception
            .resolutionNotes,
        ),

      created_at:
        exception.createdAt,
    };

    const { data, error } =
      await this.table(
        EXCEPTION_TABLE,
      )
        .upsert(
          payload,
          {
            onConflict: "id",
          },
        )
        .select("*")
        .single();

    this.throwIfError(
      error,
      "İkmal istisnası yazılamadı.",
    );

    return this.mapException(
      data as DatabaseRow,
    );
  }


  async saveRule(
    rule: ReplenishmentRule,
  ): Promise<ReplenishmentRule> {
    const payload = {
      id:
        rule.id,

      account_id:
        rule.tenantId,

      code:
        rule.code,

      name:
        rule.name,

      description:
        nullable(
          rule.description,
        ),

      warehouse_id:
        nullable(
          rule.warehouseId,
        ),

      zone_id:
        nullable(
          rule.zoneId,
        ),

      destination_location_id:
        nullable(
          rule
            .destinationLocationId,
        ),

      product_id:
        nullable(
          rule.productId,
        ),

      sku_id:
        nullable(
          rule.skuId,
        ),

      product_category_id:
        nullable(
          rule.productCategoryId,
        ),

      abc_class:
        nullable(
          rule.abcClass,
        ),

      strategy:
        rule.strategy,

      minimum_quantity:
        nullable(
          rule.minimumQuantity,
        ),

      maximum_quantity:
        nullable(
          rule.maximumQuantity,
        ),

      safety_stock_quantity:
        nullable(
          rule
            .safetyStockQuantity,
        ),

      reorder_point:
        nullable(
          rule.reorderPoint,
        ),

      target_fill_percentage:
        nullable(
          rule
            .targetFillPercentage,
        ),

      minimum_transfer_quantity:
        nullable(
          rule
            .minimumTransferQuantity,
        ),

      maximum_transfer_quantity:
        nullable(
          rule
            .maximumTransferQuantity,
        ),

      transfer_multiple:
        nullable(
          rule.transferMultiple,
        ),

      lead_time_minutes:
        nullable(
          rule.leadTimeMinutes,
        ),

      priority:
        rule.priority,

      automatic_release:
        rule.automaticRelease,

      allow_partial_allocation:
        rule
          .allowPartialAllocation,

      active:
        rule.active,

      created_by:
        rule.createdBy,

      created_at:
        rule.createdAt,

      updated_at:
        rule.updatedAt,
    };

    const { data, error } =
      await this.table(
        RULE_TABLE,
      )
        .upsert(
          payload,
          {
            onConflict: "id",
          },
        )
        .select("*")
        .single();

    this.throwIfError(
      error,
      "İkmal kuralı yazılamadı.",
    );

    return this.mapRule(
      data as DatabaseRow,
    );
  }


  async findRuleById(
    tenantId: string,
    ruleId: string,
  ): Promise<ReplenishmentRule | null> {
    const { data, error } =
      await this.table(
        RULE_TABLE,
      )
        .select("*")
        .eq(
          "account_id",
          tenantId,
        )
        .eq(
          "id",
          ruleId,
        )
        .maybeSingle();

    this.throwIfError(
      error,
      "İkmal kuralı okunamadı.",
    );

    if (!data) {
      return null;
    }

    return this.mapRule(
      data as DatabaseRow,
    );
  }


  async findRuleByCode(
    tenantId: string,
    code: string,
  ): Promise<ReplenishmentRule | null> {
    const { data, error } =
      await this.table(
        RULE_TABLE,
      )
        .select("*")
        .eq(
          "account_id",
          tenantId,
        )
        .ilike(
          "code",
          code.trim(),
        )
        .limit(1);

    this.throwIfError(
      error,
      "İkmal kural kodu okunamadı.",
    );

    const row =
      Array.isArray(data)
        ? data[0]
        : undefined;

    if (!row) {
      return null;
    }

    return this.mapRule(
      row as DatabaseRow,
    );
  }


  async listRules(
    tenantId: string,
    activeOnly = false,
  ): Promise<ReplenishmentRule[]> {
    let query =
      this.table(
        RULE_TABLE,
      )
        .select("*")
        .eq(
          "account_id",
          tenantId,
        );

    if (activeOnly) {
      query =
        query.eq(
          "active",
          true,
        );
    }

    const { data, error } =
      await query
        .order(
          "priority",
          {
            ascending: false,
          },
        )
        .order(
          "code",
          {
            ascending: true,
          },
        );

    this.throwIfError(
      error,
      "İkmal kuralları okunamadı.",
    );

    return (
      (data ?? []) as DatabaseRow[]
    ).map(
      (row) =>
        this.mapRule(row),
    );
  }


  async listItems(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentItem[]> {
    const rows =
      await this.listRows(
        ITEM_TABLE,
        tenantId,
        replenishmentId,
        "line_number",
        true,
      );

    return rows.map(
      (row) =>
        this.mapItem(row),
    );
  }


  async listDemands(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentDemand[]> {
    const rows =
      await this.listRows(
        DEMAND_TABLE,
        tenantId,
        replenishmentId,
        "created_at",
        true,
      );

    return rows.map(
      (row) =>
        this.mapDemand(row),
    );
  }


  async listAllocations(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentAllocation[]> {
    const rows =
      await this.listRows(
        ALLOCATION_TABLE,
        tenantId,
        replenishmentId,
        "sequence",
        true,
      );

    return rows.map(
      (row) =>
        this.mapAllocation(row),
    );
  }


  async listSuggestions(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentSuggestion[]> {
    const rows =
      await this.listRows(
        SUGGESTION_TABLE,
        tenantId,
        replenishmentId,
        "total_score",
        false,
      );

    return rows.map(
      (row) =>
        this.mapSuggestion(row),
    );
  }


  async listTasks(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentTask[]> {
    const rows =
      await this.listRows(
        TASK_TABLE,
        tenantId,
        replenishmentId,
        "sequence",
        true,
      );

    return rows.map(
      (row) =>
        this.mapTask(row),
    );
  }


  async listExceptions(
    tenantId: string,
    replenishmentId: string,
  ): Promise<ReplenishmentException[]> {
    const rows =
      await this.listRows(
        EXCEPTION_TABLE,
        tenantId,
        replenishmentId,
        "created_at",
        true,
      );

    return rows.map(
      (row) =>
        this.mapException(row),
    );
  }


  private async hydrate(
    row: DatabaseRow,
  ): Promise<Replenishment> {
    const tenantId =
      stringValue(
        row.account_id,
      );

    const replenishmentId =
      stringValue(
        row.id,
      );

    const [
      items,
      allocations,
      suggestions,
      exceptions,
    ] = await Promise.all([
      this.listItems(
        tenantId,
        replenishmentId,
      ),

      this.listAllocations(
        tenantId,
        replenishmentId,
      ),

      this.listSuggestions(
        tenantId,
        replenishmentId,
      ),

      this.listExceptions(
        tenantId,
        replenishmentId,
      ),
    ]);

    return {
      ...this.mapReplenishment(
        row,
      ),
      items,
      allocations,
      suggestions,
      exceptions,
    };
  }


  private mapReplenishment(
    row: DatabaseRow,
  ): Replenishment {
    const result:
      Record<string, unknown> = {
        id:
          stringValue(row.id),

        tenantId:
          stringValue(
            row.account_id,
          ),

        replenishmentNumber:
          stringValue(
            row.replenishment_number,
          ),

        warehouseId:
          stringValue(
            row.warehouse_id,
          ),

        strategy:
          row.strategy,

        source:
          row.source,

        status:
          row.status,

        priority:
          numberValue(
            row.priority,
          ),

        items: [],
        allocations: [],
        suggestions: [],
        exceptions: [],

        createdBy:
          stringValue(
            row.created_by,
          ),

        createdAt:
          stringValue(
            row.created_at,
          ),

        updatedAt:
          stringValue(
            row.updated_at,
          ),
      };

    this.assignOptional(
      result,
      "ruleId",
      row.rule_id,
    );

    this.assignOptional(
      result,
      "plannedAt",
      row.planned_at,
    );

    this.assignOptional(
      result,
      "releasedAt",
      row.released_at,
    );

    this.assignOptional(
      result,
      "startedAt",
      row.started_at,
    );

    this.assignOptional(
      result,
      "completedAt",
      row.completed_at,
    );

    this.assignOptional(
      result,
      "cancelledAt",
      row.cancelled_at,
    );

    this.assignOptional(
      result,
      "cancellationReason",
      row.cancellation_reason,
    );

    this.assignOptional(
      result,
      "notes",
      row.notes,
    );

    return result as unknown as Replenishment;
  }


  private mapItem(
    row: DatabaseRow,
  ): ReplenishmentItem {
    const result:
      Record<string, unknown> = {
        id:
          stringValue(row.id),

        tenantId:
          stringValue(
            row.account_id,
          ),

        replenishmentId:
          stringValue(
            row.replenishment_id,
          ),

        lineNumber:
          numberValue(
            row.line_number,
          ),

        warehouseId:
          stringValue(
            row.warehouse_id,
          ),

        destinationLocationId:
          stringValue(
            row.destination_location_id,
          ),

        productId:
          stringValue(
            row.product_id,
          ),

        stockStatus:
          stringValue(
            row.stock_status,
          ),

        unit:
          stringValue(
            row.unit,
          ),

        requestedQuantity:
          numberValue(
            row.requested_quantity,
          ),

        allocatedQuantity:
          numberValue(
            row.allocated_quantity,
          ),

        transferredQuantity:
          numberValue(
            row.transferred_quantity,
          ),

        remainingQuantity:
          numberValue(
            row.remaining_quantity,
          ),

        currentDestinationQuantity:
          numberValue(
            row
              .current_destination_quantity,
          ),

        priority:
          numberValue(
            row.priority,
          ),

        status:
          row.status,

        createdBy:
          stringValue(
            row.created_by,
          ),

        createdAt:
          stringValue(
            row.created_at,
          ),

        updatedAt:
          stringValue(
            row.updated_at,
          ),
      };

    this.assignOptional(
      result,
      "skuId",
      row.sku_id,
    );

    this.assignOptionalNumber(
      result,
      "minimumQuantity",
      row.minimum_quantity,
    );

    this.assignOptionalNumber(
      result,
      "maximumQuantity",
      row.maximum_quantity,
    );

    this.assignOptional(
      result,
      "tracking",
      row.tracking,
    );

    this.assignOptional(
      result,
      "requiredAt",
      row.required_at,
    );

    this.assignOptional(
      result,
      "startedAt",
      row.started_at,
    );

    this.assignOptional(
      result,
      "completedAt",
      row.completed_at,
    );

    this.assignOptional(
      result,
      "notes",
      row.notes,
    );

    return result as unknown as ReplenishmentItem;
  }


  private mapDemand(
    row: DatabaseRow,
  ): ReplenishmentDemand {
    const result:
      Record<string, unknown> = {
        id:
          stringValue(row.id),

        tenantId:
          stringValue(
            row.account_id,
          ),

        replenishmentId:
          stringValue(
            row.replenishment_id,
          ),

        warehouseId:
          stringValue(
            row.warehouse_id,
          ),

        destinationLocationId:
          stringValue(
            row.destination_location_id,
          ),

        productId:
          stringValue(
            row.product_id,
          ),

        stockStatus:
          stringValue(
            row.stock_status,
          ),

        unit:
          stringValue(
            row.unit,
          ),

        currentQuantity:
          numberValue(
            row.current_quantity,
          ),

        orderDemandQuantity:
          numberValue(
            row
              .order_demand_quantity,
          ),

        forecastDemandQuantity:
          numberValue(
            row
              .forecast_demand_quantity,
          ),

        safetyStockQuantity:
          numberValue(
            row
              .safety_stock_quantity,
          ),

        requiredQuantity:
          numberValue(
            row.required_quantity,
          ),

        urgencyScore:
          numberValue(
            row.urgency_score,
          ),

        priority:
          numberValue(
            row.priority,
          ),

        source:
          row.source,

        createdAt:
          stringValue(
            row.created_at,
          ),
      };

    this.assignOptional(
      result,
      "skuId",
      row.sku_id,
    );

    this.assignOptionalNumber(
      result,
      "minimumQuantity",
      row.minimum_quantity,
    );

    this.assignOptionalNumber(
      result,
      "maximumQuantity",
      row.maximum_quantity,
    );

    this.assignOptional(
      result,
      "tracking",
      row.tracking,
    );

    this.assignOptional(
      result,
      "requiredAt",
      row.required_at,
    );

    return result as unknown as ReplenishmentDemand;
  }


  private mapAllocation(
    row: DatabaseRow,
  ): ReplenishmentAllocation {
    const result:
      Record<string, unknown> = {
        id:
          stringValue(row.id),

        tenantId:
          stringValue(
            row.account_id,
          ),

        replenishmentId:
          stringValue(
            row.replenishment_id,
          ),

        replenishmentItemId:
          stringValue(
            row
              .replenishment_item_id,
          ),

        sourceLocationId:
          stringValue(
            row.source_location_id,
          ),

        destinationLocationId:
          stringValue(
            row
              .destination_location_id,
          ),

        productId:
          stringValue(
            row.product_id,
          ),

        stockStatus:
          stringValue(
            row.stock_status,
          ),

        unit:
          stringValue(
            row.unit,
          ),

        allocatedQuantity:
          numberValue(
            row.allocated_quantity,
          ),

        transferredQuantity:
          numberValue(
            row
              .transferred_quantity,
          ),

        remainingQuantity:
          numberValue(
            row.remaining_quantity,
          ),

        sequence:
          numberValue(
            row.sequence,
          ),

        score:
          numberValue(
            row.score,
          ),

        status:
          row.status,

        createdAt:
          stringValue(
            row.created_at,
          ),

        updatedAt:
          stringValue(
            row.updated_at,
          ),
      };

    this.assignOptional(
      result,
      "skuId",
      row.sku_id,
    );

    this.assignOptional(
      result,
      "inventoryBalanceId",
      row.inventory_balance_id,
    );

    this.assignOptional(
      result,
      "tracking",
      row.tracking,
    );

    this.assignOptional(
      result,
      "inventoryReservationId",
      row.inventory_reservation_id,
    );

    this.assignOptional(
      result,
      "inventoryMovementId",
      row.inventory_movement_id,
    );

    this.assignOptional(
      result,
      "reservedAt",
      row.reserved_at,
    );

    this.assignOptional(
      result,
      "startedAt",
      row.started_at,
    );

    this.assignOptional(
      result,
      "completedAt",
      row.completed_at,
    );

    return result as unknown as ReplenishmentAllocation;
  }


  private mapSuggestion(
    row: DatabaseRow,
  ): ReplenishmentSuggestion {
    const result:
      Record<string, unknown> = {
        id:
          stringValue(row.id),

        tenantId:
          stringValue(
            row.account_id,
          ),

        replenishmentId:
          stringValue(
            row.replenishment_id,
          ),

        replenishmentItemId:
          stringValue(
            row
              .replenishment_item_id,
          ),

        sourceLocationId:
          stringValue(
            row.source_location_id,
          ),

        destinationLocationId:
          stringValue(
            row
              .destination_location_id,
          ),

        productId:
          stringValue(
            row.product_id,
          ),

        stockStatus:
          stringValue(
            row.stock_status,
          ),

        unit:
          stringValue(
            row.unit,
          ),

        suggestedQuantity:
          numberValue(
            row.suggested_quantity,
          ),

        availableQuantity:
          numberValue(
            row.available_quantity,
          ),

        sourceRemainingQuantity:
          numberValue(
            row
              .source_remaining_quantity,
          ),

        sourceDistance:
          numberValue(
            row.source_distance,
          ),

        capacityScore:
          numberValue(
            row.capacity_score,
          ),

        distanceScore:
          numberValue(
            row.distance_score,
          ),

        stockAgeScore:
          numberValue(
            row.stock_age_score,
          ),

        compatibilityScore:
          numberValue(
            row.compatibility_score,
          ),

        totalScore:
          numberValue(
            row.total_score,
          ),

        reasons:
          Array.isArray(
            row.reasons,
          )
            ? row.reasons
            : [],

        warnings:
          Array.isArray(
            row.warnings,
          )
            ? row.warnings
            : [],

        createdAt:
          stringValue(
            row.created_at,
          ),
      };

    this.assignOptional(
      result,
      "skuId",
      row.sku_id,
    );

    this.assignOptional(
      result,
      "inventoryBalanceId",
      row.inventory_balance_id,
    );

    this.assignOptional(
      result,
      "tracking",
      row.tracking,
    );

    return result as unknown as ReplenishmentSuggestion;
  }


  private mapTask(
    row: DatabaseRow,
  ): ReplenishmentTask {
    const result:
      Record<string, unknown> = {
        id:
          stringValue(row.id),

        tenantId:
          stringValue(
            row.account_id,
          ),

        replenishmentId:
          stringValue(
            row.replenishment_id,
          ),

        warehouseId:
          stringValue(
            row.warehouse_id,
          ),

        type:
          row.type,

        status:
          row.status,

        priority:
          numberValue(
            row.priority,
          ),

        sequence:
          numberValue(
            row.sequence,
          ),

        createdBy:
          stringValue(
            row.created_by,
          ),

        createdAt:
          stringValue(
            row.created_at,
          ),

        updatedAt:
          stringValue(
            row.updated_at,
          ),
      };

    this.assignOptional(
      result,
      "replenishmentItemId",
      row.replenishment_item_id,
    );

    this.assignOptional(
      result,
      "allocationId",
      row.allocation_id,
    );

    this.assignOptional(
      result,
      "sourceLocationId",
      row.source_location_id,
    );

    this.assignOptional(
      result,
      "destinationLocationId",
      row.destination_location_id,
    );

    this.assignOptional(
      result,
      "productId",
      row.product_id,
    );

    this.assignOptional(
      result,
      "assignedUserId",
      row.assigned_user_id,
    );

    this.assignOptional(
      result,
      "assignedTeamId",
      row.assigned_team_id,
    );

    this.assignOptional(
      result,
      "assignedEquipmentId",
      row.assigned_equipment_id,
    );

    this.assignOptional(
      result,
      "plannedAt",
      row.planned_at,
    );

    this.assignOptional(
      result,
      "startedAt",
      row.started_at,
    );

    this.assignOptional(
      result,
      "completedAt",
      row.completed_at,
    );

    this.assignOptional(
      result,
      "notes",
      row.notes,
    );

    return result as unknown as ReplenishmentTask;
  }


  private mapException(
    row: DatabaseRow,
  ): ReplenishmentException {
    const result:
      Record<string, unknown> = {
        id:
          stringValue(row.id),

        tenantId:
          stringValue(
            row.account_id,
          ),

        replenishmentId:
          stringValue(
            row.replenishment_id,
          ),

        type:
          row.type,

        message:
          stringValue(
            row.message,
          ),

        resolved:
          Boolean(
            row.resolved,
          ),

        createdAt:
          stringValue(
            row.created_at,
          ),
      };

    this.assignOptional(
      result,
      "replenishmentItemId",
      row.replenishment_item_id,
    );

    this.assignOptional(
      result,
      "taskId",
      row.task_id,
    );

    this.assignOptional(
      result,
      "allocationId",
      row.allocation_id,
    );

    this.assignOptional(
      result,
      "warehouseId",
      row.warehouse_id,
    );

    this.assignOptional(
      result,
      "sourceLocationId",
      row.source_location_id,
    );

    this.assignOptional(
      result,
      "destinationLocationId",
      row.destination_location_id,
    );

    this.assignOptional(
      result,
      "productId",
      row.product_id,
    );

    this.assignOptional(
      result,
      "skuId",
      row.sku_id,
    );

    this.assignOptional(
      result,
      "resolvedBy",
      row.resolved_by,
    );

    this.assignOptional(
      result,
      "resolvedAt",
      row.resolved_at,
    );

    this.assignOptional(
      result,
      "resolutionNotes",
      row.resolution_notes,
    );

    return result as unknown as ReplenishmentException;
  }


  private mapRule(
    row: DatabaseRow,
  ): ReplenishmentRule {
    const result:
      Record<string, unknown> = {
        id:
          stringValue(row.id),

        tenantId:
          stringValue(
            row.account_id,
          ),

        code:
          stringValue(
            row.code,
          ),

        name:
          stringValue(
            row.name,
          ),

        strategy:
          row.strategy,

        priority:
          numberValue(
            row.priority,
          ),

        automaticRelease:
          Boolean(
            row.automatic_release,
          ),

        allowPartialAllocation:
          Boolean(
            row
              .allow_partial_allocation,
          ),

        active:
          Boolean(
            row.active,
          ),

        createdBy:
          stringValue(
            row.created_by,
          ),

        createdAt:
          stringValue(
            row.created_at,
          ),

        updatedAt:
          stringValue(
            row.updated_at,
          ),
      };

    this.assignOptional(
      result,
      "description",
      row.description,
    );

    this.assignOptional(
      result,
      "warehouseId",
      row.warehouse_id,
    );

    this.assignOptional(
      result,
      "zoneId",
      row.zone_id,
    );

    this.assignOptional(
      result,
      "destinationLocationId",
      row.destination_location_id,
    );

    this.assignOptional(
      result,
      "productId",
      row.product_id,
    );

    this.assignOptional(
      result,
      "skuId",
      row.sku_id,
    );

    this.assignOptional(
      result,
      "productCategoryId",
      row.product_category_id,
    );

    this.assignOptional(
      result,
      "abcClass",
      row.abc_class,
    );

    this.assignOptionalNumber(
      result,
      "minimumQuantity",
      row.minimum_quantity,
    );

    this.assignOptionalNumber(
      result,
      "maximumQuantity",
      row.maximum_quantity,
    );

    this.assignOptionalNumber(
      result,
      "safetyStockQuantity",
      row.safety_stock_quantity,
    );

    this.assignOptionalNumber(
      result,
      "reorderPoint",
      row.reorder_point,
    );

    this.assignOptionalNumber(
      result,
      "targetFillPercentage",
      row.target_fill_percentage,
    );

    this.assignOptionalNumber(
      result,
      "minimumTransferQuantity",
      row.minimum_transfer_quantity,
    );

    this.assignOptionalNumber(
      result,
      "maximumTransferQuantity",
      row.maximum_transfer_quantity,
    );

    this.assignOptionalNumber(
      result,
      "transferMultiple",
      row.transfer_multiple,
    );

    this.assignOptionalNumber(
      result,
      "leadTimeMinutes",
      row.lead_time_minutes,
    );

    return result as unknown as ReplenishmentRule;
  }


  private async listRows(
    table: string,
    tenantId: string,
    replenishmentId: string,
    orderColumn: string,
    ascending: boolean,
  ): Promise<DatabaseRow[]> {
    const { data, error } =
      await this.table(
        table,
      )
        .select("*")
        .eq(
          "account_id",
          tenantId,
        )
        .eq(
          "replenishment_id",
          replenishmentId,
        )
        .order(
          orderColumn,
          {
            ascending,
          },
        );

    this.throwIfError(
      error,
      "İkmal alt kayıtları okunamadı.",
    );

    return (
      data ?? []
    ) as DatabaseRow[];
  }


  private table(
    tableName: string,
  ): QueryBuilder {
    return (
      this.client as any
    ).from(
      tableName,
    );
  }


  private assignOptional(
    target:
      Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (
      value !== null &&
      value !== undefined
    ) {
      target[key] = value;
    }
  }


  private assignOptionalNumber(
    target:
      Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (
      value !== null &&
      value !== undefined
    ) {
      target[key] =
        Number(value);
    }
  }


  private throwIfError(
    error:
      {
        message?: string;
      }
      | null
      | undefined,
    fallback: string,
  ): void {
    if (!error) {
      return;
    }

    throw new Error(
      error.message
        ? `${fallback} ${error.message}`
        : fallback,
    );
  }
}
