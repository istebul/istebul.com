import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  Shipping,
  ShippingListFilter,
} from "../types/Shipping";
import type {
  ShippingAddress,
} from "../types/ShippingAddress";
import type {
  ShippingAsn,
} from "../types/ShippingAsn";
import type {
  ShippingCarrier,
} from "../types/ShippingCarrier";
import type {
  ShippingDock,
} from "../types/ShippingDock";
import type {
  ShippingException,
} from "../types/ShippingException";
import type {
  ShippingItem,
} from "../types/ShippingItem";
import type {
  ShippingManifest,
} from "../types/ShippingManifest";
import type {
  ShippingPackage,
} from "../types/ShippingPackage";
import type {
  ShippingProofOfDelivery,
} from "../types/ShippingProofOfDelivery";
import type {
  ShippingServiceLevel,
} from "../types/ShippingServiceLevel";
import type {
  ShippingSuggestion,
} from "../types/ShippingSuggestion";
import type {
  ShippingTask,
} from "../types/ShippingTask";
import type {
  ShippingTrackingEvent,
} from "../types/ShippingTracking";
import type {
  ShippingVehicle,
} from "../types/ShippingVehicle";
import type {
  ShippingRepository,
} from "./ShippingRepository";

const SHIPPING_TABLE = "warehouse_shippings";
const ITEM_TABLE = "warehouse_shipping_items";
const PACKAGE_TABLE = "warehouse_shipping_packages";
const TASK_TABLE = "warehouse_shipping_tasks";
const EXCEPTION_TABLE = "warehouse_shipping_exceptions";
const MANIFEST_TABLE = "warehouse_shipping_manifests";
const ASN_TABLE = "warehouse_shipping_asns";
const TRACKING_TABLE = "warehouse_shipping_tracking_events";
const POD_TABLE = "warehouse_shipping_proofs_of_delivery";
const SUGGESTION_TABLE = "warehouse_shipping_suggestions";
const CARRIER_TABLE = "warehouse_shipping_carriers";
const SERVICE_LEVEL_TABLE = "warehouse_shipping_service_levels";
const VEHICLE_TABLE = "warehouse_shipping_vehicles";
const DOCK_TABLE = "warehouse_shipping_docks";

