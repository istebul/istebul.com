import type {
  CreatePickingRouteInput,
  PickingRoute,
  PickingRouteLocation,
  PickingRouteStep,
} from "../types/PickingRoute";
import type { PickingTask } from "../types/PickingTask";
import { InventoryValidationError } from "../types/InventoryErrors";

export interface OptimizePickingRouteInput {
  tenantId: string;
  pickingId: string;
  warehouseId: string;
  tasks: readonly PickingTask[];
  locations: readonly PickingRouteLocation[];
  startLocationId?: string;
  endLocationId?: string;
  averageWalkingSpeedMetersPerSecond?: number;
}

export interface PickingRouteOptimizerDependencies {
  createId?: () => string;
  now?: () => string;
}

interface LocationWithTasks {
  readonly location: PickingRouteLocation;
  readonly tasks: readonly PickingTask[];
}

function requireText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new InventoryValidationError(
      `${fieldName} boş bırakılamaz.`,
    );
  }

  return normalized;
}

function calculateEuclideanDistance(
  left: PickingRouteLocation,
  right: PickingRouteLocation,
): number | undefined {
  if (
    left.x === undefined ||
    left.y === undefined ||
    right.x === undefined ||
    right.y === undefined
  ) {
    return undefined;
  }

  const leftZ = left.z ?? 0;
  const rightZ = right.z ?? 0;

  return Math.sqrt(
    (right.x - left.x) ** 2 +
      (right.y - left.y) ** 2 +
      (rightZ - leftZ) ** 2,
  );
}

function compareWarehouseOrder(
  left: PickingRouteLocation,
  right: PickingRouteLocation,
): number {
  return (
    (left.zoneId ?? "").localeCompare(
      right.zoneId ?? "",
      "tr",
      { numeric: true },
    ) ||
    (left.aisle ?? "").localeCompare(
      right.aisle ?? "",
      "tr",
      { numeric: true },
    ) ||
    (left.rack ?? "").localeCompare(
      right.rack ?? "",
      "tr",
      { numeric: true },
    ) ||
    (left.level ?? "").localeCompare(
      right.level ?? "",
      "tr",
      { numeric: true },
    ) ||
    (left.position ?? "").localeCompare(
      right.position ?? "",
      "tr",
      { numeric: true },
    ) ||
    left.locationId.localeCompare(
      right.locationId,
      "tr",
      { numeric: true },
    )
  );
}

export class PickingRouteOptimizer {
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor(
    dependencies: PickingRouteOptimizerDependencies = {},
  ) {
    this.createId =
      dependencies.createId ??
      (() => crypto.randomUUID());

    this.now =
      dependencies.now ??
      (() => new Date().toISOString());
  }

