export interface PickingRouteStep {
  readonly sequence: number;
  readonly locationId: string;
  readonly distanceFromPrevious?: number;
  readonly estimatedDurationSeconds?: number;
  readonly pickingTaskIds: readonly string[];
}

export interface PickingRoute {
  readonly id: string;
  readonly tenantId: string;
  readonly pickingId: string;
  readonly warehouseId: string;
  readonly startLocationId?: string;
  readonly endLocationId?: string;
  readonly totalDistance: number;
  readonly estimatedDurationSeconds: number;
  readonly optimized: boolean;
  readonly steps: readonly PickingRouteStep[];
  readonly createdAt: string;
}

export interface CreatePickingRouteInput {
  tenantId: string;
  pickingId: string;
  warehouseId: string;
  startLocationId?: string;
  endLocationId?: string;
  steps: readonly PickingRouteStep[];
}

export interface PickingRouteLocation {
  readonly locationId: string;
  readonly zoneId?: string;
  readonly aisle?: string;
  readonly rack?: string;
  readonly level?: string;
  readonly position?: string;
  readonly x?: number;
  readonly y?: number;
  readonly z?: number;
}
