import type {
  CycleCountAdjustment,
} from "./CycleCountAdjustment";
import type {
  CycleCountApproval,
} from "./CycleCountApproval";
import type {
  CycleCountException,
} from "./CycleCountException";
import type {
  CycleCountItem,
} from "./CycleCountItem";
import type {
  CycleCountResult,
} from "./CycleCountResult";
import type {
  CycleCountStatus,
} from "./CycleCountStatus";
import type {
  CycleCountStrategy,
} from "./CycleCountStrategy";

export interface CycleCount {
  readonly id: string;
  readonly tenantId: string;
  readonly cycleCountNumber: string;
  readonly warehouseId: string;
  readonly strategy: CycleCountStrategy;
  readonly status: CycleCountStatus;
  readonly ruleId?: string;
  readonly scheduleId?: string;
  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly referenceNumber?: string;
  readonly blindCount: boolean;
  readonly freezeInventory: boolean;
  readonly toleranceQuantity?: number;
  readonly tolerancePercentage?: number;
  readonly priority: number;
  readonly plannedAt?: string;
  readonly releasedAt?: string;
  readonly startedAt?: string;
  readonly countedAt?: string;
  readonly approvedAt?: string;
  readonly adjustedAt?: string;
  readonly completedAt?: string;
  readonly cancelledAt?: string;
  readonly cancellationReason?: string;
  readonly notes?: string;
  readonly items: readonly CycleCountItem[];
  readonly results: readonly CycleCountResult[];
  readonly adjustments: readonly CycleCountAdjustment[];
  readonly approvals: readonly CycleCountApproval[];
  readonly exceptions: readonly CycleCountException[];
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCycleCountInput {
  tenantId: string;
  warehouseId: string;
  strategy: CycleCountStrategy;
  ruleId?: string;
  scheduleId?: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  blindCount?: boolean;
  freezeInventory?: boolean;
  toleranceQuantity?: number;
  tolerancePercentage?: number;
  priority?: number;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}

export interface CycleCountListFilter {
  tenantId: string;
  warehouseId?: string;
  strategy?: CycleCountStrategy;
  status?: CycleCountStatus;
  ruleId?: string;
  scheduleId?: string;
  plannedFrom?: string;
  plannedTo?: string;
  search?: string;
}
