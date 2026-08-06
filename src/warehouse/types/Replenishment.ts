import type {
  ReplenishmentAllocation,
} from "./ReplenishmentAllocation";
import type {
  ReplenishmentException,
} from "./ReplenishmentException";
import type {
  ReplenishmentItem,
} from "./ReplenishmentItem";
import type {
  ReplenishmentSource,
} from "./ReplenishmentSource";
import type {
  ReplenishmentStatus,
} from "./ReplenishmentStatus";
import type {
  ReplenishmentStrategy,
} from "./ReplenishmentStrategy";
import type {
  ReplenishmentSuggestion,
} from "./ReplenishmentSuggestion";

export interface Replenishment {
  readonly id: string;
  readonly tenantId: string;
  readonly replenishmentNumber: string;
  readonly warehouseId: string;
  readonly strategy: ReplenishmentStrategy;
  readonly source: ReplenishmentSource;
  readonly status: ReplenishmentStatus;
  readonly priority: number;
  readonly ruleId?: string;
  readonly plannedAt?: string;
  readonly releasedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly cancelledAt?: string;
  readonly cancellationReason?: string;
  readonly notes?: string;
  readonly items: readonly ReplenishmentItem[];
  readonly allocations: readonly ReplenishmentAllocation[];
  readonly suggestions: readonly ReplenishmentSuggestion[];
  readonly exceptions: readonly ReplenishmentException[];
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateReplenishmentInput {
  tenantId: string;
  warehouseId: string;
  strategy: ReplenishmentStrategy;
  source: ReplenishmentSource;
  createdBy: string;
  ruleId?: string;
  priority?: number;
  plannedAt?: string;
  notes?: string;
}

export interface ReplenishmentListFilter {
  tenantId: string;
  warehouseId?: string;
  status?: ReplenishmentStatus;
  strategy?: ReplenishmentStrategy;
  productId?: string;
  destinationLocationId?: string;
  createdFrom?: string;
  createdTo?: string;
}
