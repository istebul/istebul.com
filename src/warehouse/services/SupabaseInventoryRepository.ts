import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  InventoryBalance,
  InventoryBalanceFilter,
  InventoryBalanceKey,
} from "../types/InventoryBalance";
import type {
  InventoryMovement,
} from "../types/InventoryMovement";
import {
  InventoryMovementConflictError,
} from "../types/InventoryErrors";
import type {
  InventoryMovementListFilter,
  InventoryRepository,
} from "./InventoryRepository";

const MOVEMENT_TABLE =
  "warehouse_inventory_movements";

const BALANCE_TABLE =
  "warehouse_inventory_balances";

const MOVEMENT_SELECT = [
  "id",
  "account_id",
  "movement_number",
  "movement_type",
  "direction",
  "warehouse_id",
  "location_id",
  "product_id",
  "sku_id",
  "source_warehouse_id",
  "source_location_id",
  "destination_warehouse_id",
  "destination_location_id",
  "stock_status",
  "quantity",
  "unit",
  "lot_number",
  "serial_number",
  "production_date",
  "expiry_date",
  "reference_type",
  "reference_id",
  "reference_number",
  "reason",
  "notes",
  "reversal_of_movement_id",
  "transaction_group_id",
  "occurred_at",
  "created_by",
  "created_at",
].join(",");

const BALANCE_SELECT = [
  "account_id",
  "warehouse_id",
  "location_id",
  "product_id",
  "sku_id",
  "lot_number",
  "serial_number",
  "stock_status",
  "quantity",
  "unit",
  "last_movement_id",
  "last_movement_at",
].join(",");

interface MovementRow {
  id: string;
  account_id: string;
  movement_number: string;
  movement_type:
    InventoryMovement["movementType"];
  direction:
    InventoryMovement["direction"];
  warehouse_id: string;
  location_id: string;
  product_id: string;
  sku_id: string | null;
  source_warehouse_id: string | null;
  source_location_id: string | null;
  destination_warehouse_id: string | null;
  destination_location_id: string | null;
  stock_status:
    InventoryMovement["stockStatus"];
  quantity: number | string;
  unit: string;
  lot_number: string | null;
  serial_number: string | null;
  production_date: string | null;
  expiry_date: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  reason: string | null;
  notes: string | null;
  reversal_of_movement_id: string | null;
  transaction_group_id: string | null;
  occurred_at: string;
  created_by: string;
  created_at: string;
}

interface BalanceRow {
  account_id: string;
  warehouse_id: string;
  location_id: string;
  product_id: string;
  sku_id: string | null;
  lot_number: string | null;
  serial_number: string | null;
  stock_status:
    InventoryBalance["stockStatus"];
  quantity: number | string;
  unit: string;
  last_movement_id: string | null;
  last_movement_at: string | null;
}

interface SupabaseErrorLike {
  code?: string;
  message: string;
}

function mapMovementRow(
  row: MovementRow,
): InventoryMovement {
  const tracking = {
    ...(row.lot_number !== null
      ? { lotNumber: row.lot_number }
      : {}),
    ...(row.serial_number !== null
      ? { serialNumber: row.serial_number }
      : {}),
    ...(row.production_date !== null
      ? { productionDate: row.production_date }
      : {}),
    ...(row.expiry_date !== null
      ? { expiryDate: row.expiry_date }
      : {}),
  };

  const reference = {
    ...(row.reference_type !== null
      ? { referenceType: row.reference_type }
      : {}),
    ...(row.reference_id !== null
      ? { referenceId: row.reference_id }
      : {}),
    ...(row.reference_number !== null
      ? { referenceNumber: row.reference_number }
      : {}),
  };

  return {
    id: row.id,
    tenantId: row.account_id,
    movementNumber: row.movement_number,
    movementType: row.movement_type,
    direction: row.direction,
    warehouseId: row.warehouse_id,
    locationId: row.location_id,
    productId: row.product_id,
    stockStatus: row.stock_status,
    quantity: Number(row.quantity),
    unit: row.unit,
    occurredAt: row.occurred_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    ...(row.sku_id !== null
      ? { skuId: row.sku_id }
      : {}),
    ...(row.source_warehouse_id !== null
      ? {
          sourceWarehouseId:
            row.source_warehouse_id,
        }
      : {}),
    ...(row.source_location_id !== null
      ? {
          sourceLocationId:
            row.source_location_id,
        }
      : {}),
    ...(row.destination_warehouse_id !== null
      ? {
          destinationWarehouseId:
            row.destination_warehouse_id,
        }
      : {}),
    ...(row.destination_location_id !== null
      ? {
          destinationLocationId:
            row.destination_location_id,
        }
      : {}),
    ...(Object.keys(tracking).length > 0
      ? { tracking }
      : {}),
    ...(Object.keys(reference).length > 0
      ? { reference }
      : {}),
    ...(row.reason !== null
      ? { reason: row.reason }
      : {}),
    ...(row.notes !== null
      ? { notes: row.notes }
      : {}),
    ...(row.reversal_of_movement_id !== null
      ? {
          reversalOfMovementId:
            row.reversal_of_movement_id,
        }
      : {}),
    ...(row.transaction_group_id !== null
      ? {
          transactionGroupId:
            row.transaction_group_id,
        }
      : {}),
  };
}

