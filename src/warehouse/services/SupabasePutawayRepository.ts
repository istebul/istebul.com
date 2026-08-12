import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Putaway,
  PutawayListFilter,
} from "../types/Putaway";
import type { PutawayException } from "../types/PutawayException";
import type { PutawayItem } from "../types/PutawayItem";
import type { PutawaySuggestion } from "../types/PutawaySuggestion";
import type { PutawayTask } from "../types/PutawayTask";
import type { PutawayRepository } from "./PutawayRepository";

const PUTAWAY_TABLE = "warehouse_putaways";
const ITEM_TABLE = "warehouse_putaway_items";
const SUGGESTION_TABLE = "warehouse_putaway_suggestions";
const TASK_TABLE = "warehouse_putaway_tasks";
const EXCEPTION_TABLE = "warehouse_putaway_exceptions";

const PUTAWAY_SELECT = [
  "id",
  "account_id",
  "putaway_number",
  "warehouse_id",
  "source_location_id",
  "strategy",
  "status",
  "receiving_id",
  "quality_inspection_id",
  "reference_type",
  "reference_id",
  "reference_number",
  "planned_at",
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
  "putaway_id",
  "line_number",
  "warehouse_id",
  "source_location_id",
  "target_location_id",
  "product_id",
  "sku_id",
  "requested_quantity",
  "placed_quantity",
  "remaining_quantity",
  "unit",
  "stock_status",
  "strategy",
  "lot_number",
  "serial_number",
  "production_date",
  "expiry_date",
  "suggestion_id",
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
  "putaway_id",
  "putaway_item_id",
  "warehouse_id",
  "source_location_id",
  "target_location_id",
  "strategy",
  "suggested_quantity",
  "unit",
  "available_capacity",
  "distance",
  "capacity_score",
  "distance_score",
  "compatibility_score",
  "strategy_score",
  "total_score",
  "reasons",
  "warnings",
  "selected",
  "created_at",
].join(",");

