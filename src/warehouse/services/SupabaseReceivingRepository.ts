import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Receiving,
  ReceivingListFilter,
} from "../types/Receiving";
import type { ReceivingDocument } from "../types/ReceivingDocument";
import type { ReceivingItem } from "../types/ReceivingItem";
import type { ReceivingTask } from "../types/ReceivingTask";
import type { ReceivingRepository } from "./ReceivingRepository";

const RECEIVING_TABLE = "warehouse_receivings";
const ITEM_TABLE = "warehouse_receiving_items";
const DOCUMENT_TABLE = "warehouse_receiving_documents";
const TASK_TABLE = "warehouse_receiving_tasks";

const RECEIVING_SELECT = [
  "id",
  "account_id",
  "receiving_number",
  "warehouse_id",
  "receiving_location_id",
  "source",
  "status",
  "supplier_id",
  "supplier_name",
  "reference_type",
  "reference_id",
  "reference_number",
  "vehicle_plate",
  "delivery_note_number",
  "planned_at",
  "started_at",
  "completed_at",
  "cancelled_at",
  "notes",
  "cancellation_reason",
  "exceptions",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const ITEM_SELECT = [
  "id",
  "account_id",
  "receiving_id",
  "line_number",
  "warehouse_id",
  "receiving_location_id",
  "product_id",
  "sku_id",
  "expected_quantity",
  "received_quantity",
  "accepted_quantity",
  "rejected_quantity",
  "damaged_quantity",
  "unit",
  "stock_status",
  "lot_number",
  "serial_number",
  "production_date",
  "expiry_date",
  "quality_control_required",
  "unexpected_product",
  "over_delivery_allowed",
  "rejection_reason",
  "notes",
  "inventory_movement_id",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const DOCUMENT_SELECT = [
  "id",
  "account_id",
  "receiving_id",
  "type",
  "document_number",
  "document_date",
  "external_system",
  "external_id",
  "file_name",
  "file_url",
  "notes",
  "created_by",
  "created_at",
].join(",");

const TASK_SELECT = [
  "id",
  "account_id",
  "receiving_id",
  "receiving_item_id",
  "type",
  "status",
  "assigned_user_id",
  "assigned_equipment_id",
  "priority",
  "planned_at",
  "started_at",
  "completed_at",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

interface ReceivingRow {
  id: string;
  account_id: string;
  receiving_number: string;
  warehouse_id: string;
  receiving_location_id: string;
  source: Receiving["source"];
  status: Receiving["status"];
  supplier_id: string | null;
  supplier_name: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  vehicle_plate: string | null;
  delivery_note_number: string | null;
  planned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  exceptions: Receiving["exceptions"] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: string;
  account_id: string;
  receiving_id: string;
  line_number: number;
  warehouse_id: string;
  receiving_location_id: string;
  product_id: string;
  sku_id: string | null;
  expected_quantity: number | string;
  received_quantity: number | string;
  accepted_quantity: number | string;
  rejected_quantity: number | string;
  damaged_quantity: number | string;
  unit: string;
  stock_status: ReceivingItem["stockStatus"];
  lot_number: string | null;
  serial_number: string | null;
  production_date: string | null;
  expiry_date: string | null;
  quality_control_required: boolean;
  unexpected_product: boolean;
  over_delivery_allowed: boolean;
  rejection_reason: string | null;
  notes: string | null;
  inventory_movement_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface DocumentRow {
  id: string;
  account_id: string;
  receiving_id: string;
  type: ReceivingDocument["type"];
  document_number: string;
  document_date: string | null;
  external_system: string | null;
  external_id: string | null;
  file_name: string | null;
  file_url: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

interface TaskRow {
  id: string;
  account_id: string;
  receiving_id: string;
  receiving_item_id: string | null;
  type: ReceivingTask["type"];
  status: ReceivingTask["status"];
  assigned_user_id: string | null;
  assigned_equipment_id: string | null;
  priority: number;
  planned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseErrorLike {
  message: string;
}

function mapItemRow(row: ItemRow): ReceivingItem {
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

  return {
    id: row.id,
    tenantId: row.account_id,
    receivingId: row.receiving_id,
    lineNumber: row.line_number,
    warehouseId: row.warehouse_id,
    receivingLocationId: row.receiving_location_id,
    productId: row.product_id,
    expectedQuantity: Number(row.expected_quantity),
    receivedQuantity: Number(row.received_quantity),
    acceptedQuantity: Number(row.accepted_quantity),
    rejectedQuantity: Number(row.rejected_quantity),
    damagedQuantity: Number(row.damaged_quantity),
    unit: row.unit,
    stockStatus: row.stock_status,
    qualityControlRequired: row.quality_control_required,
    unexpectedProduct: row.unexpected_product,
    overDeliveryAllowed: row.over_delivery_allowed,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.sku_id !== null ? { skuId: row.sku_id } : {}),
    ...(Object.keys(tracking).length > 0 ? { tracking } : {}),
    ...(row.rejection_reason !== null
      ? { rejectionReason: row.rejection_reason }
      : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
    ...(row.inventory_movement_id !== null
      ? { inventoryMovementId: row.inventory_movement_id }
      : {}),
  };
}

function toItemRow(item: ReceivingItem) {
  return {
    id: item.id,
    account_id: item.tenantId,
    receiving_id: item.receivingId,
    line_number: item.lineNumber,
    warehouse_id: item.warehouseId,
    receiving_location_id: item.receivingLocationId,
    product_id: item.productId,
    sku_id: item.skuId ?? null,
    expected_quantity: item.expectedQuantity,
    received_quantity: item.receivedQuantity,
    accepted_quantity: item.acceptedQuantity,
    rejected_quantity: item.rejectedQuantity,
    damaged_quantity: item.damagedQuantity,
    unit: item.unit,
    stock_status: item.stockStatus,
    lot_number: item.tracking?.lotNumber ?? null,
    serial_number: item.tracking?.serialNumber ?? null,
    production_date: item.tracking?.productionDate ?? null,
    expiry_date: item.tracking?.expiryDate ?? null,
    quality_control_required: item.qualityControlRequired,
    unexpected_product: item.unexpectedProduct,
    over_delivery_allowed: item.overDeliveryAllowed,
    rejection_reason: item.rejectionReason ?? null,
    notes: item.notes ?? null,
    inventory_movement_id: item.inventoryMovementId ?? null,
    created_by: item.createdBy,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function mapReceivingRow(
  row: ReceivingRow,
  items: readonly ReceivingItem[],
): Receiving {
  return {
    id: row.id,
    tenantId: row.account_id,
    receivingNumber: row.receiving_number,
    warehouseId: row.warehouse_id,
    receivingLocationId: row.receiving_location_id,
    source: row.source,
    status: row.status,
    items,
    exceptions: row.exceptions ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.supplier_id !== null
      ? { supplierId: row.supplier_id }
      : {}),
    ...(row.supplier_name !== null
      ? { supplierName: row.supplier_name }
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
    ...(row.vehicle_plate !== null
      ? { vehiclePlate: row.vehicle_plate }
      : {}),
    ...(row.delivery_note_number !== null
      ? { deliveryNoteNumber: row.delivery_note_number }
      : {}),
    ...(row.planned_at !== null ? { plannedAt: row.planned_at } : {}),
    ...(row.started_at !== null ? { startedAt: row.started_at } : {}),
    ...(row.completed_at !== null
      ? { completedAt: row.completed_at }
      : {}),
    ...(row.cancelled_at !== null
      ? { cancelledAt: row.cancelled_at }
      : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
    ...(row.cancellation_reason !== null
      ? { cancellationReason: row.cancellation_reason }
      : {}),
  };
}

function toReceivingRow(receiving: Receiving) {
  return {
    id: receiving.id,
    account_id: receiving.tenantId,
    receiving_number: receiving.receivingNumber,
    warehouse_id: receiving.warehouseId,
    receiving_location_id: receiving.receivingLocationId,
    source: receiving.source,
    status: receiving.status,
    supplier_id: receiving.supplierId ?? null,
    supplier_name: receiving.supplierName ?? null,
    reference_type: receiving.referenceType ?? null,
    reference_id: receiving.referenceId ?? null,
    reference_number: receiving.referenceNumber ?? null,
    vehicle_plate: receiving.vehiclePlate ?? null,
    delivery_note_number: receiving.deliveryNoteNumber ?? null,
    planned_at: receiving.plannedAt ?? null,
    started_at: receiving.startedAt ?? null,
    completed_at: receiving.completedAt ?? null,
    cancelled_at: receiving.cancelledAt ?? null,
    notes: receiving.notes ?? null,
    cancellation_reason: receiving.cancellationReason ?? null,
    exceptions: receiving.exceptions,
    created_by: receiving.createdBy,
    created_at: receiving.createdAt,
    updated_at: receiving.updatedAt,
  };
}

function mapDocumentRow(row: DocumentRow): ReceivingDocument {
  return {
    id: row.id,
    tenantId: row.account_id,
    receivingId: row.receiving_id,
    type: row.type,
    documentNumber: row.document_number,
    createdBy: row.created_by,
    createdAt: row.created_at,
    ...(row.document_date !== null
      ? { documentDate: row.document_date }
      : {}),
    ...(row.external_system !== null
      ? { externalSystem: row.external_system }
      : {}),
    ...(row.external_id !== null
      ? { externalId: row.external_id }
      : {}),
    ...(row.file_name !== null ? { fileName: row.file_name } : {}),
    ...(row.file_url !== null ? { fileUrl: row.file_url } : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
  };
}

function toDocumentRow(document: ReceivingDocument) {
  return {
    id: document.id,
    account_id: document.tenantId,
    receiving_id: document.receivingId,
    type: document.type,
    document_number: document.documentNumber,
    document_date: document.documentDate ?? null,
    external_system: document.externalSystem ?? null,
    external_id: document.externalId ?? null,
    file_name: document.fileName ?? null,
    file_url: document.fileUrl ?? null,
    notes: document.notes ?? null,
    created_by: document.createdBy,
    created_at: document.createdAt,
  };
}

function mapTaskRow(row: TaskRow): ReceivingTask {
  return {
    id: row.id,
    tenantId: row.account_id,
    receivingId: row.receiving_id,
    type: row.type,
    status: row.status,
    priority: row.priority,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.receiving_item_id !== null
      ? { receivingItemId: row.receiving_item_id }
      : {}),
    ...(row.assigned_user_id !== null
      ? { assignedUserId: row.assigned_user_id }
      : {}),
    ...(row.assigned_equipment_id !== null
      ? { assignedEquipmentId: row.assigned_equipment_id }
      : {}),
    ...(row.planned_at !== null ? { plannedAt: row.planned_at } : {}),
    ...(row.started_at !== null ? { startedAt: row.started_at } : {}),
    ...(row.completed_at !== null
      ? { completedAt: row.completed_at }
      : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
  };
}

function toTaskRow(task: ReceivingTask) {
  return {
    id: task.id,
    account_id: task.tenantId,
    receiving_id: task.receivingId,
    receiving_item_id: task.receivingItemId ?? null,
    type: task.type,
    status: task.status,
    assigned_user_id: task.assignedUserId ?? null,
    assigned_equipment_id: task.assignedEquipmentId ?? null,
    priority: task.priority,
    planned_at: task.plannedAt ?? null,
    started_at: task.startedAt ?? null,
    completed_at: task.completedAt ?? null,
    notes: task.notes ?? null,
    created_by: task.createdBy,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

export class SupabaseReceivingRepository
  implements ReceivingRepository
{
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(
    tenantId: string,
    receivingId: string,
  ): Promise<Receiving | null> {
    const { data, error } = await this.client
      .from(RECEIVING_TABLE)
      .select(RECEIVING_SELECT)
      .eq("account_id", tenantId)
      .eq("id", receivingId)
      .maybeSingle();

    if (error) {
      this.throwError("Mal kabul kaydı okunamadı", error);
    }

    if (!data) {
      return null;
    }

    return this.hydrate(data as unknown as ReceivingRow);
  }

  async findByNumber(
    tenantId: string,
    receivingNumber: string,
  ): Promise<Receiving | null> {
    const { data, error } = await this.client
      .from(RECEIVING_TABLE)
      .select(RECEIVING_SELECT)
      .eq("account_id", tenantId)
      .eq("receiving_number", receivingNumber)
      .maybeSingle();

    if (error) {
      this.throwError("Mal kabul numarası okunamadı", error);
    }

    if (!data) {
      return null;
    }

    return this.hydrate(data as unknown as ReceivingRow);
  }

  async findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<Receiving | null> {
    const { data, error } = await this.client
      .from(RECEIVING_TABLE)
      .select(RECEIVING_SELECT)
      .eq("account_id", tenantId)
      .eq("reference_type", referenceType)
      .eq("reference_id", referenceId)
      .maybeSingle();

    if (error) {
      this.throwError("Mal kabul referansı okunamadı", error);
    }

    if (!data) {
      return null;
    }

    return this.hydrate(data as unknown as ReceivingRow);
  }

  async list(filter: ReceivingListFilter): Promise<Receiving[]> {
    let query = this.client
      .from(RECEIVING_TABLE)
      .select(RECEIVING_SELECT)
      .eq("account_id", filter.tenantId);

    if (filter.warehouseId !== undefined) {
      query = query.eq("warehouse_id", filter.warehouseId);
    }

    if (filter.receivingLocationId !== undefined) {
      query = query.eq(
        "receiving_location_id",
        filter.receivingLocationId,
      );
    }

    if (filter.source !== undefined) {
      query = query.eq("source", filter.source);
    }

    if (filter.status !== undefined) {
      query = query.eq("status", filter.status);
    }

    if (filter.supplierId !== undefined) {
      query = query.eq("supplier_id", filter.supplierId);
    }

    if (filter.referenceType !== undefined) {
      query = query.eq("reference_type", filter.referenceType);
    }

    if (filter.referenceId !== undefined) {
      query = query.eq("reference_id", filter.referenceId);
    }

    if (filter.search?.trim()) {
      const search = filter.search.trim().replace(/[%(),]/g, "");
      query = query.or(
        [
          `receiving_number.ilike.%${search}%`,
          `reference_number.ilike.%${search}%`,
          `supplier_name.ilike.%${search}%`,
        ].join(","),
      );
    }

    const { data, error } = await query.order(
      "created_at",
      { ascending: false },
    );

    if (error) {
      this.throwError("Mal kabul kayıtları listelenemedi", error);
    }

    return Promise.all(
      (data ?? []).map((row) =>
        this.hydrate(row as unknown as ReceivingRow),
      ),
    );
  }

  async save(receiving: Receiving): Promise<Receiving> {
    const { data, error } = await this.client
      .from(RECEIVING_TABLE)
      .upsert(toReceivingRow(receiving), { onConflict: "id" })
      .select(RECEIVING_SELECT)
      .single();

    if (error || !data) {
      this.throwError("Mal kabul kaydı saklanamadı", error);
    }

    return this.hydrate(data as unknown as ReceivingRow);
  }

  async saveItem(item: ReceivingItem): Promise<ReceivingItem> {
    const { data, error } = await this.client
      .from(ITEM_TABLE)
      .upsert(toItemRow(item), { onConflict: "id" })
      .select(ITEM_SELECT)
      .single();

    if (error || !data) {
      this.throwError("Mal kabul satırı saklanamadı", error);
    }

    return mapItemRow(data as unknown as ItemRow);
  }

  async saveDocument(
    document: ReceivingDocument,
  ): Promise<ReceivingDocument> {
    const { data, error } = await this.client
      .from(DOCUMENT_TABLE)
      .insert(toDocumentRow(document))
      .select(DOCUMENT_SELECT)
      .single();

    if (error || !data) {
      this.throwError("Mal kabul belgesi saklanamadı", error);
    }

    return mapDocumentRow(data as unknown as DocumentRow);
  }

  async saveTask(task: ReceivingTask): Promise<ReceivingTask> {
    const { data, error } = await this.client
      .from(TASK_TABLE)
      .upsert(toTaskRow(task), { onConflict: "id" })
      .select(TASK_SELECT)
      .single();

    if (error || !data) {
      this.throwError("Mal kabul görevi saklanamadı", error);
    }

    return mapTaskRow(data as unknown as TaskRow);
  }

  async listDocuments(
    tenantId: string,
    receivingId: string,
  ): Promise<ReceivingDocument[]> {
    const { data, error } = await this.client
      .from(DOCUMENT_TABLE)
      .select(DOCUMENT_SELECT)
      .eq("account_id", tenantId)
      .eq("receiving_id", receivingId)
      .order("created_at", { ascending: true });

    if (error) {
      this.throwError("Mal kabul belgeleri listelenemedi", error);
    }

    return (data ?? []).map((row) =>
      mapDocumentRow(row as unknown as DocumentRow),
    );
  }

  async listTasks(
    tenantId: string,
    receivingId: string,
  ): Promise<ReceivingTask[]> {
    const { data, error } = await this.client
      .from(TASK_TABLE)
      .select(TASK_SELECT)
      .eq("account_id", tenantId)
      .eq("receiving_id", receivingId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      this.throwError("Mal kabul görevleri listelenemedi", error);
    }

    return (data ?? []).map((row) =>
      mapTaskRow(row as unknown as TaskRow),
    );
  }

  private async loadItems(
    tenantId: string,
    receivingId: string,
  ): Promise<ReceivingItem[]> {
    const { data, error } = await this.client
      .from(ITEM_TABLE)
      .select(ITEM_SELECT)
      .eq("account_id", tenantId)
      .eq("receiving_id", receivingId)
      .order("line_number", { ascending: true });

    if (error) {
      this.throwError("Mal kabul satırları listelenemedi", error);
    }

    return (data ?? []).map((row) =>
      mapItemRow(row as unknown as ItemRow),
    );
  }

  private async hydrate(row: ReceivingRow): Promise<Receiving> {
    const items = await this.loadItems(
      row.account_id,
      row.id,
    );

    return mapReceivingRow(row, items);
  }

  private throwError(
    message: string,
    error: SupabaseErrorLike | null,
  ): never {
    throw new Error(
      `${message}: ${
        error?.message ?? "Bilinmeyen veritabanı hatası."
      }`,
    );
  }
}
