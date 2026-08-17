import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  Packing,
  PackingListFilter,
} from "../types/Packing";
import type {
  PackingContainer,
} from "../types/PackingContainer";
import type {
  PackingException,
} from "../types/PackingException";
import type {
  PackingItem,
} from "../types/PackingItem";
import type {
  PackingLabel,
} from "../types/PackingLabel";
import type {
  PackingPackage,
  PackingPackageItem,
} from "../types/PackingPackage";
import type {
  PackingSuggestion,
} from "../types/PackingSuggestion";
import type {
  PackingTask,
} from "../types/PackingTask";
import type {
  PackingRepository,
} from "./PackingRepository";

const PACKING_TABLE =
  "warehouse_packings";

const ITEM_TABLE =
  "warehouse_packing_items";

const CONTAINER_TABLE =
  "warehouse_packing_containers";

const PACKAGE_TABLE =
  "warehouse_packing_packages";

const PACKAGE_ITEM_TABLE =
  "warehouse_packing_package_items";

const LABEL_TABLE =
  "warehouse_packing_labels";

const SUGGESTION_TABLE =
  "warehouse_packing_suggestions";

const TASK_TABLE =
  "warehouse_packing_tasks";

const EXCEPTION_TABLE =
  "warehouse_packing_exceptions";