const SHIPPING_SELECT = [
  "id",
  "account_id",
  "shipping_number",
  "warehouse_id",
  "shipping_location_id",
  "strategy",
  "status",
  "packing_id",
  "order_id",
  "order_number",
  "reference_type",
  "reference_id",
  "reference_number",
  "carrier_id",
  "service_level_id",
  "vehicle_id",
  "dock_id",
  "driver_id",
  "driver_name",
  "driver_phone",
  "tracking_number",
  "manifest_id",
  "asn_id",
  "ship_from_address",
  "ship_to_address",
  "priority",
  "planned_at",
  "released_at",
  "loading_ready_at",
  "loading_started_at",
  "loaded_at",
  "dispatched_at",
  "in_transit_at",
  "delivered_at",
  "cancelled_at",
  "expected_delivery_at",
  "actual_delivery_at",
  "cancellation_reason",
  "delivery_failure_reason",
  "notes",
  "temperature_controlled",
  "hazardous_material",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const ITEM_SELECT = [
  "id",
  "account_id",
  "shipping_id",
  "line_number",
  "packing_id",
  "packing_item_id",
  "order_id",
  "order_item_id",
  "warehouse_id",
  "product_id",
  "sku_id",
  "requested_quantity",
  "loaded_quantity",
  "delivered_quantity",
  "returned_quantity",
  "damaged_quantity",
  "missing_quantity",
  "remaining_quantity",
  "unit",
  "tracking",
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

const PACKAGE_SELECT = [
  "id",
  "account_id",
  "shipping_id",
  "packing_id",
  "packing_package_id",
  "package_number",
  "sscc",
  "tracking_number",
  "status",
  "weight",
  "volume",
  "weight_unit",
  "volume_unit",
  "pallet_id",
  "parent_package_id",
  "loading_sequence",
  "loaded_by",
  "loaded_at",
  "dispatched_at",
  "delivered_at",
  "returned_at",
  "notes",
  "created_at",
  "updated_at",
].join(",");

const TASK_SELECT = [
  "id",
  "account_id",
  "shipping_id",
  "shipping_item_id",
  "shipping_package_id",
  "warehouse_id",
  "shipping_location_id",
  "dock_id",
  "vehicle_id",
  "type",
  "status",
  "assigned_user_id",
  "assigned_equipment_id",
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
  "shipping_id",
  "shipping_item_id",
  "shipping_package_id",
  "task_id",
  "manifest_id",
  "type",
  "message",
  "warehouse_id",
  "dock_id",
  "vehicle_id",
  "carrier_id",
  "resolved",
  "resolved_by",
  "resolved_at",
  "resolution_notes",
  "created_at",
].join(",");

const MANIFEST_SELECT = [
  "id",
  "account_id",
  "shipping_id",
  "manifest_number",
  "status",
  "carrier_id",
  "service_level_id",
  "vehicle_id",
  "package_count",
  "total_weight",
  "total_volume",
  "weight_unit",
  "volume_unit",
  "packages",
  "generated_by",
  "generated_at",
  "approved_by",
  "approved_at",
  "submitted_at",
  "accepted_at",
  "rejection_reason",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const ASN_SELECT = [
  "id",
  "account_id",
  "shipping_id",
  "asn_number",
  "status",
  "sender_code",
  "receiver_code",
  "planned_dispatch_at",
  "expected_delivery_at",
  "package_count",
  "lines",
  "format",
  "content",
  "generated_at",
  "sent_at",
  "acknowledged_at",
  "rejection_reason",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const TRACKING_SELECT = [
  "id",
  "account_id",
  "shipping_id",
  "shipping_package_id",
  "tracking_number",
  "type",
  "message",
  "location_name",
  "city",
  "country_code",
  "latitude",
  "longitude",
  "source",
  "external_event_code",
  "occurred_at",
  "created_at",
].join(",");

const POD_SELECT = [
  "id",
  "account_id",
  "shipping_id",
  "status",
  "recipient_name",
  "recipient_identity_number",
  "recipient_phone",
  "signature_url",
  "photo_urls",
  "document_urls",
  "latitude",
  "longitude",
  "delivery_address",
  "delivered_at",
  "captured_by",
  "verified_by",
  "verified_at",
  "rejection_reason",
  "notes",
  "created_at",
  "updated_at",
].join(",");

const SUGGESTION_SELECT = [
  "id",
  "account_id",
  "shipping_id",
  "carrier_id",
  "service_level_id",
  "vehicle_id",
  "dock_id",
  "carrier_snapshot",
  "service_level_snapshot",
  "vehicle_snapshot",
  "dock_snapshot",
  "estimated_cost",
  "currency",
  "estimated_delivery_at",
  "score",
  "reasons",
  "warnings",
  "selected",
  "created_at",
].join(",");

const CARRIER_SELECT = [
  "id",
  "account_id",
  "code",
  "name",
  "type",
  "tax_number",
  "contact_name",
  "phone",
  "email",
  "website",
  "account_number",
  "integration_code",
  "api_enabled",
  "tracking_supported",
  "manifest_supported",
  "asn_supported",
  "temperature_controlled",
  "hazardous_material_allowed",
  "international",
  "active",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const SERVICE_LEVEL_SELECT = [
  "id",
  "account_id",
  "carrier_id",
  "code",
  "name",
  "type",
  "description",
  "minimum_delivery_hours",
  "maximum_delivery_hours",
  "cutoff_time",
  "maximum_weight",
  "maximum_volume",
  "weight_unit",
  "volume_unit",
  "temperature_controlled",
  "hazardous_material_allowed",
  "international",
  "tracking_supported",
  "proof_of_delivery_required",
  "active",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const VEHICLE_SELECT = [
  "id",
  "account_id",
  "carrier_id",
  "code",
  "plate_number",
  "type",
  "trailer_plate_number",
  "maximum_weight",
  "maximum_volume",
  "weight_unit",
  "volume_unit",
  "pallet_capacity",
  "package_capacity",
  "temperature_controlled",
  "minimum_temperature",
  "maximum_temperature",
  "hazardous_material_allowed",
  "gps_enabled",
  "active",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const DOCK_SELECT = [
  "id",
  "account_id",
  "warehouse_id",
  "location_id",
  "code",
  "name",
  "status",
  "vehicle_types",
  "maximum_vehicle_height",
  "maximum_vehicle_weight",
  "temperature_controlled",
  "hazardous_material_allowed",
  "active",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

interface SupabaseErrorLike {
  message: string;
}

interface ShippingRow {
  id: string;
  account_id: string;
  shipping_number: string;
  warehouse_id: string;
  shipping_location_id: string;
  strategy: Shipping["strategy"];
  status: Shipping["status"];
  packing_id: string | null;
  order_id: string | null;
  order_number: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  carrier_id: string | null;
  service_level_id: string | null;
  vehicle_id: string | null;
  dock_id: string | null;
  driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  tracking_number: string | null;
  manifest_id: string | null;
  asn_id: string | null;
  ship_from_address: ShippingAddress;
  ship_to_address: ShippingAddress;
  priority: number;
  planned_at: string | null;
  released_at: string | null;
  loading_ready_at: string | null;
  loading_started_at: string | null;
  loaded_at: string | null;
  dispatched_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  expected_delivery_at: string | null;
  actual_delivery_at: string | null;
  cancellation_reason: string | null;
  delivery_failure_reason: string | null;
  notes: string | null;
  temperature_controlled: boolean;
  hazardous_material: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: string;
  account_id: string;
  shipping_id: string;
  line_number: number;
  packing_id: string | null;
  packing_item_id: string | null;
  order_id: string | null;
  order_item_id: string | null;
  warehouse_id: string;
  product_id: string;
  sku_id: string | null;
  requested_quantity: number | string;
  loaded_quantity: number | string;
  delivered_quantity: number | string;
  returned_quantity: number | string;
  damaged_quantity: number | string;
  missing_quantity: number | string;
  remaining_quantity: number | string;
  unit: string;
  tracking: NonNullable<ShippingItem["tracking"]> | null;
  unit_weight: number | string | null;
  unit_volume: number | string | null;
  weight_unit: ShippingItem["weightUnit"] | null;
  volume_unit: ShippingItem["volumeUnit"] | null;
  temperature_controlled: boolean;
  hazardous_material: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface PackageRow {
  id: string;
  account_id: string;
  shipping_id: string;
  packing_id: string;
  packing_package_id: string;
  package_number: string;
  sscc: string | null;
  tracking_number: string | null;
  status: ShippingPackage["status"];
  weight: number | string | null;
  volume: number | string | null;
  weight_unit: ShippingPackage["weightUnit"] | null;
  volume_unit: ShippingPackage["volumeUnit"] | null;
  pallet_id: string | null;
  parent_package_id: string | null;
  loading_sequence: number;
  loaded_by: string | null;
  loaded_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface GenericRow {
  [key: string]: any;
}

function mapItem(row: GenericRow): ShippingItem {
  return {
    id: row.id,
    tenantId: row.account_id,
    shippingId: row.shipping_id,
    lineNumber: row.line_number,
    warehouseId: row.warehouse_id,
    productId: row.product_id,
    requestedQuantity: Number(row.requested_quantity),
    loadedQuantity: Number(row.loaded_quantity),
    deliveredQuantity: Number(row.delivered_quantity),
    returnedQuantity: Number(row.returned_quantity),
    damagedQuantity: Number(row.damaged_quantity),
    missingQuantity: Number(row.missing_quantity),
    remainingQuantity: Number(row.remaining_quantity),
    unit: row.unit,
    temperatureControlled: row.temperature_controlled,
    hazardousMaterial: row.hazardous_material,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.packing_id !== null ? { packingId: row.packing_id } : {}),
    ...(row.packing_item_id !== null ? { packingItemId: row.packing_item_id } : {}),
    ...(row.order_id !== null ? { orderId: row.order_id } : {}),
    ...(row.order_item_id !== null ? { orderItemId: row.order_item_id } : {}),
    ...(row.sku_id !== null ? { skuId: row.sku_id } : {}),
    ...(row.tracking !== null ? { tracking: row.tracking } : {}),
    ...(row.unit_weight !== null ? { unitWeight: Number(row.unit_weight) } : {}),
    ...(row.unit_volume !== null ? { unitVolume: Number(row.unit_volume) } : {}),
    ...(row.weight_unit !== null ? { weightUnit: row.weight_unit } : {}),
    ...(row.volume_unit !== null ? { volumeUnit: row.volume_unit } : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
  };
}

function mapPackage(row: GenericRow): ShippingPackage {
  return {
    id: row.id,
    tenantId: row.account_id,
    shippingId: row.shipping_id,
    packingId: row.packing_id,
    packingPackageId: row.packing_package_id,
    packageNumber: row.package_number,
    status: row.status,
    loadingSequence: row.loading_sequence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.sscc !== null ? { sscc: row.sscc } : {}),
    ...(row.tracking_number !== null ? { trackingNumber: row.tracking_number } : {}),
    ...(row.weight !== null ? { weight: Number(row.weight) } : {}),
    ...(row.volume !== null ? { volume: Number(row.volume) } : {}),
    ...(row.weight_unit !== null ? { weightUnit: row.weight_unit } : {}),
    ...(row.volume_unit !== null ? { volumeUnit: row.volume_unit } : {}),
    ...(row.pallet_id !== null ? { palletId: row.pallet_id } : {}),
    ...(row.parent_package_id !== null ? { parentPackageId: row.parent_package_id } : {}),
    ...(row.loaded_by !== null ? { loadedBy: row.loaded_by } : {}),
    ...(row.loaded_at !== null ? { loadedAt: row.loaded_at } : {}),
    ...(row.dispatched_at !== null ? { dispatchedAt: row.dispatched_at } : {}),
    ...(row.delivered_at !== null ? { deliveredAt: row.delivered_at } : {}),
    ...(row.returned_at !== null ? { returnedAt: row.returned_at } : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
  };
}

function mapException(row: GenericRow): ShippingException {
  return {
    id: row.id,
    tenantId: row.account_id,
    shippingId: row.shipping_id,
    type: row.type,
    message: row.message,
    resolved: row.resolved,
    createdAt: row.created_at,
    ...(row.shipping_item_id !== null ? { shippingItemId: row.shipping_item_id } : {}),
    ...(row.shipping_package_id !== null ? { shippingPackageId: row.shipping_package_id } : {}),
    ...(row.task_id !== null ? { taskId: row.task_id } : {}),
    ...(row.manifest_id !== null ? { manifestId: row.manifest_id } : {}),
    ...(row.warehouse_id !== null ? { warehouseId: row.warehouse_id } : {}),
    ...(row.dock_id !== null ? { dockId: row.dock_id } : {}),
    ...(row.vehicle_id !== null ? { vehicleId: row.vehicle_id } : {}),
    ...(row.carrier_id !== null ? { carrierId: row.carrier_id } : {}),
    ...(row.resolved_by !== null ? { resolvedBy: row.resolved_by } : {}),
    ...(row.resolved_at !== null ? { resolvedAt: row.resolved_at } : {}),
    ...(row.resolution_notes !== null ? { resolutionNotes: row.resolution_notes } : {}),
  };
}

function mapTask(row: GenericRow): ShippingTask {
  return {
    id: row.id,
    tenantId: row.account_id,
    shippingId: row.shipping_id,
    warehouseId: row.warehouse_id,
    shippingLocationId: row.shipping_location_id,
    type: row.type,
    status: row.status,
    priority: row.priority,
    sequence: row.sequence,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.shipping_item_id !== null ? { shippingItemId: row.shipping_item_id } : {}),
    ...(row.shipping_package_id !== null ? { shippingPackageId: row.shipping_package_id } : {}),
    ...(row.dock_id !== null ? { dockId: row.dock_id } : {}),
    ...(row.vehicle_id !== null ? { vehicleId: row.vehicle_id } : {}),
    ...(row.assigned_user_id !== null ? { assignedUserId: row.assigned_user_id } : {}),
    ...(row.assigned_equipment_id !== null ? { assignedEquipmentId: row.assigned_equipment_id } : {}),
    ...(row.planned_at !== null ? { plannedAt: row.planned_at } : {}),
    ...(row.started_at !== null ? { startedAt: row.started_at } : {}),
    ...(row.completed_at !== null ? { completedAt: row.completed_at } : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
  };
}

function mapManifest(row: GenericRow): ShippingManifest {
  return {
    id: row.id,
    tenantId: row.account_id,
    shippingId: row.shipping_id,
    manifestNumber: row.manifest_number,
    status: row.status,
    packageCount: row.package_count,
    packages: row.packages,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.carrier_id !== null ? { carrierId: row.carrier_id } : {}),
    ...(row.service_level_id !== null ? { serviceLevelId: row.service_level_id } : {}),
    ...(row.vehicle_id !== null ? { vehicleId: row.vehicle_id } : {}),
    ...(row.total_weight !== null ? { totalWeight: Number(row.total_weight) } : {}),
    ...(row.total_volume !== null ? { totalVolume: Number(row.total_volume) } : {}),
    ...(row.weight_unit !== null ? { weightUnit: row.weight_unit } : {}),
    ...(row.volume_unit !== null ? { volumeUnit: row.volume_unit } : {}),
    ...(row.generated_by !== null ? { generatedBy: row.generated_by } : {}),
    ...(row.generated_at !== null ? { generatedAt: row.generated_at } : {}),
    ...(row.approved_by !== null ? { approvedBy: row.approved_by } : {}),
    ...(row.approved_at !== null ? { approvedAt: row.approved_at } : {}),
    ...(row.submitted_at !== null ? { submittedAt: row.submitted_at } : {}),
    ...(row.accepted_at !== null ? { acceptedAt: row.accepted_at } : {}),
    ...(row.rejection_reason !== null ? { rejectionReason: row.rejection_reason } : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
  };
}

function mapAsn(row: GenericRow): ShippingAsn {
  return {
    id: row.id,
    tenantId: row.account_id,
    shippingId: row.shipping_id,
    asnNumber: row.asn_number,
    status: row.status,
    packageCount: row.package_count,
    lines: row.lines,
    format: row.format,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.sender_code !== null ? { senderCode: row.sender_code } : {}),
    ...(row.receiver_code !== null ? { receiverCode: row.receiver_code } : {}),
    ...(row.planned_dispatch_at !== null ? { plannedDispatchAt: row.planned_dispatch_at } : {}),
    ...(row.expected_delivery_at !== null ? { expectedDeliveryAt: row.expected_delivery_at } : {}),
    ...(row.content !== null ? { content: row.content } : {}),
    ...(row.generated_at !== null ? { generatedAt: row.generated_at } : {}),
    ...(row.sent_at !== null ? { sentAt: row.sent_at } : {}),
    ...(row.acknowledged_at !== null ? { acknowledgedAt: row.acknowledged_at } : {}),
    ...(row.rejection_reason !== null ? { rejectionReason: row.rejection_reason } : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
  };
}

function mapTracking(row: GenericRow): ShippingTrackingEvent {
  return {
    id: row.id,
    tenantId: row.account_id,
    shippingId: row.shipping_id,
    type: row.type,
    message: row.message,
    source: row.source,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    ...(row.shipping_package_id !== null ? { shippingPackageId: row.shipping_package_id } : {}),
    ...(row.tracking_number !== null ? { trackingNumber: row.tracking_number } : {}),
    ...(row.location_name !== null ? { locationName: row.location_name } : {}),
    ...(row.city !== null ? { city: row.city } : {}),
    ...(row.country_code !== null ? { countryCode: row.country_code } : {}),
    ...(row.latitude !== null ? { latitude: Number(row.latitude) } : {}),
    ...(row.longitude !== null ? { longitude: Number(row.longitude) } : {}),
    ...(row.external_event_code !== null ? { externalEventCode: row.external_event_code } : {}),
  };
}

function mapPod(row: GenericRow): ShippingProofOfDelivery {
  return {
    id: row.id,
    tenantId: row.account_id,
    shippingId: row.shipping_id,
    status: row.status,
    recipientName: row.recipient_name,
    photoUrls: row.photo_urls,
    documentUrls: row.document_urls,
    deliveredAt: row.delivered_at,
    capturedBy: row.captured_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.recipient_identity_number !== null ? { recipientIdentityNumber: row.recipient_identity_number } : {}),
    ...(row.recipient_phone !== null ? { recipientPhone: row.recipient_phone } : {}),
    ...(row.signature_url !== null ? { signatureUrl: row.signature_url } : {}),
    ...(row.latitude !== null ? { latitude: Number(row.latitude) } : {}),
    ...(row.longitude !== null ? { longitude: Number(row.longitude) } : {}),
    ...(row.delivery_address !== null ? { deliveryAddress: row.delivery_address } : {}),
    ...(row.verified_by !== null ? { verifiedBy: row.verified_by } : {}),
    ...(row.verified_at !== null ? { verifiedAt: row.verified_at } : {}),
    ...(row.rejection_reason !== null ? { rejectionReason: row.rejection_reason } : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
  };
}

function mapSuggestion(row: GenericRow): ShippingSuggestion {
  return {
    id: row.id,
    tenantId: row.account_id,
    shippingId: row.shipping_id,
    score: row.score,
    reasons: row.reasons,
    warnings: row.warnings,
    selected: row.selected,
    createdAt: row.created_at,
    ...(row.carrier_id !== null ? { carrierId: row.carrier_id } : {}),
    ...(row.service_level_id !== null ? { serviceLevelId: row.service_level_id } : {}),
    ...(row.vehicle_id !== null ? { vehicleId: row.vehicle_id } : {}),
    ...(row.dock_id !== null ? { dockId: row.dock_id } : {}),
    ...(row.carrier_snapshot !== null ? { carrier: row.carrier_snapshot } : {}),
    ...(row.service_level_snapshot !== null ? { serviceLevel: row.service_level_snapshot } : {}),
    ...(row.vehicle_snapshot !== null ? { vehicle: row.vehicle_snapshot } : {}),
    ...(row.dock_snapshot !== null ? { dock: row.dock_snapshot } : {}),
    ...(row.estimated_cost !== null ? { estimatedCost: Number(row.estimated_cost) } : {}),
    ...(row.currency !== null ? { currency: row.currency } : {}),
    ...(row.estimated_delivery_at !== null ? { estimatedDeliveryAt: row.estimated_delivery_at } : {}),
  };
}

function mapServiceLevel(row: GenericRow): ShippingServiceLevel {
  return {
    id: row.id,
    tenantId: row.account_id,
    carrierId: row.carrier_id,
    code: row.code,
    name: row.name,
    type: row.type,
    temperatureControlled: row.temperature_controlled,
    hazardousMaterialAllowed: row.hazardous_material_allowed,
    international: row.international,
    trackingSupported: row.tracking_supported,
    proofOfDeliveryRequired: row.proof_of_delivery_required,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.description !== null ? { description: row.description } : {}),
    ...(row.minimum_delivery_hours !== null ? { minimumDeliveryHours: Number(row.minimum_delivery_hours) } : {}),
    ...(row.maximum_delivery_hours !== null ? { maximumDeliveryHours: Number(row.maximum_delivery_hours) } : {}),
    ...(row.cutoff_time !== null ? { cutoffTime: row.cutoff_time } : {}),
    ...(row.maximum_weight !== null ? { maximumWeight: Number(row.maximum_weight) } : {}),
    ...(row.maximum_volume !== null ? { maximumVolume: Number(row.maximum_volume) } : {}),
    ...(row.weight_unit !== null ? { weightUnit: row.weight_unit } : {}),
    ...(row.volume_unit !== null ? { volumeUnit: row.volume_unit } : {}),
  };
}

function mapCarrier(
  row: GenericRow,
  serviceLevels: readonly ShippingServiceLevel[],
): ShippingCarrier {
  return {
    id: row.id,
    tenantId: row.account_id,
    code: row.code,
    name: row.name,
    type: row.type,
    apiEnabled: row.api_enabled,
    trackingSupported: row.tracking_supported,
    manifestSupported: row.manifest_supported,
    asnSupported: row.asn_supported,
    temperatureControlled: row.temperature_controlled,
    hazardousMaterialAllowed: row.hazardous_material_allowed,
    international: row.international,
    serviceLevels,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.tax_number !== null ? { taxNumber: row.tax_number } : {}),
    ...(row.contact_name !== null ? { contactName: row.contact_name } : {}),
    ...(row.phone !== null ? { phone: row.phone } : {}),
    ...(row.email !== null ? { email: row.email } : {}),
    ...(row.website !== null ? { website: row.website } : {}),
    ...(row.account_number !== null ? { accountNumber: row.account_number } : {}),
    ...(row.integration_code !== null ? { integrationCode: row.integration_code } : {}),
  };
}

function mapVehicle(row: GenericRow): ShippingVehicle {
  return {
    id: row.id,
    tenantId: row.account_id,
    code: row.code,
    plateNumber: row.plate_number,
    type: row.type,
    temperatureControlled: row.temperature_controlled,
    hazardousMaterialAllowed: row.hazardous_material_allowed,
    gpsEnabled: row.gps_enabled,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.carrier_id !== null ? { carrierId: row.carrier_id } : {}),
    ...(row.trailer_plate_number !== null ? { trailerPlateNumber: row.trailer_plate_number } : {}),
    ...(row.maximum_weight !== null ? { maximumWeight: Number(row.maximum_weight) } : {}),
    ...(row.maximum_volume !== null ? { maximumVolume: Number(row.maximum_volume) } : {}),
    ...(row.weight_unit !== null ? { weightUnit: row.weight_unit } : {}),
    ...(row.volume_unit !== null ? { volumeUnit: row.volume_unit } : {}),
    ...(row.pallet_capacity !== null ? { palletCapacity: row.pallet_capacity } : {}),
    ...(row.package_capacity !== null ? { packageCapacity: row.package_capacity } : {}),
    ...(row.minimum_temperature !== null ? { minimumTemperature: Number(row.minimum_temperature) } : {}),
    ...(row.maximum_temperature !== null ? { maximumTemperature: Number(row.maximum_temperature) } : {}),
  };
}

function mapDock(row: GenericRow): ShippingDock {
  return {
    id: row.id,
    tenantId: row.account_id,
    warehouseId: row.warehouse_id,
    locationId: row.location_id,
    code: row.code,
    name: row.name,
    status: row.status,
    vehicleTypes: row.vehicle_types,
    temperatureControlled: row.temperature_controlled,
    hazardousMaterialAllowed: row.hazardous_material_allowed,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.maximum_vehicle_height !== null ? { maximumVehicleHeight: Number(row.maximum_vehicle_height) } : {}),
    ...(row.maximum_vehicle_weight !== null ? { maximumVehicleWeight: Number(row.maximum_vehicle_weight) } : {}),
  };
}

function mapShipping(
  row: ShippingRow,
  items: readonly ShippingItem[],
  packages: readonly ShippingPackage[],
  exceptions: readonly ShippingException[],
): Shipping {
  return {
    id: row.id,
    tenantId: row.account_id,
    shippingNumber: row.shipping_number,
    warehouseId: row.warehouse_id,
    shippingLocationId: row.shipping_location_id,
    strategy: row.strategy,
    status: row.status,
    shipFromAddress: row.ship_from_address,
    shipToAddress: row.ship_to_address,
    priority: row.priority,
    temperatureControlled: row.temperature_controlled,
    hazardousMaterial: row.hazardous_material,
    items,
    packages,
    exceptions,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.packing_id !== null ? { packingId: row.packing_id } : {}),
    ...(row.order_id !== null ? { orderId: row.order_id } : {}),
    ...(row.order_number !== null ? { orderNumber: row.order_number } : {}),
    ...(row.reference_type !== null ? { referenceType: row.reference_type } : {}),
    ...(row.reference_id !== null ? { referenceId: row.reference_id } : {}),
    ...(row.reference_number !== null ? { referenceNumber: row.reference_number } : {}),
    ...(row.carrier_id !== null ? { carrierId: row.carrier_id } : {}),
    ...(row.service_level_id !== null ? { serviceLevelId: row.service_level_id } : {}),
    ...(row.vehicle_id !== null ? { vehicleId: row.vehicle_id } : {}),
    ...(row.dock_id !== null ? { dockId: row.dock_id } : {}),
    ...(row.driver_id !== null ? { driverId: row.driver_id } : {}),
    ...(row.driver_name !== null ? { driverName: row.driver_name } : {}),
    ...(row.driver_phone !== null ? { driverPhone: row.driver_phone } : {}),
    ...(row.tracking_number !== null ? { trackingNumber: row.tracking_number } : {}),
    ...(row.manifest_id !== null ? { manifestId: row.manifest_id } : {}),
    ...(row.asn_id !== null ? { asnId: row.asn_id } : {}),
    ...(row.planned_at !== null ? { plannedAt: row.planned_at } : {}),
    ...(row.released_at !== null ? { releasedAt: row.released_at } : {}),
    ...(row.loading_ready_at !== null ? { loadingReadyAt: row.loading_ready_at } : {}),
    ...(row.loading_started_at !== null ? { loadingStartedAt: row.loading_started_at } : {}),
    ...(row.loaded_at !== null ? { loadedAt: row.loaded_at } : {}),
    ...(row.dispatched_at !== null ? { dispatchedAt: row.dispatched_at } : {}),
    ...(row.in_transit_at !== null ? { inTransitAt: row.in_transit_at } : {}),
    ...(row.delivered_at !== null ? { deliveredAt: row.delivered_at } : {}),
    ...(row.cancelled_at !== null ? { cancelledAt: row.cancelled_at } : {}),
    ...(row.expected_delivery_at !== null ? { expectedDeliveryAt: row.expected_delivery_at } : {}),
    ...(row.actual_delivery_at !== null ? { actualDeliveryAt: row.actual_delivery_at } : {}),
    ...(row.cancellation_reason !== null ? { cancellationReason: row.cancellation_reason } : {}),
    ...(row.delivery_failure_reason !== null ? { deliveryFailureReason: row.delivery_failure_reason } : {}),
    ...(row.notes !== null ? { notes: row.notes } : {}),
  };
}

export class SupabaseShippingRepository
  implements ShippingRepository
{
  constructor(
    private readonly client: SupabaseClient,
  ) {}

  async findById(
    tenantId: string,
    shippingId: string,
  ): Promise<Shipping | null> {
    return this.findOne(
      tenantId,
      "id",
      shippingId,
    );
  }

  async findByNumber(
    tenantId: string,
    shippingNumber: string,
  ): Promise<Shipping | null> {
    return this.findOne(
      tenantId,
      "shipping_number",
      shippingNumber,
    );
  }

  async findByPackingId(
    tenantId: string,
    packingId: string,
  ): Promise<Shipping | null> {
    return this.findOne(
      tenantId,
      "packing_id",
      packingId,
    );
  }

  async findByOrderId(
    tenantId: string,
    orderId: string,
  ): Promise<Shipping | null> {
    return this.findOne(
      tenantId,
      "order_id",
      orderId,
    );
  }

  async findByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
  ): Promise<Shipping | null> {
    const { data, error } =
      await this.client
        .from(SHIPPING_TABLE)
        .select(SHIPPING_SELECT)
        .eq("account_id", tenantId)
        .eq("reference_type", referenceType)
        .eq("reference_id", referenceId)
        .maybeSingle();

    if (error) {
      this.fail(
        "Referans sevkiyatı okunamadı",
        error,
      );
    }

    return data
      ? this.hydrate(
          data as unknown as ShippingRow,
        )
      : null;
  }

  async list(
    filter: ShippingListFilter,
  ): Promise<Shipping[]> {
    let query = this.client
      .from(SHIPPING_TABLE)
      .select(SHIPPING_SELECT)
      .eq("account_id", filter.tenantId);

    const filters: Array<
      [string, unknown]
    > = [
      ["warehouse_id", filter.warehouseId],
      ["shipping_location_id", filter.shippingLocationId],
      ["strategy", filter.strategy],
      ["status", filter.status],
      ["packing_id", filter.packingId],
      ["order_id", filter.orderId],
      ["carrier_id", filter.carrierId],
      ["service_level_id", filter.serviceLevelId],
      ["vehicle_id", filter.vehicleId],
      ["dock_id", filter.dockId],
      ["reference_type", filter.referenceType],
      ["reference_id", filter.referenceId],
    ];

    for (const [column, value] of filters) {
      if (value !== undefined) {
        query = query.eq(
          column,
          value,
        );
      }
    }

    const { data, error } =
      await query.order(
        "created_at",
        { ascending: false },
      );

    if (error) {
      this.fail(
        "Sevkiyat kayıtları listelenemedi",
        error,
      );
    }

    const search =
      filter.search
        ?.trim()
        .toLocaleLowerCase("tr-TR");

    const rows =
      (
        data ?? []
      ) as unknown as ShippingRow[];

    const filtered = !search
      ? rows
      : rows.filter((row) =>
          [
            row.shipping_number,
            row.order_number,
            row.reference_number,
            row.tracking_number,
            row.driver_name,
          ]
            .filter(
              (
                value,
              ): value is string =>
                typeof value === "string",
            )
            .some((value) =>
              value
                .toLocaleLowerCase("tr-TR")
                .includes(search),
            ),
        );

    return Promise.all(
      filtered.map(
        (row) => this.hydrate(row),
      ),
    );
  }

  async save(
    _shipping: Shipping,
  ): Promise<Shipping> {
    return this.rejectWrite();
  }

  async saveItem(
    _item: ShippingItem,
  ): Promise<ShippingItem> {
    return this.rejectWrite();
  }

  async savePackage(
    _shippingPackage: ShippingPackage,
  ): Promise<ShippingPackage> {
    return this.rejectWrite();
  }

  async saveTask(
    _task: ShippingTask,
  ): Promise<ShippingTask> {
    return this.rejectWrite();
  }

  async saveException(
    _exception: ShippingException,
  ): Promise<ShippingException> {
    return this.rejectWrite();
  }

  async saveManifest(
    _manifest: ShippingManifest,
  ): Promise<ShippingManifest> {
    return this.rejectWrite();
  }

  async saveAsn(
    _asn: ShippingAsn,
  ): Promise<ShippingAsn> {
    return this.rejectWrite();
  }

  async saveTrackingEvent(
    _event: ShippingTrackingEvent,
  ): Promise<ShippingTrackingEvent> {
    return this.rejectWrite();
  }

  async saveProofOfDelivery(
    _proofOfDelivery:
      ShippingProofOfDelivery,
  ): Promise<ShippingProofOfDelivery> {
    return this.rejectWrite();
  }

  async saveSuggestion(
    _suggestion: ShippingSuggestion,
  ): Promise<ShippingSuggestion> {
    return this.rejectWrite();
  }

  async saveCarrier(
    _carrier: ShippingCarrier,
  ): Promise<ShippingCarrier> {
    return this.rejectWrite();
  }

  async saveServiceLevel(
    _serviceLevel: ShippingServiceLevel,
  ): Promise<ShippingServiceLevel> {
    return this.rejectWrite();
  }

  async saveVehicle(
    _vehicle: ShippingVehicle,
  ): Promise<ShippingVehicle> {
    return this.rejectWrite();
  }

  async saveDock(
    _dock: ShippingDock,
  ): Promise<ShippingDock> {
    return this.rejectWrite();
  }

  async findCarrierById(
    tenantId: string,
    carrierId: string,
  ): Promise<ShippingCarrier | null> {
    return this.findCarrier(
      tenantId,
      "id",
      carrierId,
    );
  }

  async findCarrierByCode(
    tenantId: string,
    code: string,
  ): Promise<ShippingCarrier | null> {
    return this.findCarrier(
      tenantId,
      "code",
      code,
    );
  }

  async listCarriers(
    tenantId: string,
    activeOnly = false,
  ): Promise<ShippingCarrier[]> {
    let query = this.client
      .from(CARRIER_TABLE)
      .select(CARRIER_SELECT)
      .eq("account_id", tenantId);

    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data, error } =
      await query.order(
        "code",
        { ascending: true },
      );

    if (error) {
      this.fail(
        "Taşıyıcılar okunamadı",
        error,
      );
    }

    return Promise.all(
      (
        data ?? []
      ).map(
        (row) =>
          this.hydrateCarrier(
            row as unknown as GenericRow,
          ),
      ),
    );
  }

  async findServiceLevelById(
    tenantId: string,
    serviceLevelId: string,
  ): Promise<ShippingServiceLevel | null> {
    const { data, error } =
      await this.client
        .from(SERVICE_LEVEL_TABLE)
        .select(SERVICE_LEVEL_SELECT)
        .eq("account_id", tenantId)
        .eq("id", serviceLevelId)
        .maybeSingle();

    if (error) {
      this.fail(
        "Servis seviyesi okunamadı",
        error,
      );
    }

    return data
      ? mapServiceLevel(
          data as unknown as GenericRow,
        )
      : null;
  }

  async findServiceLevelByCode(
    tenantId: string,
    carrierId: string,
    code: string,
  ): Promise<ShippingServiceLevel | null> {
    const { data, error } =
      await this.client
        .from(SERVICE_LEVEL_TABLE)
        .select(SERVICE_LEVEL_SELECT)
        .eq("account_id", tenantId)
        .eq("carrier_id", carrierId)
        .eq("code", code)
        .maybeSingle();

    if (error) {
      this.fail(
        "Servis seviyesi okunamadı",
        error,
      );
    }

    return data
      ? mapServiceLevel(
          data as unknown as GenericRow,
        )
      : null;
  }

  async listServiceLevels(
    tenantId: string,
    carrierId?: string,
    activeOnly = false,
  ): Promise<ShippingServiceLevel[]> {
    let query = this.client
      .from(SERVICE_LEVEL_TABLE)
      .select(SERVICE_LEVEL_SELECT)
      .eq("account_id", tenantId);

    if (carrierId !== undefined) {
      query = query.eq(
        "carrier_id",
        carrierId,
      );
    }

    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data, error } =
      await query.order(
        "code",
        { ascending: true },
      );

    if (error) {
      this.fail(
        "Servis seviyeleri okunamadı",
        error,
      );
    }

    return (
      data ?? []
    ).map(
      (row) =>
        mapServiceLevel(
          row as unknown as GenericRow,
        ),
    );
  }

  async findVehicleById(
    tenantId: string,
    vehicleId: string,
  ): Promise<ShippingVehicle | null> {
    return this.findVehicle(
      tenantId,
      "id",
      vehicleId,
    );
  }

  async findVehicleByCode(
    tenantId: string,
    code: string,
  ): Promise<ShippingVehicle | null> {
    return this.findVehicle(
      tenantId,
      "code",
      code,
    );
  }

  async findVehicleByPlateNumber(
    tenantId: string,
    plateNumber: string,
  ): Promise<ShippingVehicle | null> {
    return this.findVehicle(
      tenantId,
      "plate_number",
      plateNumber,
    );
  }

  async listVehicles(
    tenantId: string,
    activeOnly = false,
  ): Promise<ShippingVehicle[]> {
    let query = this.client
      .from(VEHICLE_TABLE)
      .select(VEHICLE_SELECT)
      .eq("account_id", tenantId);

    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data, error } =
      await query.order(
        "code",
        { ascending: true },
      );

    if (error) {
      this.fail(
        "Araçlar okunamadı",
        error,
      );
    }

    return (
      data ?? []
    ).map(
      (row) =>
        mapVehicle(
          row as unknown as GenericRow,
        ),
    );
  }

  async findDockById(
    tenantId: string,
    dockId: string,
  ): Promise<ShippingDock | null> {
    const { data, error } =
      await this.client
        .from(DOCK_TABLE)
        .select(DOCK_SELECT)
        .eq("account_id", tenantId)
        .eq("id", dockId)
        .maybeSingle();

    if (error) {
      this.fail(
        "Rampa okunamadı",
        error,
      );
    }

    return data
      ? mapDock(
          data as unknown as GenericRow,
        )
      : null;
  }

  async findDockByCode(
    tenantId: string,
    warehouseId: string,
    code: string,
  ): Promise<ShippingDock | null> {
    const { data, error } =
      await this.client
        .from(DOCK_TABLE)
        .select(DOCK_SELECT)
        .eq("account_id", tenantId)
        .eq("warehouse_id", warehouseId)
        .eq("code", code)
        .maybeSingle();

    if (error) {
      this.fail(
        "Rampa okunamadı",
        error,
      );
    }

    return data
      ? mapDock(
          data as unknown as GenericRow,
        )
      : null;
  }

  async listDocks(
    tenantId: string,
    warehouseId?: string,
    activeOnly = false,
  ): Promise<ShippingDock[]> {
    let query = this.client
      .from(DOCK_TABLE)
      .select(DOCK_SELECT)
      .eq("account_id", tenantId);

    if (warehouseId !== undefined) {
      query = query.eq(
        "warehouse_id",
        warehouseId,
      );
    }

    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data, error } =
      await query.order(
        "code",
        { ascending: true },
      );

    if (error) {
      this.fail(
        "Rampalar okunamadı",
        error,
      );
    }

    return (
      data ?? []
    ).map(
      (row) =>
        mapDock(
          row as unknown as GenericRow,
        ),
    );
  }

  async listPackages(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingPackage[]> {
    return this.listChildren(
      PACKAGE_TABLE,
      PACKAGE_SELECT,
      tenantId,
      shippingId,
      "loading_sequence",
      mapPackage,
    );
  }

  async listTasks(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingTask[]> {
    return this.listChildren(
      TASK_TABLE,
      TASK_SELECT,
      tenantId,
      shippingId,
      "sequence",
      mapTask,
    );
  }

  async listExceptions(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingException[]> {
    return this.listChildren(
      EXCEPTION_TABLE,
      EXCEPTION_SELECT,
      tenantId,
      shippingId,
      "created_at",
      mapException,
    );
  }

  async listManifests(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingManifest[]> {
    return this.listChildren(
      MANIFEST_TABLE,
      MANIFEST_SELECT,
      tenantId,
      shippingId,
      "created_at",
      mapManifest,
    );
  }

  async listAsns(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingAsn[]> {
    return this.listChildren(
      ASN_TABLE,
      ASN_SELECT,
      tenantId,
      shippingId,
      "created_at",
      mapAsn,
    );
  }

  async listTrackingEvents(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingTrackingEvent[]> {
    return this.listChildren(
      TRACKING_TABLE,
      TRACKING_SELECT,
      tenantId,
      shippingId,
      "occurred_at",
      mapTracking,
    );
  }

  async listProofsOfDelivery(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingProofOfDelivery[]> {
    return this.listChildren(
      POD_TABLE,
      POD_SELECT,
      tenantId,
      shippingId,
      "delivered_at",
      mapPod,
    );
  }

  async listSuggestions(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingSuggestion[]> {
    const rows =
      await this.listChildren(
        SUGGESTION_TABLE,
        SUGGESTION_SELECT,
        tenantId,
        shippingId,
        "created_at",
        mapSuggestion,
      );

    return rows.sort(
      (left, right) =>
        right.score.totalScore -
        left.score.totalScore,
    );
  }

  private async listItems(
    tenantId: string,
    shippingId: string,
  ): Promise<ShippingItem[]> {
    return this.listChildren(
      ITEM_TABLE,
      ITEM_SELECT,
      tenantId,
      shippingId,
      "line_number",
      mapItem,
    );
  }

  private async listChildren<T>(
    table: string,
    select: string,
    tenantId: string,
    shippingId: string,
    orderColumn: string,
    mapper: (row: GenericRow) => T,
  ): Promise<T[]> {
    const { data, error } =
      await this.client
        .from(table)
        .select(select)
        .eq("account_id", tenantId)
        .eq("shipping_id", shippingId)
        .order(
          orderColumn,
          { ascending: true },
        );

    if (error) {
      this.fail(
        `${table} okunamadı`,
        error,
      );
    }

    return (
      data ?? []
    ).map(
      (row) =>
        mapper(
          row as unknown as GenericRow,
        ),
    );
  }

  private async findOne(
    tenantId: string,
    column: string,
    value: string,
  ): Promise<Shipping | null> {
    const { data, error } =
      await this.client
        .from(SHIPPING_TABLE)
        .select(SHIPPING_SELECT)
        .eq("account_id", tenantId)
        .eq(column, value)
        .maybeSingle();

    if (error) {
      this.fail(
        "Sevkiyat okunamadı",
        error,
      );
    }

    return data
      ? this.hydrate(
          data as unknown as ShippingRow,
        )
      : null;
  }

  private async hydrate(
    row: ShippingRow,
  ): Promise<Shipping> {
    const [
      items,
      packages,
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
      this.listExceptions(
        row.account_id,
        row.id,
      ),
    ]);

    return mapShipping(
      row,
      items,
      packages,
      exceptions,
    );
  }

  private async findCarrier(
    tenantId: string,
    column: string,
    value: string,
  ): Promise<ShippingCarrier | null> {
    const { data, error } =
      await this.client
        .from(CARRIER_TABLE)
        .select(CARRIER_SELECT)
        .eq("account_id", tenantId)
        .eq(column, value)
        .maybeSingle();

    if (error) {
      this.fail(
        "Taşıyıcı okunamadı",
        error,
      );
    }

    return data
      ? this.hydrateCarrier(
          data as unknown as GenericRow,
        )
      : null;
  }

  private async hydrateCarrier(
    row: GenericRow,
  ): Promise<ShippingCarrier> {
    const serviceLevels =
      await this.listServiceLevels(
        row.account_id,
        row.id,
      );

    return mapCarrier(
      row,
      serviceLevels,
    );
  }

  private async findVehicle(
    tenantId: string,
    column: string,
    value: string,
  ): Promise<ShippingVehicle | null> {
    const { data, error } =
      await this.client
        .from(VEHICLE_TABLE)
        .select(VEHICLE_SELECT)
        .eq("account_id", tenantId)
        .eq(column, value)
        .maybeSingle();

    if (error) {
      this.fail(
        "Araç okunamadı",
        error,
      );
    }

    return data
      ? mapVehicle(
          data as unknown as GenericRow,
        )
      : null;
  }

  private fail(
    label: string,
    error: SupabaseErrorLike,
  ): never {
    throw new Error(
      `${label}: ${error.message}`,
    );
  }

  private rejectWrite<T>(): Promise<T> {
    return Promise.reject(
      new Error(
        "Doğrudan Shipping yazma kapalıdır. " +
          "Güvenli Shipping write RPC kullanılmalıdır.",
      ),
    );
  }
}