const TASK_SELECT = [
  "id",
  "account_id",
  "putaway_id",
  "putaway_item_id",
  "source_location_id",
  "target_location_id",
  "assigned_user_id",
  "assigned_equipment_id",
  "status",
  "priority",
  "planned_at",
  "started_at",
  "completed_at",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const EXCEPTION_SELECT = [
  "id",
  "account_id",
  "putaway_id",
  "putaway_item_id",
  "type",
  "message",
  "source_location_id",
  "target_location_id",
  "resolved",
  "resolved_by",
  "resolved_at",
  "resolution_notes",
  "created_at",
].join(",");

interface PutawayRow {
  id: string;
  account_id: string;
  putaway_number: string;
  warehouse_id: string;
  source_location_id: string;
  strategy: Putaway["strategy"];
  status: Putaway["status"];
  receiving_id: string | null;
  quality_inspection_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  planned_at: string | null;
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
  putaway_id: string;
  line_number: number;
  warehouse_id: string;
  source_location_id: string;
  target_location_id: string | null;
  product_id: string;
  sku_id: string | null;
  requested_quantity: number | string;
  placed_quantity: number | string;
  remaining_quantity: number | string;
  unit: string;
  stock_status: PutawayItem["stockStatus"];
  strategy: PutawayItem["strategy"];
  lot_number: string | null;
  serial_number: string | null;
  production_date: string | null;
  expiry_date: string | null;
  suggestion_id: string | null;
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
  putaway_id: string;
  putaway_item_id: string;
  warehouse_id: string;
  source_location_id: string;
  target_location_id: string;
  strategy: PutawaySuggestion["strategy"];
  suggested_quantity: number | string;
  unit: string;
  available_capacity: number | string | null;
  distance: number | string | null;
  capacity_score: number | string;
  distance_score: number | string;
  compatibility_score: number | string;
  strategy_score: number | string;
  total_score: number | string;
  reasons: string[] | null;
  warnings: string[] | null;
  selected: boolean;
  created_at: string;
}

interface TaskRow {
  id: string;
  account_id: string;
  putaway_id: string;
  putaway_item_id: string | null;
  source_location_id: string;
  target_location_id: string;
  assigned_user_id: string | null;
  assigned_equipment_id: string | null;
  status: PutawayTask["status"];
  priority: number;
  planned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ExceptionRow {
  id: string;
  account_id: string;
  putaway_id: string;
  putaway_item_id: string | null;
  type: PutawayException["type"];
  message: string;
  source_location_id: string | null;
  target_location_id: string | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

interface SupabaseErrorLike {
  message: string;
}

function mapItemRow(row: ItemRow): PutawayItem {
  const tracking = {
    ...(row.lot_number !== null ? { lotNumber: row.lot_number } : {}),
    ...(row.serial_number !== null ? { serialNumber: row.serial_number } : {}),
    ...(row.production_date !== null ? { productionDate: row.production_date } : {}),
    ...(row.expiry_date !== null ? { expiryDate: row.expiry_date } : {}),
  };

  return {
    id: row.id,
    tenantId: row.account_id,
    putawayId: row.putaway_id,
    lineNumber: row.line_number,
    warehouseId: row.warehouse_id,
    sourceLocationId: row.source_location_id,
    productId: row.product_id,
    requestedQuantity: Number(row.requested_quantity),
    placedQuantity: Number(row.placed_quantity),
    remainingQuantity: Number(row.remaining_quantity),
    unit: row.unit,
    stockStatus: row.stock_status,
    strategy: row.strategy,
    inventoryMovementIds: row.inventory_movement_ids ?? [],
    transactionGroupIds: row.transaction_group_ids ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.target_location_id !== null ? { targetLocationId: row.target_location_id } : {}),
    ...(row.sku_id !== null ? { skuId: row.sku_id } : {}),
    ...(Object.keys(tracking).length > 0 ? { tracking } : {}),
    ...(row.suggestion_id !== null ? { suggestionId: row.suggestion_id } : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
  };
}

function mapSuggestionRow(row: SuggestionRow): PutawaySuggestion {
  return {
    id: row.id,
    tenantId: row.account_id,
    putawayId: row.putaway_id,
    putawayItemId: row.putaway_item_id,
    warehouseId: row.warehouse_id,
    sourceLocationId: row.source_location_id,
    targetLocationId: row.target_location_id,
    strategy: row.strategy,
    suggestedQuantity: Number(row.suggested_quantity),
    unit: row.unit,
    score: {
      capacityScore: Number(row.capacity_score),
      distanceScore: Number(row.distance_score),
      compatibilityScore: Number(row.compatibility_score),
      strategyScore: Number(row.strategy_score),
      totalScore: Number(row.total_score),
    },
    reasons: row.reasons ?? [],
    warnings: row.warnings ?? [],
    selected: row.selected,
    createdAt: row.created_at,
    ...(row.available_capacity !== null ? { availableCapacity: Number(row.available_capacity) } : {}),
    ...(row.distance !== null ? { distance: Number(row.distance) } : {}),
  };
}

function mapTaskRow(row: TaskRow): PutawayTask {
  return {
    id: row.id,
    tenantId: row.account_id,
    putawayId: row.putaway_id,
    sourceLocationId: row.source_location_id,
    targetLocationId: row.target_location_id,
    status: row.status,
    priority: row.priority,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.putaway_item_id !== null ? { putawayItemId: row.putaway_item_id } : {}),
    ...(row.assigned_user_id !== null ? { assignedUserId: row.assigned_user_id } : {}),
    ...(row.assigned_equipment_id !== null ? { assignedEquipmentId: row.assigned_equipment_id } : {}),
    ...(row.planned_at !== null ? { plannedAt: row.planned_at } : {}),
    ...(row.started_at !== null ? { startedAt: row.started_at } : {}),
    ...(row.completed_at !== null ? { completedAt: row.completed_at } : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
  };
}

function mapExceptionRow(row: ExceptionRow): PutawayException {
  return {
    id: row.id,
    tenantId: row.account_id,
    putawayId: row.putaway_id,
    type: row.type,
    message: row.message,
    resolved: row.resolved,
    createdAt: row.created_at,
    ...(row.putaway_item_id !== null ? { putawayItemId: row.putaway_item_id } : {}),
    ...(row.source_location_id !== null ? { sourceLocationId: row.source_location_id } : {}),
    ...(row.target_location_id !== null ? { targetLocationId: row.target_location_id } : {}),
    ...(row.resolved_by !== null ? { resolvedBy: row.resolved_by } : {}),
    ...(row.resolved_at !== null ? { resolvedAt: row.resolved_at } : {}),
    ...(row.resolution_notes !== null ? { resolutionNotes: row.resolution_notes } : {}),
  };
}

function mapPutawayRow(
  row: PutawayRow,
  items: readonly PutawayItem[],
  suggestions: readonly PutawaySuggestion[],
  exceptions: readonly PutawayException[],
): Putaway {
  return {
    id: row.id,
    tenantId: row.account_id,
    putawayNumber: row.putaway_number,
    warehouseId: row.warehouse_id,
    sourceLocationId: row.source_location_id,
    strategy: row.strategy,
    status: row.status,
    items,
    suggestions,
    exceptions,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.receiving_id !== null ? { receivingId: row.receiving_id } : {}),
    ...(row.quality_inspection_id !== null ? { qualityInspectionId: row.quality_inspection_id } : {}),
    ...(row.reference_type !== null ? { referenceType: row.reference_type } : {}),
    ...(row.reference_id !== null ? { referenceId: row.reference_id } : {}),
    ...(row.reference_number !== null ? { referenceNumber: row.reference_number } : {}),
    ...(row.planned_at !== null ? { plannedAt: row.planned_at } : {}),
    ...(row.started_at !== null ? { startedAt: row.started_at } : {}),
    ...(row.completed_at !== null ? { completedAt: row.completed_at } : {}),
    ...(row.cancelled_at !== null ? { cancelledAt: row.cancelled_at } : {}),
    ...(row.cancellation_reason !== null ? { cancellationReason: row.cancellation_reason } : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
  };
}

export class SupabasePutawayRepository implements PutawayRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(tenantId: string, putawayId: string): Promise<Putaway | null> {
    return this.findOne(tenantId, "id", putawayId, "Yerleştirme kaydı okunamadı");
  }

  async findByNumber(tenantId: string, putawayNumber: string): Promise<Putaway | null> {
    return this.findOne(tenantId, "putaway_number", putawayNumber, "Yerleştirme numarası okunamadı");
  }

  async findByReceivingId(tenantId: string, receivingId: string): Promise<Putaway | null> {
    return this.findOne(tenantId, "receiving_id", receivingId, "Mal kabule bağlı yerleştirme okunamadı");
  }

  async findByQualityInspectionId(tenantId: string, qualityInspectionId: string): Promise<Putaway | null> {
    return this.findOne(tenantId, "quality_inspection_id", qualityInspectionId, "Kalite kontrole bağlı yerleştirme okunamadı");
  }

  async list(filter: PutawayListFilter): Promise<Putaway[]> {
    let query = this.client
      .from(PUTAWAY_TABLE)
      .select(PUTAWAY_SELECT)
      .eq("account_id", filter.tenantId);

    if (filter.warehouseId !== undefined) query = query.eq("warehouse_id", filter.warehouseId);
    if (filter.sourceLocationId !== undefined) query = query.eq("source_location_id", filter.sourceLocationId);
    if (filter.strategy !== undefined) query = query.eq("strategy", filter.strategy);
    if (filter.status !== undefined) query = query.eq("status", filter.status);
    if (filter.receivingId !== undefined) query = query.eq("receiving_id", filter.receivingId);
    if (filter.qualityInspectionId !== undefined) query = query.eq("quality_inspection_id", filter.qualityInspectionId);
    if (filter.referenceType !== undefined) query = query.eq("reference_type", filter.referenceType);
    if (filter.referenceId !== undefined) query = query.eq("reference_id", filter.referenceId);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) this.throwError("Yerleştirme kayıtları listelenemedi", error);

    let rows = (data ?? []) as unknown as PutawayRow[];
    const search = filter.search?.trim().toLocaleLowerCase("tr-TR");

    if (search) {
      rows = rows.filter((row) =>
        row.putaway_number.toLocaleLowerCase("tr-TR").includes(search) ||
        row.reference_number?.toLocaleLowerCase("tr-TR").includes(search) === true
      );
    }

    return Promise.all(rows.map((row) => this.hydrate(row)));
  }

  async save(_putaway: Putaway): Promise<Putaway> {
    return this.rejectDirectWrite();
  }

  async saveItem(_item: PutawayItem): Promise<PutawayItem> {
    return this.rejectDirectWrite();
  }

  async saveSuggestion(_suggestion: PutawaySuggestion): Promise<PutawaySuggestion> {
    return this.rejectDirectWrite();
  }

  async saveTask(_task: PutawayTask): Promise<PutawayTask> {
    return this.rejectDirectWrite();
  }

  async saveException(_exception: PutawayException): Promise<PutawayException> {
    return this.rejectDirectWrite();
  }

  async listSuggestions(tenantId: string, putawayId: string): Promise<PutawaySuggestion[]> {
    const { data, error } = await this.client
      .from(SUGGESTION_TABLE)
      .select(SUGGESTION_SELECT)
      .eq("account_id", tenantId)
      .eq("putaway_id", putawayId)
      .order("total_score", { ascending: false });

    if (error) this.throwError("Yerleştirme önerileri listelenemedi", error);

    return ((data ?? []) as unknown as SuggestionRow[]).map(mapSuggestionRow);
  }

  async listTasks(tenantId: string, putawayId: string): Promise<PutawayTask[]> {
    const { data, error } = await this.client
      .from(TASK_TABLE)
      .select(TASK_SELECT)
      .eq("account_id", tenantId)
      .eq("putaway_id", putawayId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) this.throwError("Yerleştirme görevleri listelenemedi", error);

    return ((data ?? []) as unknown as TaskRow[]).map(mapTaskRow);
  }

  async listExceptions(tenantId: string, putawayId: string): Promise<PutawayException[]> {
    const { data, error } = await this.client
      .from(EXCEPTION_TABLE)
      .select(EXCEPTION_SELECT)
      .eq("account_id", tenantId)
      .eq("putaway_id", putawayId)
      .order("created_at", { ascending: true });

    if (error) this.throwError("Yerleştirme istisnaları listelenemedi", error);

    return ((data ?? []) as unknown as ExceptionRow[]).map(mapExceptionRow);
  }

  private async findOne(
    tenantId: string,
    column: string,
    value: string,
    errorLabel: string,
  ): Promise<Putaway | null> {
    const { data, error } = await this.client
      .from(PUTAWAY_TABLE)
      .select(PUTAWAY_SELECT)
      .eq("account_id", tenantId)
      .eq(column, value)
      .maybeSingle();

    if (error) this.throwError(errorLabel, error);
    if (!data) return null;

    return this.hydrate(data as unknown as PutawayRow);
  }

  private async hydrate(row: PutawayRow): Promise<Putaway> {
    const [items, suggestions, exceptions] = await Promise.all([
      this.listItems(row.account_id, row.id),
      this.listSuggestions(row.account_id, row.id),
      this.listExceptions(row.account_id, row.id),
    ]);

    return mapPutawayRow(row, items, suggestions, exceptions);
  }

  private async listItems(tenantId: string, putawayId: string): Promise<PutawayItem[]> {
    const { data, error } = await this.client
      .from(ITEM_TABLE)
      .select(ITEM_SELECT)
      .eq("account_id", tenantId)
      .eq("putaway_id", putawayId)
      .order("line_number", { ascending: true });

    if (error) this.throwError("Yerleştirme satırları listelenemedi", error);

    return ((data ?? []) as unknown as ItemRow[]).map(mapItemRow);
  }

  private async rejectDirectWrite<T>(): Promise<T> {
    throw new Error(
      "Doğrudan Putaway yazma kapalıdır. Güvenli Putaway write RPC kullanılmalıdır.",
    );
  }

  private throwError(label: string, error: SupabaseErrorLike): never {
    throw new Error(label + ": " + error.message);
  }
}
