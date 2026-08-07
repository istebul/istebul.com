import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  OperationsExceptionFilter,
  OperationsProcessVolume,
  WarehouseOperationProcess,
} from "../types/OperationsExceptionAnalytics";
import type {
  OperationsProcessVolumeRepository,
} from "./OperationsProcessVolumeRepository";

const TABLE =
  "warehouse_operations_process_volumes";

const SELECT =
  "process,operation_count";

interface ProcessVolumeRow {
  process: WarehouseOperationProcess;
  operation_count: number;
}

/**
 * Supabase tabanlı operasyon süreç hacmi okuyucusu.
 *
 * Firma-geneli analizlerde yalnız warehouse_id IS NULL satırları,
 * depo analizlerinde yalnız ilgili warehouse_id satırları okunur.
 */
export class SupabaseOperationsProcessVolumeRepository
  implements OperationsProcessVolumeRepository
{
  private readonly client: SupabaseClient;

  constructor(
    client: SupabaseClient,
  ) {
    this.client = client;
  }

  async list(
    filter: OperationsExceptionFilter,
  ): Promise<OperationsProcessVolume[]> {
    let query =
      this.client
        .from(TABLE)
        .select(SELECT)
        .eq("account_id", filter.tenantId)
        .gte("period_end", filter.periodStart)
        .lte("period_start", filter.periodEnd);

    query =
      filter.warehouseId === undefined
        ? query.is("warehouse_id", null)
        : query.eq(
            "warehouse_id",
            filter.warehouseId,
          );

    const { data, error } =
      await query.order(
        "process",
        { ascending: true },
      );

    if (error) {
      throw new Error(
        `Operasyon süreç hacimleri okunamadı: ${
          error.message
        }`,
      );
    }

    return (data ?? []).map(
      (row) => {
        const typed =
          row as unknown as ProcessVolumeRow;

        return {
          process: typed.process,
          operationCount:
            typed.operation_count,
        };
      },
    );
  }
}
