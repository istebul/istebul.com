import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Picking,
  PickingListFilter,
} from "../types/Picking";
import type { PickingBatch } from "../types/PickingBatch";
import type { PickingException } from "../types/PickingException";
import type { PickingItem } from "../types/PickingItem";
import type { PickingRoute } from "../types/PickingRoute";
import type { PickingSuggestion } from "../types/PickingSuggestion";
import type { PickingTask } from "../types/PickingTask";
import type { PickingWave } from "../types/PickingWave";
import type { PickingRepository } from "./PickingRepository";

const PICKING_TABLE = "warehouse_pickings";
const ITEM_TABLE = "warehouse_picking_items";
const SUGGESTION_TABLE = "warehouse_picking_suggestions";
const TASK_TABLE = "warehouse_picking_tasks";
const ROUTE_TABLE = "warehouse_picking_routes";
const EXCEPTION_TABLE = "warehouse_picking_exceptions";
const WAVE_TABLE = "warehouse_picking_waves";
const BATCH_TABLE = "warehouse_picking_batches";

const PICKING_SELECT = [
  "id",
  "account_id",
  "picking_number",
  "warehouse_id",
  "destination_location_id",
  "strategy",
  "status",
  "order_id",
  "order_number",
  "wave_id",
  "batch_id",
  "reference_type",
  "reference_id",
  "reference_number",
  "priority",
  "planned_at",
  "released_at",
  "started_at",
  "completed_at",
  "cancelled_at",
  "cancellation_reason",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const ITEM_SELECT = [
  "id",
  "account_id",
  "picking_id",
  "line_number",
  "warehouse_id",
  "product_id",
  "sku_id",
  "requested_quantity",
  "picked_quantity",
  "short_quantity",
  "remaining_quantity",
  "unit",
  "stock_status",
  "strategy",
  "lot_number",
  "serial_number",
  "production_date",
  "expiry_date",
  "tracking",
  "source_location_id",
  "destination_location_id",
  "suggestion_id",
  "reservation_id",
  "inventory_movement_ids",
  "transaction_group_ids",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const SUGGESTION_SELECT = [
  "id",
  "account_id",
  "picking_id",
  "picking_item_id",
  "warehouse_id",
  "location_id",
  "strategy",
  "suggested_quantity",
  "unit",
  "balance",
  "score",
  "reasons",
  "warnings",
  "selected",
  "created_at",
].join(",");

const TASK_SELECT = [
  "id",
  "account_id",
  "picking_id",
  "picking_item_id",
  "warehouse_id",
  "source_location_id",
  "destination_location_id",
  "assigned_user_id",
  "assigned_equipment_id",
  "status",
  "priority",
  "sequence",
  "planned_at",
  "started_at",
  "completed_at",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const ROUTE_SELECT = [
  "id",
  "account_id",
  "picking_id",
  "warehouse_id",
  "start_location_id",
  "end_location_id",
  "total_distance",
  "estimated_duration_seconds",
  "optimized",
  "steps",
  "created_at",
].join(",");

const EXCEPTION_SELECT = [
  "id",
  "account_id",
  "picking_id",
  "picking_item_id",
  "task_id",
  "type",
  "message",
  "warehouse_id",
  "location_id",
  "product_id",
  "resolved",
  "resolved_by",
  "resolved_at",
  "resolution_notes",
  "created_at",
].join(",");

const WAVE_SELECT = [
  "id",
  "account_id",
  "wave_number",
  "warehouse_id",
  "status",
  "picking_ids",
  "planned_at",
  "released_at",
  "completed_at",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const BATCH_SELECT = [
  "id",
  "account_id",
  "batch_number",
  "warehouse_id",
  "status",
  "picking_ids",
  "assigned_user_id",
  "assigned_equipment_id",
  "planned_at",
  "released_at",
  "completed_at",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

interface PickingRow {
  id: string;
  account_id: string;
  picking_number: string;
  warehouse_id: string;
  destination_location_id: string;
  strategy: Picking["strategy"];
  status: Picking["status"];
  order_id: string | null;
  order_number: string | null;
  wave_id: string | null;
  batch_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  priority: number;
  planned_at: string | null;
  released_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: string;
  account_id: string;
  picking_id: string;
  line_number: number;
  warehouse_id: string;
  product_id: string;
  sku_id: string | null;
  requested_quantity: number | string;
  picked_quantity: number | string;
  short_quantity: number | string;
  remaining_quantity: number | string;
  unit: string;
  stock_status: PickingItem["stockStatus"];
  strategy: PickingItem["strategy"];
  lot_number: string | null;
  serial_number: string | null;
  production_date: string | null;
  expiry_date: string | null;
  tracking: NonNullable<PickingItem["tracking"]> | null;
  source_location_id: string | null;
  destination_location_id: string | null;
  suggestion_id: string | null;
  reservation_id: string | null;
  inventory_movement_ids: string[] | null;
  transaction_group_ids: string[] | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface SuggestionRow {
  id: string;
  account_id: string;
  picking_id: string;
  picking_item_id: string;
  warehouse_id: string;
  location_id: string;
  strategy: PickingSuggestion["strategy"];
  suggested_quantity: number | string;
  unit: string;
  balance: PickingSuggestion["balance"];
  score: PickingSuggestion["score"];
  reasons: string[] | null;
  warnings: string[] | null;
  selected: boolean;
  created_at: string;
}

interface TaskRow {
  id: string;
  account_id: string;
  picking_id: string;
  picking_item_id: string | null;
  warehouse_id: string;
  source_location_id: string;
  destination_location_id: string | null;
  assigned_user_id: string | null;
  assigned_equipment_id: string | null;
  status: PickingTask["status"];
  priority: number;
  sequence: number;
  planned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface RouteRow {
  id: string;
  account_id: string;
  picking_id: string;
  warehouse_id: string;
  start_location_id: string | null;
  end_location_id: string | null;
  total_distance: number | string;
  estimated_duration_seconds: number;
  optimized: boolean;
  steps: PickingRoute["steps"] | null;
  created_at: string;
}

interface ExceptionRow {
  id: string;
  account_id: string;
  picking_id: string;
  picking_item_id: string | null;
  task_id: string | null;
  type: PickingException["type"];
  message: string;
  warehouse_id: string | null;
  location_id: string | null;
  product_id: string | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

interface WaveRow {
  id: string;
  account_id: string;
  wave_number: string;
  warehouse_id: string;
  status: PickingWave["status"];
  picking_ids: string[] | null;
  planned_at: string | null;
  released_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface BatchRow {
  id: string;
  account_id: string;
  batch_number: string;
  warehouse_id: string;
  status: PickingBatch["status"];
  picking_ids: string[] | null;
  assigned_user_id: string | null;
  assigned_equipment_id: string | null;
  planned_at: string | null;
  released_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseErrorLike {
  message: string;
}

function mapItemRow(row: ItemRow): PickingItem {
  const tracking = {
    ...(row.tracking ?? {}),
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

  return {
    id: row.id,
    tenantId: row.account_id,
    pickingId: row.picking_id,
    lineNumber: row.line_number,
    warehouseId: row.warehouse_id,
    productId: row.product_id,
    requestedQuantity: Number(row.requested_quantity),
    pickedQuantity: Number(row.picked_quantity),
    shortQuantity: Number(row.short_quantity),
    remainingQuantity: Number(row.remaining_quantity),
    unit: row.unit,
    stockStatus: row.stock_status,
    strategy: row.strategy,
    inventoryMovementIds: row.inventory_movement_ids ?? [],
    transactionGroupIds: row.transaction_group_ids ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.sku_id !== null
      ? { skuId: row.sku_id }
      : {}),
    ...(Object.keys(tracking).length > 0
      ? { tracking }
      : {}),
    ...(row.source_location_id !== null
      ? { sourceLocationId: row.source_location_id }
      : {}),
    ...(row.destination_location_id !== null
      ? { destinationLocationId: row.destination_location_id }
      : {}),
    ...(row.suggestion_id !== null
      ? { suggestionId: row.suggestion_id }
      : {}),
    ...(row.reservation_id !== null
      ? { reservationId: row.reservation_id }
      : {}),
    ...(row.notes !== null
      ? { notes: row.notes }
      : {}),
  };
}

function mapSuggestionRow(
  row: SuggestionRow,
): PickingSuggestion {
  return {
    id: row.id,
    tenantId: row.account_id,
    pickingId: row.picking_id,
    pickingItemId: row.picking_item_id,
    warehouseId: row.warehouse_id,
    locationId: row.location_id,
    strategy: row.strategy,
    suggestedQuantity: Number(row.suggested_quantity),
    unit: row.unit,
    balance: row.balance,
    score: row.score,
    reasons: row.reasons ?? [],
    warnings: row.warnings ?? [],
    selected: row.selected,
    createdAt: row.created_at,
  };
}

function mapTaskRow(row: TaskRow): PickingTask {
  return {
    id: row.id,
    tenantId: row.account_id,
    pickingId: row.picking_id,
    warehouseId: row.warehouse_id,
    sourceLocationId: row.source_location_id,
    status: row.status,
    priority: row.priority,
    sequence: row.sequence,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.picking_item_id !== null
      ? { pickingItemId: row.picking_item_id }
      : {}),
    ...(row.destination_location_id !== null
      ? { destinationLocationId: row.destination_location_id }
      : {}),
    ...(row.assigned_user_id !== null
      ? { assignedUserId: row.assigned_user_id }
      : {}),
    ...(row.assigned_equipment_id !== null
      ? { assignedEquipmentId: row.assigned_equipment_id }
      : {}),
    ...(row.planned_at !== null
      ? { plannedAt: row.planned_at }
      : {}),
    ...(row.started_at !== null
      ? { startedAt: row.started_at }
      : {}),
    ...(row.completed_at !== null
      ? { completedAt: row.completed_at }
      : {}),
    ...(row.notes !== null
      ? { notes: row.notes }
      : {}),
  };
}

function mapRouteRow(row: RouteRow): PickingRoute {
  return {
    id: row.id,
    tenantId: row.account_id,
    pickingId: row.picking_id,
    warehouseId: row.warehouse_id,
    totalDistance: Number(row.total_distance),
    estimatedDurationSeconds:
      Number(row.estimated_duration_seconds),
    optimized: row.optimized,
    steps: row.steps ?? [],
    createdAt: row.created_at,
    ...(row.start_location_id !== null
      ? { startLocationId: row.start_location_id }
      : {}),
    ...(row.end_location_id !== null
      ? { endLocationId: row.end_location_id }
      : {}),
  };
}

function mapExceptionRow(
  row: ExceptionRow,
): PickingException {
  return {
    id: row.id,
    tenantId: row.account_id,
    pickingId: row.picking_id,
    type: row.type,
    message: row.message,
    resolved: row.resolved,
    createdAt: row.created_at,
    ...(row.picking_item_id !== null
      ? { pickingItemId: row.picking_item_id }
      : {}),
    ...(row.task_id !== null
      ? { taskId: row.task_id }
      : {}),
    ...(row.warehouse_id !== null
      ? { warehouseId: row.warehouse_id }
      : {}),
    ...(row.location_id !== null
      ? { locationId: row.location_id }
      : {}),
    ...(row.product_id !== null
      ? { productId: row.product_id }
      : {}),
    ...(row.resolved_by !== null
      ? { resolvedBy: row.resolved_by }
      : {}),
    ...(row.resolved_at !== null
      ? { resolvedAt: row.resolved_at }
      : {}),
    ...(row.resolution_notes !== null
      ? { resolutionNotes: row.resolution_notes }
      : {}),
  };
}

function mapWaveRow(row: WaveRow): PickingWave {
  return {
    id: row.id,
    tenantId: row.account_id,
    waveNumber: row.wave_number,
    warehouseId: row.warehouse_id,
    status: row.status,
    pickingIds: row.picking_ids ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.planned_at !== null
      ? { plannedAt: row.planned_at }
      : {}),
    ...(row.released_at !== null
      ? { releasedAt: row.released_at }
      : {}),
    ...(row.completed_at !== null
      ? { completedAt: row.completed_at }
      : {}),
    ...(row.notes !== null
      ? { notes: row.notes }
      : {}),
  };
}

function mapBatchRow(row: BatchRow): PickingBatch {
  return {
    id: row.id,
    tenantId: row.account_id,
    batchNumber: row.batch_number,
    warehouseId: row.warehouse_id,
    status: row.status,
    pickingIds: row.picking_ids ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.assigned_user_id !== null
      ? { assignedUserId: row.assigned_user_id }
      : {}),
    ...(row.assigned_equipment_id !== null
      ? { assignedEquipmentId: row.assigned_equipment_id }
      : {}),
    ...(row.planned_at !== null
      ? { plannedAt: row.planned_at }
      : {}),
    ...(row.released_at !== null
      ? { releasedAt: row.released_at }
      : {}),
    ...(row.completed_at !== null
      ? { completedAt: row.completed_at }
      : {}),
    ...(row.notes !== null
      ? { notes: row.notes }
      : {}),
  };
}

function mapPickingRow(
  row: PickingRow,
  items: readonly PickingItem[],
  suggestions: readonly PickingSuggestion[],
  exceptions: readonly PickingException[],
  routes: readonly PickingRoute[],
): Picking {
  return {
    id: row.id,
    tenantId: row.account_id,
    pickingNumber: row.picking_number,
    warehouseId: row.warehouse_id,
    destinationLocationId: row.destination_location_id,
    strategy: row.strategy,
    status: row.status,
    priority: row.priority,
    items,
    suggestions,
    exceptions,
    routes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.order_id !== null
      ? { orderId: row.order_id }
      : {}),
    ...(row.order_number !== null
      ? { orderNumber: row.order_number }
      : {}),
    ...(row.wave_id !== null
      ? { waveId: row.wave_id }
      : {}),
    ...(row.batch_id !== null
      ? { batchId: row.batch_id }
      : {}),
    ...(row.reference_type !== null
      ? { referenceType: row.reference_type }
      : {}),
    ...(row.reference_id !== null
      ? { referenceId: row.reference_id }
      : {}),
    ...(row.reference_number !== null
      ? { referenceNumber: row.reference_number }
      : {}),
    ...(row.planned_at !== null
      ? { plannedAt: row.planned_at }
      : {}),
    ...(row.released_at !== null
      ? { releasedAt: row.released_at }
      : {}),
    ...(row.started_at !== null
      ? { startedAt: row.started_at }
      : {}),
    ...(row.completed_at !== null
      ? { completedAt: row.completed_at }
      : {}),
    ...(row.cancelled_at !== null
      ? { cancelledAt: row.cancelled_at }
      : {}),
    ...(row.cancellation_reason !== null
      ? { cancellationReason: row.cancellation_reason }
      : {}),
    ...(row.notes !== null
      ? { notes: row.notes }
      : {}),
  };
}

export class SupabasePickingRepository
  implements PickingRepository
{
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(
    tenantId: string,
    pickingId: string,
  ): Promise<Picking | null> {
    return this.findOne(
      tenantId,
      "id",
      pickingId,
      "Toplama kaydı okunamadı",
    );
  }

  async findByNumber(
    tenantId: string,
    pickingNumber: string,
  ): Promise<Picking | null> {
    return this.findOne(
      tenantId,
      "picking_number",
      pickingNumber,
      "Toplama numarası okunamadı",
    );
  }

  async findByOrderId(
    tenantId: string,
    orderId: string,
  ): Promise<Picking | null> {
    return this.findOne(
      tenantId,
      "order_id",
      orderId,
      "Siparişe bağlı toplama okunamadı",
    );
  }

  async list(
    filter: PickingListFilter,
  ): Promise<Picking[]> {
    let query = this.client
      .from(PICKING_TABLE)
      .select(PICKING_SELECT)
      .eq("account_id", filter.tenantId);

    if (filter.warehouseId !== undefined) {
      query = query.eq(
        "warehouse_id",
        filter.warehouseId,
      );
    }

    if (filter.destinationLocationId !== undefined) {
      query = query.eq(
        "destination_location_id",
        filter.destinationLocationId,
      );
    }

    if (filter.strategy !== undefined) {
      query = query.eq(
        "strategy",
        filter.strategy,
      );
    }

    if (filter.status !== undefined) {
      query = query.eq(
        "status",
        filter.status,
      );
    }

    if (filter.orderId !== undefined) {
      query = query.eq(
        "order_id",
        filter.orderId,
      );
    }

    if (filter.waveId !== undefined) {
      query = query.eq(
        "wave_id",
        filter.waveId,
      );
    }

    if (filter.batchId !== undefined) {
      query = query.eq(
        "batch_id",
        filter.batchId,
      );
    }

    if (filter.referenceType !== undefined) {
      query = query.eq(
        "reference_type",
        filter.referenceType,
      );
    }

    if (filter.referenceId !== undefined) {
      query = query.eq(
        "reference_id",
        filter.referenceId,
      );
    }

    const { data, error } = await query.order(
      "created_at",
      { ascending: false },
    );

    if (error) {
      this.throwError(
        "Toplama kayıtları listelenemedi",
        error,
      );
    }

    let rows =
      (data ?? []) as unknown as PickingRow[];

    const search = filter.search
      ?.trim()
      .toLocaleLowerCase("tr-TR");

    if (search) {
      rows = rows.filter(
        (row) =>
          row.picking_number
            .toLocaleLowerCase("tr-TR")
            .includes(search) ||
          row.order_number
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true ||
          row.reference_number
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true,
      );
    }

    return Promise.all(
      rows.map((row) => this.hydrate(row)),
    );
  }

  async save(
    _picking: Picking,
  ): Promise<Picking> {
    return this.rejectDirectWrite();
  }

  async saveItem(
    _item: PickingItem,
  ): Promise<PickingItem> {
    return this.rejectDirectWrite();
  }

  async saveSuggestion(
    _suggestion: PickingSuggestion,
  ): Promise<PickingSuggestion> {
    return this.rejectDirectWrite();
  }

  async saveTask(
    _task: PickingTask,
  ): Promise<PickingTask> {
    return this.rejectDirectWrite();
  }

  async saveRoute(
    _route: PickingRoute,
  ): Promise<PickingRoute> {
    return this.rejectDirectWrite();
  }

  async saveException(
    _exception: PickingException,
  ): Promise<PickingException> {
    return this.rejectDirectWrite();
  }

  async saveWave(
    _wave: PickingWave,
  ): Promise<PickingWave> {
    return this.rejectDirectWrite();
  }

  async saveBatch(
    _batch: PickingBatch,
  ): Promise<PickingBatch> {
    return this.rejectDirectWrite();
  }

  async listSuggestions(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingSuggestion[]> {
    const { data, error } = await this.client
      .from(SUGGESTION_TABLE)
      .select(SUGGESTION_SELECT)
      .eq("account_id", tenantId)
      .eq("picking_id", pickingId)
      .order("created_at", { ascending: true });

    if (error) {
      this.throwError(
        "Toplama önerileri listelenemedi",
        error,
      );
    }

    return (
      (data ?? []) as unknown as SuggestionRow[]
    )
      .map(mapSuggestionRow)
      .sort(
        (left, right) =>
          right.score.totalScore -
          left.score.totalScore,
      );
  }

  async listTasks(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingTask[]> {
    const { data, error } = await this.client
      .from(TASK_TABLE)
      .select(TASK_SELECT)
      .eq("account_id", tenantId)
      .eq("picking_id", pickingId)
      .order("sequence", { ascending: true })
      .order("priority", { ascending: true });

    if (error) {
      this.throwError(
        "Toplama görevleri listelenemedi",
        error,
      );
    }

    return (
      (data ?? []) as unknown as TaskRow[]
    ).map(mapTaskRow);
  }

  async listRoutes(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingRoute[]> {
    const { data, error } = await this.client
      .from(ROUTE_TABLE)
      .select(ROUTE_SELECT)
      .eq("account_id", tenantId)
      .eq("picking_id", pickingId)
      .order("created_at", { ascending: true });

    if (error) {
      this.throwError(
        "Toplama rotaları listelenemedi",
        error,
      );
    }

    return (
      (data ?? []) as unknown as RouteRow[]
    ).map(mapRouteRow);
  }

  async listExceptions(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingException[]> {
    const { data, error } = await this.client
      .from(EXCEPTION_TABLE)
      .select(EXCEPTION_SELECT)
      .eq("account_id", tenantId)
      .eq("picking_id", pickingId)
      .order("created_at", { ascending: true });

    if (error) {
      this.throwError(
        "Toplama istisnaları listelenemedi",
        error,
      );
    }

    return (
      (data ?? []) as unknown as ExceptionRow[]
    ).map(mapExceptionRow);
  }

  async listWaves(
    tenantId: string,
    warehouseId?: string,
  ): Promise<PickingWave[]> {
    let query = this.client
      .from(WAVE_TABLE)
      .select(WAVE_SELECT)
      .eq("account_id", tenantId);

    if (warehouseId !== undefined) {
      query = query.eq(
        "warehouse_id",
        warehouseId,
      );
    }

    const { data, error } = await query.order(
      "created_at",
      { ascending: false },
    );

    if (error) {
      this.throwError(
        "Toplama dalgaları listelenemedi",
        error,
      );
    }

    return (
      (data ?? []) as unknown as WaveRow[]
    ).map(mapWaveRow);
  }

  async listBatches(
    tenantId: string,
    warehouseId?: string,
  ): Promise<PickingBatch[]> {
    let query = this.client
      .from(BATCH_TABLE)
      .select(BATCH_SELECT)
      .eq("account_id", tenantId);

    if (warehouseId !== undefined) {
      query = query.eq(
        "warehouse_id",
        warehouseId,
      );
    }

    const { data, error } = await query.order(
      "created_at",
      { ascending: false },
    );

    if (error) {
      this.throwError(
        "Toplama batch kayıtları listelenemedi",
        error,
      );
    }

    return (
      (data ?? []) as unknown as BatchRow[]
    ).map(mapBatchRow);
  }

  private async findOne(
    tenantId: string,
    column: string,
    value: string,
    errorLabel: string,
  ): Promise<Picking | null> {
    const { data, error } = await this.client
      .from(PICKING_TABLE)
      .select(PICKING_SELECT)
      .eq("account_id", tenantId)
      .eq(column, value)
      .maybeSingle();

    if (error) {
      this.throwError(
        errorLabel,
        error,
      );
    }

    if (!data) {
      return null;
    }

    return this.hydrate(
      data as unknown as PickingRow,
    );
  }

  private async hydrate(
    row: PickingRow,
  ): Promise<Picking> {
    const [
      items,
      suggestions,
      exceptions,
      routes,
    ] = await Promise.all([
      this.listItems(row.account_id, row.id),
      this.listSuggestions(row.account_id, row.id),
      this.listExceptions(row.account_id, row.id),
      this.listRoutes(row.account_id, row.id),
    ]);

    return mapPickingRow(
      row,
      items,
      suggestions,
      exceptions,
      routes,
    );
  }

  private async listItems(
    tenantId: string,
    pickingId: string,
  ): Promise<PickingItem[]> {
    const { data, error } = await this.client
      .from(ITEM_TABLE)
      .select(ITEM_SELECT)
      .eq("account_id", tenantId)
      .eq("picking_id", pickingId)
      .order("line_number", { ascending: true });

    if (error) {
      this.throwError(
        "Toplama satırları listelenemedi",
        error,
      );
    }

    return (
      (data ?? []) as unknown as ItemRow[]
    ).map(mapItemRow);
  }

  private async rejectDirectWrite<T>(): Promise<T> {
    throw new Error(
      "Doğrudan Picking yazma kapalıdır. Güvenli Picking write RPC kullanılmalıdır.",
    );
  }

  private throwError(
    label: string,
    error: SupabaseErrorLike,
  ): never {
    throw new Error(
      label + ": " + error.message,
    );
  }
}
