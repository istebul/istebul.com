import type { InventoryTracking } from "./InventoryMovement";
import type { QualityControlType } from "./QualityControlType";
import type { QualityDecision } from "./QualityDecision";

export interface QualityInspectionItem {
  readonly id: string;
  readonly tenantId: string;
  readonly inspectionId: string;
  readonly lineNumber: number;
  readonly productId: string;
  readonly skuId?: string;
  readonly receivingId?: string;
  readonly receivingItemId?: string;
  readonly warehouseId: string;
  readonly locationId: string;
  readonly controlType: QualityControlType;
  readonly inspectedQuantity: number;
  readonly acceptedQuantity: number;
  readonly rejectedQuantity: number;
  readonly conditionalQuantity: number;
  readonly holdQuantity: number;
  readonly unit: string;
  readonly decision: QualityDecision;
  readonly tracking?: InventoryTracking;
  readonly measuredValue?: string | number | boolean;
  readonly expectedValue?: string | number | boolean;
  readonly notes?: string;
  readonly inspectedBy?: string;
  readonly inspectedAt?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateQualityInspectionItemInput {
  tenantId: string;
  inspectionId: string;
  productId: string;
  skuId?: string;
  receivingId?: string;
  receivingItemId?: string;
  warehouseId: string;
  locationId: string;
  controlType: QualityControlType;
  inspectedQuantity: number;
  unit: string;
  tracking?: InventoryTracking;
  expectedValue?: string | number | boolean;
  notes?: string;
  createdBy: string;
}

export interface RecordQualityInspectionResultInput {
  tenantId: string;
  inspectionId: string;
  inspectionItemId: string;
  acceptedQuantity: number;
  rejectedQuantity: number;
  conditionalQuantity?: number;
  holdQuantity?: number;
  decision: QualityDecision;
  measuredValue?: string | number | boolean;
  notes?: string;
  inspectedBy: string;
}

export interface QualityInspectionItemTotals {
  readonly inspectedQuantity: number;
  readonly acceptedQuantity: number;
  readonly rejectedQuantity: number;
  readonly conditionalQuantity: number;
  readonly holdQuantity: number;
}

export function calculateQualityInspectionItemTotals(
  item: QualityInspectionItem,
): QualityInspectionItemTotals {
  return {
    inspectedQuantity: item.inspectedQuantity,
    acceptedQuantity: item.acceptedQuantity,
    rejectedQuantity: item.rejectedQuantity,
    conditionalQuantity: item.conditionalQuantity,
    holdQuantity: item.holdQuantity,
  };
}
