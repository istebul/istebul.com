import type { WarehouseStatus } from "./WarehouseStatus";

export interface WarehouseAddress {
  addressLine: string;
  district?: string;
  city: string;
  postalCode?: string;
  countryCode: string;
}

export interface WarehouseCapacity {
  totalAreaSquareMeters?: number;
  usableAreaSquareMeters?: number;
  maximumPalletCapacity?: number;
  maximumBinCapacity?: number;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  status: WarehouseStatus;
  timezone: string;
  address?: WarehouseAddress;
  capacity?: WarehouseCapacity;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseInput {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  timezone?: string;
  address?: WarehouseAddress;
  capacity?: WarehouseCapacity;
  createdBy: string;
}

export interface UpdateWarehouseInput {
  name?: string;
  description?: string;
  timezone?: string;
  address?: WarehouseAddress;
  capacity?: WarehouseCapacity;
  updatedBy: string;
}

export interface WarehouseListFilter {
  tenantId: string;
  status?: WarehouseStatus;
  search?: string;
}
