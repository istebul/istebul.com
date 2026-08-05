import type {
  InventoryTracking,
} from "./InventoryMovement";

export const CYCLE_COUNT_ITEM_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "counted",
  "recount_required",
  "under_review",
  "approved",
  "adjusted",
  "cancelled",
] as const;

export type CycleCountItemStatus =
  (typeof CYCLE_COUNT_ITEM_STATUSES)[number];

export const CYCLE_COUNT_ITEM_STATUS_LABELS: Record<
  CycleCountItemStatus,
  string
> = {
  pending: "Bekliyor",
  assigned: "Görev Atandı",
  in_progress: "Sayılıyor",
  counted: "Sayıldı",
  recount_required: "Yeniden Sayım Gerekli",
  under_review: "İnceleme Bekliyor",
  approved: "Onaylandı",
  adjusted: "Stok Düzeltildi",
  cancelled: "İptal Edildi",
};

export interface CycleCountItem {
  readonly id: string;
  readonly tenantId: string;
  readonly cycleCountId: string;
  readonly lineNumber: number;
  readonly warehouseId: string;
  readonly locationId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly inventoryBalanceId?: string;
  readonly stockStatus?: string;
  readonly tracking?: InventoryTracking;
  readonly unit: string;
  readonly status: CycleCountItemStatus;
  readonly blindCount: boolean;
  readonly expectedQuantity: number;
  readonly firstCountQuantity?: number;
  readonly secondCountQuantity?: number;
  readonly finalCountQuantity?: number;
  readonly damagedQuantity: number;
  readonly varianceQuantity?: number;
  readonly variancePercentage?: number;
  readonly varianceValue?: number;
  readonly unitCost?: number;
  readonly currency?: string;
  readonly toleranceQuantity?: number;
  readonly tolerancePercentage?: number;
  readonly recountRequired: boolean;
  readonly adjustmentRequired: boolean;
  readonly countedBy?: string;
  readonly countedAt?: string;
  readonly recountedBy?: string;
  readonly recountedAt?: string;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCycleCountItemInput {
  tenantId: string;
  cycleCountId: string;
  warehouseId: string;
  locationId: string;
  productId: string;
  skuId?: string;
  inventoryBalanceId?: string;
  stockStatus?: string;
  tracking?: InventoryTracking;
  unit: string;
  expectedQuantity: number;
  blindCount?: boolean;
  unitCost?: number;
  currency?: string;
  toleranceQuantity?: number;
  tolerancePercentage?: number;
  notes?: string;
  createdBy: string;
}

export interface ConfirmCycleCountItemInput {
  tenantId: string;
  cycleCountId: string;
  cycleCountItemId: string;
  countedQuantity: number;
  damagedQuantity?: number;
  barcode?: string;
  lotNumber?: string;
  serialNumber?: string;
  countedBy: string;
  notes?: string;
}

export interface RecountCycleCountItemInput {
  tenantId: string;
  cycleCountId: string;
  cycleCountItemId: string;
  countedQuantity: number;
  damagedQuantity?: number;
  recountedBy: string;
  notes?: string;
}

export function isCycleCountItemStatus(
  value: unknown,
): value is CycleCountItemStatus {
  return (
    typeof value === "string" &&
    CYCLE_COUNT_ITEM_STATUSES.includes(
      value as CycleCountItemStatus,
    )
  );
}