  optimize(
    input: OptimizePickingRouteInput,
  ): PickingRoute {
    const tenantId = requireText(
      input.tenantId,
      "Firma kimliği",
    );

    const pickingId = requireText(
      input.pickingId,
      "Toplama kimliği",
    );

    const warehouseId = requireText(
      input.warehouseId,
      "Depo kimliği",
    );

    if (input.tasks.length === 0) {
      throw new InventoryValidationError(
        "Rota oluşturmak için en az bir toplama görevi gereklidir.",
      );
    }

    const speed =
      input.averageWalkingSpeedMetersPerSecond ?? 1.2;

    if (
      !Number.isFinite(speed) ||
      speed <= 0
    ) {
      throw new InventoryValidationError(
        "Ortalama yürüme hızı sıfırdan büyük olmalıdır.",
      );
    }

    const locationMap = new Map(
      input.locations.map(
        (location) => [
          location.locationId,
          location,
        ],
      ),
    );

    const tasksByLocation = new Map<
      string,
      PickingTask[]
    >();

    for (const task of input.tasks) {
      if (task.tenantId !== tenantId) {
        throw new InventoryValidationError(
          "Toplama görevi farklı bir firmaya aittir.",
        );
      }

      if (task.pickingId !== pickingId) {
        throw new InventoryValidationError(
          "Toplama görevi farklı bir toplama kaydına aittir.",
        );
      }

      if (task.warehouseId !== warehouseId) {
        throw new InventoryValidationError(
          "Toplama görevi farklı bir depoya aittir.",
        );
      }

      const location =
        locationMap.get(task.sourceLocationId);

      if (!location) {
        throw new InventoryValidationError(
          `Toplama lokasyonu rota modelinde bulunamadı: ${task.sourceLocationId}`,
        );
      }

      const current =
        tasksByLocation.get(task.sourceLocationId) ??
        [];

      current.push(task);
      tasksByLocation.set(
        task.sourceLocationId,
        current,
      );
    }

    const locationGroups: LocationWithTasks[] =
      [...tasksByLocation.entries()].map(
        ([locationId, tasks]) => ({
          location: locationMap.get(
            locationId,
          ) as PickingRouteLocation,
          tasks: [...tasks].sort(
            (left, right) =>
              left.sequence - right.sequence ||
              left.priority - right.priority,
          ),
        }),
      );

    const orderedGroups =
      this.orderLocations(
        locationGroups,
        locationMap,
        input.startLocationId,
      );

    const steps: PickingRouteStep[] = [];
    let totalDistance = 0;

    let previousLocation =
      input.startLocationId !== undefined
        ? locationMap.get(
            input.startLocationId,
          )
        : undefined;

    for (
      let index = 0;
      index < orderedGroups.length;
      index += 1
    ) {
      const group = orderedGroups[index];

      if (!group) {
        continue;
      }

      const distance =
        previousLocation !== undefined
          ? calculateEuclideanDistance(
              previousLocation,
              group.location,
            )
          : undefined;

      const normalizedDistance =
        distance ?? 0;

      totalDistance += normalizedDistance;

      steps.push({
        sequence: index + 1,
        locationId:
          group.location.locationId,
        pickingTaskIds:
          group.tasks.map((task) => task.id),
        ...(distance !== undefined
          ? {
              distanceFromPrevious:
                normalizedDistance,
              estimatedDurationSeconds:
                Math.round(
                  normalizedDistance / speed,
                ),
            }
          : {}),
      });

      previousLocation = group.location;
    }

    if (
      input.endLocationId !== undefined &&
      previousLocation !== undefined
    ) {
      const endLocation =
        locationMap.get(input.endLocationId);

      if (!endLocation) {
        throw new InventoryValidationError(
          `Rota bitiş lokasyonu bulunamadı: ${input.endLocationId}`,
        );
      }

      totalDistance +=
        calculateEuclideanDistance(
          previousLocation,
          endLocation,
        ) ?? 0;
    }

    const estimatedDurationSeconds =
      Math.round(totalDistance / speed);

    return {
      id: this.createId(),
      tenantId,
      pickingId,
      warehouseId,
      totalDistance,
      estimatedDurationSeconds,
      optimized: true,
      steps,
      createdAt: this.now(),
      ...(input.startLocationId?.trim()
        ? {
            startLocationId:
              input.startLocationId.trim(),
          }
        : {}),
      ...(input.endLocationId?.trim()
        ? {
            endLocationId:
              input.endLocationId.trim(),
          }
        : {}),
    };
  }

  private orderLocations(
    groups: readonly LocationWithTasks[],
    locationMap: ReadonlyMap<
      string,
      PickingRouteLocation
    >,
    startLocationId?: string,
  ): LocationWithTasks[] {
    const hasCoordinates =
      groups.every(
        (group) =>
          group.location.x !== undefined &&
          group.location.y !== undefined,
      );

    if (!hasCoordinates) {
      return [...groups].sort(
        (left, right) =>
          compareWarehouseOrder(
            left.location,
            right.location,
          ),
      );
    }

    const remaining = [...groups];
    const ordered: LocationWithTasks[] = [];

    let currentLocation =
      startLocationId !== undefined
        ? locationMap.get(startLocationId)
        : undefined;

    while (remaining.length > 0) {
      if (!currentLocation) {
        remaining.sort(
          (left, right) =>
            compareWarehouseOrder(
              left.location,
              right.location,
            ),
        );

        const first = remaining.shift();

        if (!first) {
          break;
        }

        ordered.push(first);
        currentLocation = first.location;
        continue;
      }

      remaining.sort((left, right) => {
        const leftDistance =
          calculateEuclideanDistance(
            currentLocation as PickingRouteLocation,
            left.location,
          ) ?? Number.POSITIVE_INFINITY;

        const rightDistance =
          calculateEuclideanDistance(
            currentLocation as PickingRouteLocation,
            right.location,
          ) ?? Number.POSITIVE_INFINITY;

        return (
          leftDistance - rightDistance ||
          compareWarehouseOrder(
            left.location,
            right.location,
          )
        );
      });

      const nearest = remaining.shift();

      if (!nearest) {
        break;
      }

      ordered.push(nearest);
      currentLocation = nearest.location;
    }

    return ordered;
  }

  createRouteInput(
    route: PickingRoute,
  ): CreatePickingRouteInput {
    return {
      tenantId: route.tenantId,
      pickingId: route.pickingId,
      warehouseId: route.warehouseId,
      steps: route.steps,
      ...(route.startLocationId !== undefined
        ? {
            startLocationId:
              route.startLocationId,
          }
        : {}),
      ...(route.endLocationId !== undefined
        ? {
            endLocationId:
              route.endLocationId,
          }
        : {}),
    };
  }
}
