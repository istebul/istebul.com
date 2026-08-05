import type { QualityDecision } from "./QualityDecision";
import type { QualityException } from "./QualityException";
import type {
  QualityInspectionItem,
} from "./QualityInspectionItem";
import type {
  QualityInspectionStatus,
} from "./QualityInspectionStatus";
import type { QualitySample } from "./QualitySample";

export interface QualityInspectionTotals {
  readonly inspectedQuantity: number;
  readonly acceptedQuantity: number;
  readonly rejectedQuantity: number;
  readonly conditionalQuantity: number;
  readonly holdQuantity: number;
}

export interface QualityInspection {
  readonly id: string;
  readonly tenantId: string;
  readonly inspectionNumber: string;
  readonly warehouseId: string;
  readonly locationId: string;
  readonly receivingId?: string;
  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly referenceNumber?: string;
  readonly status: QualityInspectionStatus;
  readonly finalDecision: QualityDecision;
  readonly plannedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly cancelledAt?: string;
  readonly cancellationReason?: string;
  readonly notes?: string;
  readonly items: readonly QualityInspectionItem[];
  readonly samples: readonly QualitySample[];
  readonly exceptions: readonly QualityException[];
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateQualityInspectionInput {
  tenantId: string;
  warehouseId: string;
  locationId: string;
  receivingId?: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}

export interface QualityInspectionListFilter {
  tenantId: string;
  warehouseId?: string;
  locationId?: string;
  receivingId?: string;
  status?: QualityInspectionStatus;
  finalDecision?: QualityDecision;
  referenceType?: string;
  referenceId?: string;
  search?: string;
}

export function calculateQualityInspectionTotals(
  inspection: Pick<QualityInspection, "items">,
): QualityInspectionTotals {
  return inspection.items.reduce<QualityInspectionTotals>(
    (totals, item) => ({
      inspectedQuantity:
        totals.inspectedQuantity + item.inspectedQuantity,
      acceptedQuantity:
        totals.acceptedQuantity + item.acceptedQuantity,
      rejectedQuantity:
        totals.rejectedQuantity + item.rejectedQuantity,
      conditionalQuantity:
        totals.conditionalQuantity +
        item.conditionalQuantity,
      holdQuantity:
        totals.holdQuantity + item.holdQuantity,
    }),
    {
      inspectedQuantity: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      conditionalQuantity: 0,
      holdQuantity: 0,
    },
  );
}
