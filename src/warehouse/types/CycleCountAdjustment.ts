export const CYCLE_COUNT_ADJUSTMENT_STATUSES = [
  "pending",
  "approval_required",
  "approved",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type CycleCountAdjustmentStatus =
  (typeof CYCLE_COUNT_ADJUSTMENT_STATUSES)[number];

export const CYCLE_COUNT_ADJUSTMENT_STATUS_LABELS: Record<
  CycleCountAdjustmentStatus,
  string
> = {
  pending: "Bekliyor",
  approval_required: "Onay Bekliyor",
  approved: "Onaylandı",
  processing: "İşleniyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
  cancelled: "İptal Edildi",
};

export const CYCLE_COUNT_ADJUSTMENT_TYPES = [
  "increase",
  "decrease",
  "damage",
  "stock_status_change",
] as const;

export type CycleCountAdjustmentType =
  (typeof CYCLE_COUNT_ADJUSTMENT_TYPES)[number];

export const CYCLE_COUNT_ADJUSTMENT_TYPE_LABELS: Record<
  CycleCountAdjustmentType,
  string
> = {
  increase: "Stok Artırma",
  decrease: "Stok Azaltma",
  damage: "Hasarlı Stok Ayırma",
  stock_status_change: "Stok Durumu Değişikliği",
};

export interface CycleCountAdjustment {
  readonly id: string;
  readonly tenantId: string;
  readonly cycleCountId: string;
  readonly cycleCountItemId: string;
  readonly resultId: string;
  readonly type: CycleCountAdjustmentType;
  readonly status: CycleCountAdjustmentStatus;
  readonly warehouseId: string;
  readonly locationId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly quantity: number;
  readonly unit: string;
  readonly previousQuantity: number;
  readonly adjustedQuantity: number;
  readonly stockStatus?: string;
  readonly targetStockStatus?: string;
  readonly inventoryMovementId?: string;
  readonly externalSystem?: string;
  readonly externalReferenceId?: string;
  readonly failureReason?: string;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  readonly processedBy?: string;
  readonly processedAt?: string;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCycleCountAdjustmentInput {
  tenantId: string;
  cycleCountId: string;
  cycleCountItemId: string;
  resultId: string;
  type: CycleCountAdjustmentType;
  warehouseId: string;
  locationId: string;
  productId: string;
  skuId?: string;
  quantity: number;
  unit: string;
  previousQuantity: number;
  adjustedQuantity: number;
  stockStatus?: string;
  targetStockStatus?: string;
  externalSystem?: string;
  notes?: string;
  requestedBy: string;
}

export function isCycleCountAdjustmentStatus(
  value: unknown,
): value is CycleCountAdjustmentStatus {
  return (
    typeof value === "string" &&
    CYCLE_COUNT_ADJUSTMENT_STATUSES.includes(
      value as CycleCountAdjustmentStatus,
    )
  );
}

export function isCycleCountAdjustmentType(
  value: unknown,
): value is CycleCountAdjustmentType {
  return (
    typeof value === "string" &&
    CYCLE_COUNT_ADJUSTMENT_TYPES.includes(
      value as CycleCountAdjustmentType,
    )
  );
}