function toMovementRow(
  movement: InventoryMovement,
) {
  return {
    id: movement.id,
    account_id: movement.tenantId,
    movement_number: movement.movementNumber,
    movement_type: movement.movementType,
    direction: movement.direction,
    warehouse_id: movement.warehouseId,
    location_id: movement.locationId,
    product_id: movement.productId,
    sku_id: movement.skuId ?? null,
    source_warehouse_id:
      movement.sourceWarehouseId ?? null,
    source_location_id:
      movement.sourceLocationId ?? null,
    destination_warehouse_id:
      movement.destinationWarehouseId ?? null,
    destination_location_id:
      movement.destinationLocationId ?? null,
    stock_status: movement.stockStatus,
    quantity: movement.quantity,
    unit: movement.unit,
    lot_number:
      movement.tracking?.lotNumber ?? null,
    serial_number:
      movement.tracking?.serialNumber ?? null,
    production_date:
      movement.tracking?.productionDate ?? null,
    expiry_date:
      movement.tracking?.expiryDate ?? null,
    reference_type:
      movement.reference?.referenceType ?? null,
    reference_id:
      movement.reference?.referenceId ?? null,
    reference_number:
      movement.reference?.referenceNumber ?? null,
    reason: movement.reason ?? null,
    notes: movement.notes ?? null,
    reversal_of_movement_id:
      movement.reversalOfMovementId ?? null,
    transaction_group_id:
      movement.transactionGroupId ?? null,
    occurred_at: movement.occurredAt,
    created_by: movement.createdBy,
    created_at: movement.createdAt,
  };
}

function mapBalanceRow(
  row: BalanceRow,
): InventoryBalance {
  return {
    tenantId: row.account_id,
    warehouseId: row.warehouse_id,
    locationId: row.location_id,
    productId: row.product_id,
    stockStatus: row.stock_status,
    quantity: Number(row.quantity),
    unit: row.unit,
    ...(row.sku_id !== null
      ? { skuId: row.sku_id }
      : {}),
    ...(row.lot_number !== null
      ? { lotNumber: row.lot_number }
      : {}),
    ...(row.serial_number !== null
      ? { serialNumber: row.serial_number }
      : {}),
    ...(row.last_movement_id !== null
      ? {
          lastMovementId:
            row.last_movement_id,
        }
      : {}),
    ...(row.last_movement_at !== null
      ? {
          lastMovementAt:
            row.last_movement_at,
        }
      : {}),
  };
}

function toBalanceRow(
  balance: InventoryBalance,
) {
  return {
    account_id: balance.tenantId,
    warehouse_id: balance.warehouseId,
    location_id: balance.locationId,
    product_id: balance.productId,
    sku_id: balance.skuId ?? null,
    lot_number: balance.lotNumber ?? null,
    serial_number:
      balance.serialNumber ?? null,
    stock_status: balance.stockStatus,
    quantity: balance.quantity,
    unit: balance.unit,
    last_movement_id:
      balance.lastMovementId ?? null,
    last_movement_at:
      balance.lastMovementAt ?? null,
  };
}

