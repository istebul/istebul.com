import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  OperationsExceptionFilter,
  OperationsExceptionRecord,
} from "../types/OperationsExceptionAnalytics";
import type {
  OperationsExceptionRepository,
} from "./OperationsExceptionRepository";

const TABLE =
  "warehouse_operations_exceptions";

const SELECT = [
  "id",
  "account_id",
  "warehouse_id",
  "process",
  "category",
  "code",
  "severity",
  "root_cause",
  "description",
  "occurred_at",
  "resolved_at",
  "resolution_note",
  "delay_minutes",
  "impacted_orders",
  "impacted_tasks",
  "impacted_items",
  "created_at",
].join(",");

interface ExceptionRow {
  id: string;
  account_id: string;
  warehouse_id: string | null;
  process: OperationsExceptionRecord["process"];
  category: OperationsExceptionRecord["category"];
  code: string;
  severity: OperationsExceptionRecord["severity"];
  root_cause: string;
  description: string;
  occurred_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
  delay_minutes: number;
  impacted_orders: number;
  impacted_tasks: number;
  impacted_items: number;
  created_at: string;
}

interface SupabaseErrorLike {
  message: string;
}

function mapExceptionRow(
  row: ExceptionRow,
): OperationsExceptionRecord {
  return {
    id: row.id,
    tenantId: row.account_id,
    ...(row.warehouse_id !== null
      ? { warehouseId: row.warehouse_id }
      : {}),
    process: row.process,
    category: row.category,
    code: row.code,
    severity: row.severity,
    rootCause: row.root_cause,
    description: row.description,
    occurredAt: row.occurred_at,
    ...(row.resolved_at !== null
      ? { resolvedAt: row.resolved_at }
      : {}),
    ...(row.resolution_note !== null
      ? { resolutionNote: row.resolution_note }
      : {}),
    delayMinutes: Number(row.delay_minutes),
    impactedOrders: Number(row.impacted_orders),
    impactedTasks: Number(row.impacted_tasks),
    impactedItems: Number(row.impacted_items),
    createdAt: row.created_at,
  };
}

function toExceptionRow(
  record: OperationsExceptionRecord,
) {
  return {
    id: record.id,
    account_id: record.tenantId,
    warehouse_id:
      record.warehouseId ?? null,
    process: record.process,
    category: record.category,
    code: record.code,
    severity: record.severity,
    root_cause: record.rootCause,
    description: record.description,
    occurred_at: record.occurredAt,
    resolved_at:
      record.resolvedAt ?? null,
    resolution_note:
      record.resolutionNote ?? null,
    delay_minutes: record.delayMinutes,
    impacted_orders: record.impactedOrders,
    impacted_tasks: record.impactedTasks,
    impacted_items: record.impactedItems,
    created_at: record.createdAt,
  };
}

export class SupabaseOperationsExceptionRepository
  implements OperationsExceptionRepository
{
  private readonly client: SupabaseClient;

  constructor(
    client: SupabaseClient,
  ) {
    this.client = client;
  }

  async save(
    record: OperationsExceptionRecord,
  ): Promise<OperationsExceptionRecord> {
    const { data, error } =
      await this.client
        .from(TABLE)
        .upsert(
          toExceptionRow(record),
          { onConflict: "id" },
        )
        .select(SELECT)
        .single();

    if (error || !data) {
      this.throwError(
        "Operasyon istisnası saklanamadı",
        error,
      );
    }

    return mapExceptionRow(
      data as unknown as ExceptionRow,
    );
  }

  async findById(
    tenantId: string,
    exceptionId: string,
  ): Promise<OperationsExceptionRecord | null> {
    const { data, error } =
      await this.client
        .from(TABLE)
        .select(SELECT)
        .eq("account_id", tenantId)
        .eq("id", exceptionId)
        .maybeSingle();

    if (error) {
      this.throwError(
        "Operasyon istisnası okunamadı",
        error,
      );
    }

    return data
      ? mapExceptionRow(
          data as unknown as ExceptionRow,
        )
      : null;
  }

  async list(
    filter: OperationsExceptionFilter,
  ): Promise<OperationsExceptionRecord[]> {
    let query =
      this.client
        .from(TABLE)
        .select(SELECT)
        .eq("account_id", filter.tenantId)
        .gte("occurred_at", filter.periodStart)
        .lte("occurred_at", filter.periodEnd);

    if (filter.warehouseId !== undefined) {
      query =
        query.eq(
          "warehouse_id",
          filter.warehouseId,
        );
    }

    if (filter.process !== undefined) {
      query =
        query.eq(
          "process",
          filter.process,
        );
    }

    if (filter.severity !== undefined) {
      query =
        query.eq(
          "severity",
          filter.severity,
        );
    }

    if (filter.unresolvedOnly === true) {
      query =
        query.is(
          "resolved_at",
          null,
        );
    }

    const { data, error } =
      await query.order(
        "occurred_at",
        { ascending: false },
      );

    if (error) {
      this.throwError(
        "Operasyon istisnaları listelenemedi",
        error,
      );
    }

    return (data ?? []).map(
      (row) =>
        mapExceptionRow(
          row as unknown as ExceptionRow,
        ),
    );
  }

  private throwError(
    message: string,
    error:
      | SupabaseErrorLike
      | null,
  ): never {
    throw new Error(
      `${message}: ${
        error?.message ?? "Bilinmeyen veritabanı hatası."
      }`,
    );
  }
}
