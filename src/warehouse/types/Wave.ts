import type {
  WaveAllocation,
} from "./WaveAllocation";
import type {
  WaveCapacity,
} from "./WaveCapacity";
import type {
  WaveException,
} from "./WaveException";
import type {
  WaveItem,
} from "./WaveItem";
import type {
  WaveOrder,
} from "./WaveOrder";
import type {
  WaveRelease,
} from "./WaveRelease";
import type {
  WaveStatus,
} from "./WaveStatus";
import type {
  WaveStrategy,
} from "./WaveStrategy";
import type {
  WaveTask,
} from "./WaveTask";

export interface Wave {
  readonly id: string;
  readonly tenantId: string;
  readonly waveNumber: string;
  readonly warehouseId: string;
  readonly name: string;
  readonly strategy: WaveStrategy;
  readonly status: WaveStatus;
  readonly priority: number;
  readonly ruleId?: string;
  readonly scheduleId?: string;
  readonly plannedAt?: string;
  readonly cutoffAt?: string;
  readonly releasedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly pausedAt?: string;
  readonly cancelledAt?: string;
  readonly cancellationReason?: string;
  readonly orders: readonly WaveOrder[];
  readonly items: readonly WaveItem[];
  readonly allocations: readonly WaveAllocation[];
  readonly tasks: readonly WaveTask[];
  readonly releases: readonly WaveRelease[];
  readonly exceptions: readonly WaveException[];
  readonly capacity?: WaveCapacity;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateWaveInput {
  tenantId: string;
  warehouseId: string;
  name: string;
  strategy: WaveStrategy;
  createdBy: string;
  priority?: number;
  ruleId?: string;
  scheduleId?: string;
  plannedAt?: string;
  cutoffAt?: string;
  notes?: string;
}

export interface WaveListFilter {
  tenantId: string;
  warehouseId?: string;
  status?: WaveStatus;
  strategy?: WaveStrategy;
  ruleId?: string;
  plannedFrom?: string;
  plannedTo?: string;
  createdFrom?: string;
  createdTo?: string;
}