export class SupabaseInventoryRepository
  implements InventoryRepository
{
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findMovementById(
    tenantId: string,
    movementId: string,
  ): Promise<InventoryMovement | null> {
    const { data, error } = await this.client
      .from(MOVEMENT_TABLE)
      .select(MOVEMENT_SELECT)
      .eq("account_id", tenantId)
      .eq("id", movementId)
      .maybeSingle();

    if (error) {
      this.throwError(
        "Stok hareketi okunamadı",
        error,
      );
    }

    return data
      ? mapMovementRow(
          data as unknown as MovementRow,
        )
      : null;
  }

  async findMovementByNumber(
    tenantId: string,
    movementNumber: string,
  ): Promise<InventoryMovement | null> {
    const { data, error } = await this.client
      .from(MOVEMENT_TABLE)
      .select(MOVEMENT_SELECT)
      .eq("account_id", tenantId)
      .eq("movement_number", movementNumber)
      .maybeSingle();

    if (error) {
      this.throwError(
        "Stok hareket numarası okunamadı",
        error,
      );
    }

    return data
      ? mapMovementRow(
          data as unknown as MovementRow,
        )
      : null;
  }

  async listMovements(
    filter: InventoryMovementListFilter,
  ): Promise<InventoryMovement[]> {
    let query = this.client
      .from(MOVEMENT_TABLE)
      .select(MOVEMENT_SELECT)
      .eq("account_id", filter.tenantId);

    if (filter.warehouseId !== undefined) {
      query = query.eq(
        "warehouse_id",
        filter.warehouseId,
      );
    }

    if (filter.locationId !== undefined) {
      query = query.eq(
        "location_id",
        filter.locationId,
      );
    }

    if (filter.productId !== undefined) {
      query = query.eq(
        "product_id",
        filter.productId,
      );
    }

    if (filter.skuId !== undefined) {
      query = query.eq(
        "sku_id",
        filter.skuId,
      );
    }

    if (
      filter.transactionGroupId !== undefined
    ) {
      query = query.eq(
        "transaction_group_id",
        filter.transactionGroupId,
      );
    }

    const { data, error } =
      await query.order(
        "occurred_at",
        { ascending: true },
      );

    if (error) {
      this.throwError(
        "Stok hareketleri listelenemedi",
        error,
      );
    }

    return (data ?? []).map((row) =>
      mapMovementRow(
        row as unknown as MovementRow,
      ),
    );
  }

  async appendMovement(
    movement: InventoryMovement,
  ): Promise<InventoryMovement> {
    const { data, error } = await this.client
      .from(MOVEMENT_TABLE)
      .insert(toMovementRow(movement))
      .select(MOVEMENT_SELECT)
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        throw new InventoryMovementConflictError(
          movement.movementNumber,
        );
      }

      this.throwError(
        "Stok hareketi saklanamadı",
        error,
      );
    }

    return mapMovementRow(
      data as unknown as MovementRow,
    );
  }

  async findBalance(
    key: InventoryBalanceKey,
  ): Promise<InventoryBalance | null> {
    let query = this.client
      .from(BALANCE_TABLE)
      .select(BALANCE_SELECT)
      .eq("account_id", key.tenantId)
      .eq("warehouse_id", key.warehouseId)
      .eq("location_id", key.locationId)
      .eq("product_id", key.productId)
      .eq("stock_status", key.stockStatus);

    query =
      key.skuId === undefined
        ? query.is("sku_id", null)
        : query.eq("sku_id", key.skuId);

    query =
      key.lotNumber === undefined
        ? query.is("lot_number", null)
        : query.eq(
            "lot_number",
            key.lotNumber,
          );

    query =
      key.serialNumber === undefined
        ? query.is("serial_number", null)
        : query.eq(
            "serial_number",
            key.serialNumber,
          );

    const { data, error } =
      await query.maybeSingle();

    if (error) {
      this.throwError(
        "Stok bakiyesi okunamadı",
        error,
      );
    }

    return data
      ? mapBalanceRow(
          data as unknown as BalanceRow,
        )
      : null;
  }

  async listBalances(
    filter: InventoryBalanceFilter,
  ): Promise<InventoryBalance[]> {
    let query = this.client
      .from(BALANCE_TABLE)
      .select(BALANCE_SELECT)
      .eq("account_id", filter.tenantId);

    if (filter.warehouseId !== undefined) {
      query = query.eq(
        "warehouse_id",
        filter.warehouseId,
      );
    }

    if (filter.locationId !== undefined) {
      query = query.eq(
        "location_id",
        filter.locationId,
      );
    }

    if (filter.productId !== undefined) {
      query = query.eq(
        "product_id",
        filter.productId,
      );
    }

    if (filter.skuId !== undefined) {
      query = query.eq(
        "sku_id",
        filter.skuId,
      );
    }

    if (filter.lotNumber !== undefined) {
      query = query.eq(
        "lot_number",
        filter.lotNumber,
      );
    }

    if (filter.serialNumber !== undefined) {
      query = query.eq(
        "serial_number",
        filter.serialNumber,
      );
    }

    if (filter.stockStatus !== undefined) {
      query = query.eq(
        "stock_status",
        filter.stockStatus,
      );
    }

    const { data, error } =
      await query.order(
        "product_id",
        { ascending: true },
      );

    if (error) {
      this.throwError(
        "Stok bakiyeleri listelenemedi",
        error,
      );
    }

    return (data ?? []).map((row) =>
      mapBalanceRow(
        row as unknown as BalanceRow,
      ),
    );
  }

  async saveBalance(
    balance: InventoryBalance,
  ): Promise<InventoryBalance> {
    const { data, error } = await this.client
      .from(BALANCE_TABLE)
      .upsert(
        toBalanceRow(balance),
        {
          onConflict: [
            "account_id",
            "warehouse_id",
            "location_id",
            "product_id",
            "sku_id",
            "lot_number",
            "serial_number",
            "stock_status",
          ].join(","),
        },
      )
      .select(BALANCE_SELECT)
      .single();

    if (error || !data) {
      this.throwError(
        "Stok bakiyesi saklanamadı",
        error,
      );
    }

    return mapBalanceRow(
      data as unknown as BalanceRow,
    );
  }

  private throwError(
    message: string,
    error: SupabaseErrorLike | null,
  ): never {
    throw new Error(
      `${message}: ${
        error?.message ??
        "Bilinmeyen veritabanı hatası."
      }`,
    );
  }
}
