import type {
  ShippingCarrier,
} from "./ShippingCarrier";
import type {
  ShippingDock,
} from "./ShippingDock";
import type {
  ShippingServiceLevel,
} from "./ShippingServiceLevel";
import type {
  ShippingVehicle,
} from "./ShippingVehicle";

export interface ShippingSuggestionScore {
  readonly costScore: number;
  readonly serviceLevelScore: number;
  readonly capacityScore: number;
  readonly compatibilityScore: number;
  readonly availabilityScore: number;
  readonly totalScore: number;
}

export interface ShippingSuggestion {
  readonly id: string;
  readonly tenantId: string;
  readonly shippingId: string;

  readonly carrierId?: string;
  readonly serviceLevelId?: string;
  readonly vehicleId?: string;
  readonly dockId?: string;

  readonly carrier?: ShippingCarrier;
  readonly serviceLevel?: ShippingServiceLevel;
  readonly vehicle?: ShippingVehicle;
  readonly dock?: ShippingDock;

  readonly estimatedCost?: number;
  readonly currency?: string;
  readonly estimatedDeliveryAt?: string;

  readonly score: ShippingSuggestionScore;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];

  readonly selected: boolean;
  readonly createdAt: string;
}
