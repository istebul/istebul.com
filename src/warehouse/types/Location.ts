import type { LocationStatus } from "./LocationStatus";
import type { LocationType } from "./LocationType";

export interface LocationCoordinates {
  x?: number;
  y?: number;
  z?: number;
}

export interface LocationCapacity {
  maximumWeightKilograms?: number;
  maximumVolumeCubicMeters?: number;
  maximumPalletCount?: number;
  maximumUnitCount?: number;
}

export interface LocationDimensions {
  widthCentimeters?: number;
  depthCentimeters?: number;
  heightCentimeters?: number;
}

export interface LocationHierarchy {
  zoneCode: string;
  aisleCode?: string;
  rackCode?: string;
  levelCode?: string;
  binCode?: string;
}

export interface Location {
  id: string;
  tenantId: string;
  warehouseId: string;
  parentLocationId?: string;
  code: string;
  fullCode: string;
  barcode: string;
  name: string;
  description?: string;
  type: LocationType;
  status: LocationStatus;
  hierarchy: LocationHierarchy;
  capacity?: LocationCapacity;
  dimensions?: LocationDimensions;
  coordinates?: LocationCoordinates;
  temperatureMinimumCelsius?: number;
  temperatureMaximumCelsius?: number;
  hazardousMaterialAllowed: boolean;
  mixedSkuAllowed: boolean;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationInput {
  tenantId: string;
  warehouseId: string;
  parentLocationId?: string;
  code: string;
  name: string;
  description?: string;
  type: LocationType;
  hierarchy: LocationHierarchy;
  capacity?: LocationCapacity;
  dimensions?: LocationDimensions;
  coordinates?: LocationCoordinates;
  temperatureMinimumCelsius?: number;
  temperatureMaximumCelsius?: number;
  hazardousMaterialAllowed?: boolean;
  mixedSkuAllowed?: boolean;
  createdBy: string;
}

export interface UpdateLocationInput {
  name?: string;
  description?: string;
  type?: LocationType;
  capacity?: LocationCapacity;
  dimensions?: LocationDimensions;
  coordinates?: LocationCoordinates;
  temperatureMinimumCelsius?: number;
  temperatureMaximumCelsius?: number;
  hazardousMaterialAllowed?: boolean;
  mixedSkuAllowed?: boolean;
  updatedBy: string;
}

export interface LocationListFilter {
  tenantId: string;
  warehouseId: string;
  type?: LocationType;
  status?: LocationStatus;
  active?: boolean;
  search?: string;
}