const PACKING_SELECT = [
  "id",
  "account_id",
  "packing_number",
  "warehouse_id",
  "packing_location_id",
  "shipping_location_id",
  "strategy",
  "status",
  "picking_id",
  "order_id",
  "order_number",
  "reference_type",
  "reference_id",
  "reference_number",
  "priority",
  "planned_at",
  "released_at",
  "started_at",
  "packed_at",
  "shipping_ready_at",
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
  "packing_id",
  "line_number",
  "picking_id",
  "picking_item_id",
  "warehouse_id",
  "packing_location_id",
  "product_id",
  "sku_id",
  "requested_quantity",
  "packed_quantity",
  "damaged_quantity",
  "missing_quantity",
  "remaining_quantity",
  "unit",
  "tracking",
  "barcode",
  "unit_weight",
  "unit_volume",
  "weight_unit",
  "volume_unit",
  "temperature_controlled",
  "hazardous_material",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const CONTAINER_SELECT = [
  "id",
  "account_id",
  "code",
  "name",
  "type",
  "description",
  "dimensions",
  "empty_weight",
  "maximum_weight",
  "maximum_volume",
  "weight_unit",
  "volume_unit",
  "temperature_controlled",
  "hazardous_material_allowed",
  "reusable",
  "active",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const PACKAGE_SELECT = [
  "id",
  "account_id",
  "packing_id",
  "package_number",
  "container_id",
  "parent_package_id",
  "status",
  "sscc",
  "license_plate_number",
  "seal_number",
  "actual_weight",
  "calculated_weight",
  "actual_volume",
  "calculated_volume",
  "weight_unit",
  "volume_unit",
  "sealed_by",
  "sealed_at",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const PACKAGE_ITEM_SELECT = [
  "id",
  "account_id",
  "packing_id",
  "package_id",
  "packing_item_id",
  "product_id",
  "sku_id",
  "quantity",
  "unit",
  "tracking",
  "weight",
  "volume",
  "created_at",
].join(",");

const LABEL_SELECT = [
  "id",
  "account_id",
  "packing_id",
  "package_id",
  "type",
  "status",
  "label_number",
  "barcode_value",
  "sscc",
  "format",
  "content",
  "printer_id",
  "generated_at",
  "printed_at",
  "failure_reason",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const SUGGESTION_SELECT = [
  "id",
  "account_id",
  "packing_id",
  "packing_item_ids",
  "container_id",
  "strategy",
  "container_snapshot",
  "suggested_package_count",
  "estimated_weight",
  "estimated_volume",
  "score",
  "reasons",
  "warnings",
  "selected",
  "created_at",
].join(",");

const TASK_SELECT = [
  "id",
  "account_id",
  "packing_id",
  "packing_item_id",
  "package_id",
  "warehouse_id",
  "packing_location_id",
  "assigned_user_id",
  "assigned_equipment_id",
  "station_id",
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

const EXCEPTION_SELECT = [
  "id",
  "account_id",
  "packing_id",
  "packing_item_id",
  "package_id",
  "container_id",
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

interface PackingRow {
  id: string;
  account_id: string;
  packing_number: string;
  warehouse_id: string;
  packing_location_id: string;
  shipping_location_id: string | null;
  strategy: Packing["strategy"];
  status: Packing["status"];
  picking_id: string | null;
  order_id: string | null;
  order_number: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  priority: number;
  planned_at: string | null;
  released_at: string | null;
  started_at: string | null;
  packed_at: string | null;
  shipping_ready_at: string | null;
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
  packing_id: string;
  line_number: number;
  picking_id: string | null;
  picking_item_id: string | null;
  warehouse_id: string;
  packing_location_id: string;
  product_id: string;
  sku_id: string | null;
  requested_quantity: number | string;
  packed_quantity: number | string;
  damaged_quantity: number | string;
  missing_quantity: number | string;
  remaining_quantity: number | string;
  unit: string;
  tracking:
    NonNullable<PackingItem["tracking"]> | null;
  barcode: string | null;
  unit_weight: number | string | null;
  unit_volume: number | string | null;
  weight_unit: PackingItem["weightUnit"] | null;
  volume_unit: PackingItem["volumeUnit"] | null;
  temperature_controlled: boolean;
  hazardous_material: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ContainerRow {
  id: string;
  account_id: string;
  code: string;
  name: string;
  type: PackingContainer["type"];
  description: string | null;
  dimensions:
    PackingContainer["dimensions"] | null;
  empty_weight: number | string | null;
  maximum_weight: number | string | null;
  maximum_volume: number | string | null;
  weight_unit:
    PackingContainer["weightUnit"] | null;
  volume_unit:
    PackingContainer["volumeUnit"] | null;
  temperature_controlled: boolean;
  hazardous_material_allowed: boolean;
  reusable: boolean;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface PackageRow {
  id: string;
  account_id: string;
  packing_id: string;
  package_number: string;
  container_id: string;
  parent_package_id: string | null;
  status: PackingPackage["status"];
  sscc: string | null;
  license_plate_number: string | null;
  seal_number: string | null;
  actual_weight: number | string | null;
  calculated_weight: number | string | null;
  actual_volume: number | string | null;
  calculated_volume: number | string | null;
  weight_unit: PackingPackage["weightUnit"];
  volume_unit: PackingPackage["volumeUnit"];
  sealed_by: string | null;
  sealed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface PackageItemRow {
  id: string;
  account_id: string;
  packing_id: string;
  package_id: string;
  packing_item_id: string;
  product_id: string;
  sku_id: string | null;
  quantity: number | string;
  unit: string;
  tracking:
    NonNullable<PackingPackageItem["tracking"]> | null;
  weight: number | string | null;
  volume: number | string | null;
  created_at: string;
}

interface LabelRow {
  id: string;
  account_id: string;
  packing_id: string;
  package_id: string | null;
  type: PackingLabel["type"];
  status: PackingLabel["status"];
  label_number: string;
  barcode_value: string | null;
  sscc: string | null;
  format: PackingLabel["format"];
  content: string | null;
  printer_id: string | null;
  generated_at: string | null;
  printed_at: string | null;
  failure_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface SuggestionRow {
  id: string;
  account_id: string;
  packing_id: string;
  packing_item_ids: string[] | null;
  container_id: string;
  strategy: PackingSuggestion["strategy"];
  container_snapshot: PackingContainer;
  suggested_package_count: number;
  estimated_weight: number | string;
  estimated_volume: number | string;
  score: PackingSuggestion["score"];
  reasons: string[] | null;
  warnings: string[] | null;
  selected: boolean;
  created_at: string;
}

interface TaskRow {
  id: string;
  account_id: string;
  packing_id: string;
  packing_item_id: string | null;
  package_id: string | null;
  warehouse_id: string;
  packing_location_id: string;
  assigned_user_id: string | null;
  assigned_equipment_id: string | null;
  station_id: string | null;
  status: PackingTask["status"];
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

interface ExceptionRow {
  id: string;
  account_id: string;
  packing_id: string;
  packing_item_id: string | null;
  package_id: string | null;
  container_id: string | null;
  task_id: string | null;
  type: PackingException["type"];
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

interface SupabaseErrorLike {
  message: string;
}

function mapItemRow(
  row: ItemRow,
): PackingItem {
  return {
    id: row.id,
    tenantId: row.account_id,
    packingId: row.packing_id,
    lineNumber: row.line_number,
    warehouseId: row.warehouse_id,
    packingLocationId:
      row.packing_location_id,
    productId: row.product_id,
    requestedQuantity:
      Number(row.requested_quantity),
    packedQuantity:
      Number(row.packed_quantity),
    damagedQuantity:
      Number(row.damaged_quantity),
    missingQuantity:
      Number(row.missing_quantity),
    remainingQuantity:
      Number(row.remaining_quantity),
    unit: row.unit,
    temperatureControlled:
      row.temperature_controlled,
    hazardousMaterial:
      row.hazardous_material,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.picking_id !== null
      ? { pickingId: row.picking_id }
      : {}),
    ...(row.picking_item_id !== null
      ? { pickingItemId: row.picking_item_id }
      : {}),
    ...(row.sku_id !== null
      ? { skuId: row.sku_id }
      : {}),
    ...(row.tracking !== null
      ? { tracking: row.tracking }
      : {}),
    ...(row.barcode !== null
      ? { barcode: row.barcode }
      : {}),
    ...(row.unit_weight !== null
      ? { unitWeight: Number(row.unit_weight) }
      : {}),
    ...(row.unit_volume !== null
      ? { unitVolume: Number(row.unit_volume) }
      : {}),
    ...(row.weight_unit !== null
      ? { weightUnit: row.weight_unit }
      : {}),
    ...(row.volume_unit !== null
      ? { volumeUnit: row.volume_unit }
      : {}),
    ...(row.notes !== null
      ? { notes: row.notes }
      : {}),
  };
}

function mapContainerRow(
  row: ContainerRow,
): PackingContainer {
  return {
    id: row.id,
    tenantId: row.account_id,
    code: row.code,
    name: row.name,
    type: row.type,
    temperatureControlled:
      row.temperature_controlled,
    hazardousMaterialAllowed:
      row.hazardous_material_allowed,
    reusable: row.reusable,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.description !== null
      ? { description: row.description }
      : {}),
    ...(row.dimensions !== null
      ? { dimensions: row.dimensions }
      : {}),
    ...(row.empty_weight !== null
      ? {
          emptyWeight:
            Number(row.empty_weight),
        }
      : {}),
    ...(row.maximum_weight !== null
      ? {
          maximumWeight:
            Number(row.maximum_weight),
        }
      : {}),
    ...(row.maximum_volume !== null
      ? {
          maximumVolume:
            Number(row.maximum_volume),
        }
      : {}),
    ...(row.weight_unit !== null
      ? { weightUnit: row.weight_unit }
      : {}),
    ...(row.volume_unit !== null
      ? { volumeUnit: row.volume_unit }
      : {}),
  };
}

function mapPackageItemRow(
  row: PackageItemRow,
): PackingPackageItem {
  return {
    id: row.id,
    packingItemId: row.packing_item_id,
    productId: row.product_id,
    quantity: Number(row.quantity),
    unit: row.unit,
    createdAt: row.created_at,
    ...(row.sku_id !== null
      ? { skuId: row.sku_id }
      : {}),
    ...(row.tracking !== null
      ? { tracking: row.tracking }
      : {}),
    ...(row.weight !== null
      ? { weight: Number(row.weight) }
      : {}),
    ...(row.volume !== null
      ? { volume: Number(row.volume) }
      : {}),
  };
}

function mapPackageRow(
  row: PackageRow,
  items: readonly PackingPackageItem[],
): PackingPackage {
  return {
    id: row.id,
    tenantId: row.account_id,
    packingId: row.packing_id,
    packageNumber: row.package_number,
    containerId: row.container_id,
    status: row.status,
    weightUnit: row.weight_unit,
    volumeUnit: row.volume_unit,
    items,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.parent_package_id !== null
      ? {
          parentPackageId:
            row.parent_package_id,
        }
      : {}),
    ...(row.sscc !== null
      ? { sscc: row.sscc }
      : {}),
    ...(row.license_plate_number !== null
      ? {
          licensePlateNumber:
            row.license_plate_number,
        }
      : {}),
    ...(row.seal_number !== null
      ? { sealNumber: row.seal_number }
      : {}),
    ...(row.actual_weight !== null
      ? {
          actualWeight:
            Number(row.actual_weight),
        }
      : {}),
    ...(row.calculated_weight !== null
      ? {
          calculatedWeight:
            Number(row.calculated_weight),
        }
      : {}),
    ...(row.actual_volume !== null
      ? {
          actualVolume:
            Number(row.actual_volume),
        }
      : {}),
    ...(row.calculated_volume !== null
      ? {
          calculatedVolume:
            Number(row.calculated_volume),
        }
      : {}),
    ...(row.sealed_by !== null
      ? { sealedBy: row.sealed_by }
      : {}),
    ...(row.sealed_at !== null
      ? { sealedAt: row.sealed_at }
      : {}),
  };
}

function mapLabelRow(
  row: LabelRow,
): PackingLabel {
  return {
    id: row.id,
    tenantId: row.account_id,
    packingId: row.packing_id,
    type: row.type,
    status: row.status,
    labelNumber: row.label_number,
    format: row.format,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.package_id !== null
      ? { packageId: row.package_id }
      : {}),
    ...(row.barcode_value !== null
      ? { barcodeValue: row.barcode_value }
      : {}),
    ...(row.sscc !== null
      ? { sscc: row.sscc }
      : {}),
    ...(row.content !== null
      ? { content: row.content }
      : {}),
    ...(row.printer_id !== null
      ? { printerId: row.printer_id }
      : {}),
    ...(row.generated_at !== null
      ? { generatedAt: row.generated_at }
      : {}),
    ...(row.printed_at !== null
      ? { printedAt: row.printed_at }
      : {}),
    ...(row.failure_reason !== null
      ? {
          failureReason:
            row.failure_reason,
        }
      : {}),
  };
}

function mapSuggestionRow(
  row: SuggestionRow,
): PackingSuggestion {
  return {
    id: row.id,
    tenantId: row.account_id,
    packingId: row.packing_id,
    packingItemIds:
      row.packing_item_ids ?? [],
    containerId: row.container_id,
    strategy: row.strategy,
    container: row.container_snapshot,
    suggestedPackageCount:
      row.suggested_package_count,
    estimatedWeight:
      Number(row.estimated_weight),
    estimatedVolume:
      Number(row.estimated_volume),
    score: row.score,
    reasons: row.reasons ?? [],
    warnings: row.warnings ?? [],
    selected: row.selected,
    createdAt: row.created_at,
  };
}

function mapTaskRow(
  row: TaskRow,
): PackingTask {
  return {
    id: row.id,
    tenantId: row.account_id,
    packingId: row.packing_id,
    warehouseId: row.warehouse_id,
    packingLocationId:
      row.packing_location_id,
    status: row.status,
    priority: row.priority,
    sequence: row.sequence,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.packing_item_id !== null
      ? {
          packingItemId:
            row.packing_item_id,
        }
      : {}),
    ...(row.package_id !== null
      ? { packageId: row.package_id }
      : {}),
    ...(row.assigned_user_id !== null
      ? {
          assignedUserId:
            row.assigned_user_id,
        }
      : {}),
    ...(row.assigned_equipment_id !== null
      ? {
          assignedEquipmentId:
            row.assigned_equipment_id,
        }
      : {}),
    ...(row.station_id !== null
      ? { stationId: row.station_id }
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

function mapExceptionRow(
  row: ExceptionRow,
): PackingException {
  return {
    id: row.id,
    tenantId: row.account_id,
    packingId: row.packing_id,
    type: row.type,
    message: row.message,
    resolved: row.resolved,
    createdAt: row.created_at,
    ...(row.packing_item_id !== null
      ? {
          packingItemId:
            row.packing_item_id,
        }
      : {}),
    ...(row.package_id !== null
      ? { packageId: row.package_id }
      : {}),
    ...(row.container_id !== null
      ? { containerId: row.container_id }
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
      ? {
          resolutionNotes:
            row.resolution_notes,
        }
      : {}),
  };
}

function mapPackingRow(
  row: PackingRow,
  items: readonly PackingItem[],
  packages: readonly PackingPackage[],
  labels: readonly PackingLabel[],
  suggestions: readonly PackingSuggestion[],
  exceptions: readonly PackingException[],
): Packing {
  return {
    id: row.id,
    tenantId: row.account_id,
    packingNumber: row.packing_number,
    warehouseId: row.warehouse_id,
    packingLocationId:
      row.packing_location_id,
    strategy: row.strategy,
    status: row.status,
    priority: row.priority,
    items,
    packages,
    labels,
    suggestions,
    exceptions,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.shipping_location_id !== null
      ? {
          shippingLocationId:
            row.shipping_location_id,
        }
      : {}),
    ...(row.picking_id !== null
      ? { pickingId: row.picking_id }
      : {}),
    ...(row.order_id !== null
      ? { orderId: row.order_id }
      : {}),
    ...(row.order_number !== null
      ? { orderNumber: row.order_number }
      : {}),
    ...(row.reference_type !== null
      ? {
          referenceType:
            row.reference_type,
        }
      : {}),
    ...(row.reference_id !== null
      ? { referenceId: row.reference_id }
      : {}),
    ...(row.reference_number !== null
      ? {
          referenceNumber:
            row.reference_number,
        }
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
    ...(row.packed_at !== null
      ? { packedAt: row.packed_at }
      : {}),
    ...(row.shipping_ready_at !== null
      ? {
          shippingReadyAt:
            row.shipping_ready_at,
        }
      : {}),
    ...(row.cancelled_at !== null
      ? { cancelledAt: row.cancelled_at }
      : {}),
    ...(row.cancellation_reason !== null
      ? {
          cancellationReason:
            row.cancellation_reason,
        }
      : {}),
    ...(row.notes !== null
      ? { notes: row.notes }
      : {}),
  };
}

export class SupabasePackingRepository
  implements PackingRepository
{
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(
    tenantId: string,
    packingId: string,
  ): Promise<Packing | null> {
    return this.findOne(
      tenantId,
      "id",
      packingId,
      "Paketleme kaydı okunamadı",
    );
  }

  async findByNumber(
    tenantId: string,
    packingNumber: string,
  ): Promise<Packing | null> {
    return this.findOne(
      tenantId,
      "packing_number",
      packingNumber,
      "Paketleme numarası okunamadı",
    );
  }

  async findByPickingId(
    tenantId: string,
    pickingId: string,
  ): Promise<Packing | null> {
    return this.findOne(
      tenantId,
      "picking_id",
      pickingId,
      "Toplamaya bağlı paketleme okunamadı",
    );
  }

  async findByOrderId(
    tenantId: string,
    orderId: string,
  ): Promise<Packing | null> {
    return this.findOne(
      tenantId,
      "order_id",
      orderId,
      "Siparişe bağlı paketleme okunamadı",
    );
  }

  async findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<Packing | null> {
    const { data, error } = await this.client
      .from(PACKING_TABLE)
      .select(PACKING_SELECT)
      .eq("account_id", tenantId)
      .eq("reference_type", referenceType)
      .eq("reference_id", referenceId)
      .maybeSingle();

    if (error) {
      this.throwError(
        "Referansa bağlı paketleme okunamadı",
        error,
      );
    }

    if (!data) {
      return null;
    }

    return this.hydrate(
      data as unknown as PackingRow,
    );
  }

  async list(
    filter: PackingListFilter,
  ): Promise<Packing[]> {
    let query = this.client
      .from(PACKING_TABLE)
      .select(PACKING_SELECT)
      .eq("account_id", filter.tenantId);

    if (filter.warehouseId !== undefined) {
      query = query.eq(
        "warehouse_id",
        filter.warehouseId,
      );
    }

    if (
      filter.packingLocationId !== undefined
    ) {
      query = query.eq(
        "packing_location_id",
        filter.packingLocationId,
      );
    }

    if (
      filter.shippingLocationId !== undefined
    ) {
      query = query.eq(
        "shipping_location_id",
        filter.shippingLocationId,
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

    if (filter.pickingId !== undefined) {
      query = query.eq(
        "picking_id",
        filter.pickingId,
      );
    }

    if (filter.orderId !== undefined) {
      query = query.eq(
        "order_id",
        filter.orderId,
      );
    }

    if (
      filter.referenceType !== undefined
    ) {
      query = query.eq(
        "reference_type",
        filter.referenceType,
      );
    }

    if (
      filter.referenceId !== undefined
    ) {
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
        "Paketleme kayıtları listelenemedi",
        error,
      );
    }

    let rows =
      (data ?? []) as unknown as PackingRow[];

    const search = filter.search
      ?.trim()
      .toLocaleLowerCase("tr-TR");

    if (search) {
      rows = rows.filter(
        (row) =>
          row.packing_number
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
    _packing: Packing,
  ): Promise<Packing> {
    return this.rejectDirectWrite();
  }

  async saveItem(
    _item: PackingItem,
  ): Promise<PackingItem> {
    return this.rejectDirectWrite();
  }

  async savePackage(
    _packingPackage: PackingPackage,
  ): Promise<PackingPackage> {
    return this.rejectDirectWrite();
  }

  async saveLabel(
    _label: PackingLabel,
  ): Promise<PackingLabel> {
    return this.rejectDirectWrite();
  }

  async saveSuggestion(
    _suggestion: PackingSuggestion,
  ): Promise<PackingSuggestion> {
    return this.rejectDirectWrite();
  }

  async saveTask(
    _task: PackingTask,
  ): Promise<PackingTask> {
    return this.rejectDirectWrite();
  }

  async saveException(
    _exception: PackingException,
  ): Promise<PackingException> {
    return this.rejectDirectWrite();
  }

  async saveContainer(
    _container: PackingContainer,
  ): Promise<PackingContainer> {
    return this.rejectDirectWrite();
  }

  async findContainerById(
    tenantId: string,
    containerId: string,
  ): Promise<PackingContainer | null> {
    const { data, error } = await this.client
      .from(CONTAINER_TABLE)
      .select(CONTAINER_SELECT)
      .eq("account_id", tenantId)
      .eq("id", containerId)
      .maybeSingle();

    if (error) {
      this.throwError(
        "Ambalaj kaydı okunamadı",
        error,
      );
    }

    return data
      ? mapContainerRow(
          data as unknown as ContainerRow,
        )
      : null;
  }

  async findContainerByCode(
    tenantId: string,
    code: string,
  ): Promise<PackingContainer | null> {
    const { data, error } = await this.client
      .from(CONTAINER_TABLE)
      .select(CONTAINER_SELECT)
      .eq("account_id", tenantId)
      .eq("code", code)
      .maybeSingle();

    if (error) {
      this.throwError(
        "Ambalaj kodu okunamadı",
        error,
      );
    }

    return data
      ? mapContainerRow(
          data as unknown as ContainerRow,
        )
      : null;
  }

  async listContainers(
    tenantId: string,
    activeOnly = false,
  ): Promise<PackingContainer[]> {
    let query = this.client
      .from(CONTAINER_TABLE)
      .select(CONTAINER_SELECT)
      .eq("account_id", tenantId);

    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data, error } = await query.order(
      "code",
      { ascending: true },
    );

    if (error) {
      this.throwError(
        "Ambalaj kayıtları listelenemedi",
        error,
      );
    }

    return (
      (data ?? []) as unknown as ContainerRow[]
    ).map(mapContainerRow);
  }

  async listPackages(
    tenantId: string,
    packingId: string,
  ): Promise<PackingPackage[]> {
    const { data, error } = await this.client
      .from(PACKAGE_TABLE)
      .select(PACKAGE_SELECT)
      .eq("account_id", tenantId)
      .eq("packing_id", packingId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      this.throwError(
        "Paketler listelenemedi",
        error,
      );
    }

    return Promise.all(
      (
        (data ?? []) as unknown as PackageRow[]
      ).map(
        (row) => this.hydratePackage(row),
      ),
    );
  }

  async listLabels(
    tenantId: string,
    packingId: string,
  ): Promise<PackingLabel[]> {
    const { data, error } = await this.client
      .from(LABEL_TABLE)
      .select(LABEL_SELECT)
      .eq("account_id", tenantId)
      .eq("packing_id", packingId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      this.throwError(
        "Paketleme etiketleri listelenemedi",
        error,
      );
    }

    return (
      (data ?? []) as unknown as LabelRow[]
    ).map(mapLabelRow);
  }

  async listSuggestions(
    tenantId: string,
    packingId: string,
  ): Promise<PackingSuggestion[]> {
    const { data, error } = await this.client
      .from(SUGGESTION_TABLE)
      .select(SUGGESTION_SELECT)
      .eq("account_id", tenantId)
      .eq("packing_id", packingId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      this.throwError(
        "Paketleme önerileri listelenemedi",
        error,
      );
    }

    return (
      (
        data ?? []
      ) as unknown as SuggestionRow[]
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
    packingId: string,
  ): Promise<PackingTask[]> {
    const { data, error } = await this.client
      .from(TASK_TABLE)
      .select(TASK_SELECT)
      .eq("account_id", tenantId)
      .eq("packing_id", packingId)
      .order("sequence", {
        ascending: true,
      })
      .order("priority", {
        ascending: true,
      });

    if (error) {
      this.throwError(
        "Paketleme görevleri listelenemedi",
        error,
      );
    }

    return (
      (data ?? []) as unknown as TaskRow[]
    ).map(mapTaskRow);
  }

  async listExceptions(
    tenantId: string,
    packingId: string,
  ): Promise<PackingException[]> {
    const { data, error } = await this.client
      .from(EXCEPTION_TABLE)
      .select(EXCEPTION_SELECT)
      .eq("account_id", tenantId)
      .eq("packing_id", packingId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      this.throwError(
        "Paketleme istisnaları listelenemedi",
        error,
      );
    }

    return (
      (data ?? []) as unknown as ExceptionRow[]
    ).map(mapExceptionRow);
  }

  private async listItems(
    tenantId: string,
    packingId: string,
  ): Promise<PackingItem[]> {
    const { data, error } = await this.client
      .from(ITEM_TABLE)
      .select(ITEM_SELECT)
      .eq("account_id", tenantId)
      .eq("packing_id", packingId)
      .order("line_number", {
        ascending: true,
      });

    if (error) {
      this.throwError(
        "Paketleme satırları listelenemedi",
        error,
      );
    }

    return (
      (data ?? []) as unknown as ItemRow[]
    ).map(mapItemRow);
  }

  private async listPackageItems(
    tenantId: string,
    packingId: string,
    packageId: string,
  ): Promise<PackingPackageItem[]> {
    const { data, error } = await this.client
      .from(PACKAGE_ITEM_TABLE)
      .select(PACKAGE_ITEM_SELECT)
      .eq("account_id", tenantId)
      .eq("packing_id", packingId)
      .eq("package_id", packageId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      this.throwError(
        "Paket içerikleri listelenemedi",
        error,
      );
    }

    return (
      (
        data ?? []
      ) as unknown as PackageItemRow[]
    ).map(mapPackageItemRow);
  }

  private async findOne(
    tenantId: string,
    column: string,
    value: string,
    errorLabel: string,
  ): Promise<Packing | null> {
    const { data, error } = await this.client
      .from(PACKING_TABLE)
      .select(PACKING_SELECT)
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
      data as unknown as PackingRow,
    );
  }

  private async hydrate(
    row: PackingRow,
  ): Promise<Packing> {
    const [
      items,
      packages,
      labels,
      suggestions,
      exceptions,
    ] = await Promise.all([
      this.listItems(
        row.account_id,
        row.id,
      ),
      this.listPackages(
        row.account_id,
        row.id,
      ),
      this.listLabels(
        row.account_id,
        row.id,
      ),
      this.listSuggestions(
        row.account_id,
        row.id,
      ),
      this.listExceptions(
        row.account_id,
        row.id,
      ),
    ]);

    return mapPackingRow(
      row,
      items,
      packages,
      labels,
      suggestions,
      exceptions,
    );
  }

  private async hydratePackage(
    row: PackageRow,
  ): Promise<PackingPackage> {
    const items =
      await this.listPackageItems(
        row.account_id,
        row.packing_id,
        row.id,
      );

    return mapPackageRow(
      row,
      items,
    );
  }

  private throwError(
    label: string,
    error: SupabaseErrorLike,
  ): never {
    throw new Error(
      `${label}: ${error.message}`,
    );
  }

  private rejectDirectWrite<T>(): Promise<T> {
    return Promise.reject(
      new Error(
        "Doğrudan Packing yazma kapalıdır. " +
          "Güvenli Packing write RPC kullanılmalıdır.",
      ),
    );
  }
}
