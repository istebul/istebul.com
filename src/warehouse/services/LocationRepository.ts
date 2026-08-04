import type {
  Location,
  LocationListFilter,
} from "../types/Location";

export interface LocationRepository {
  findById(
    tenantId: string,
    warehouseId: string,
    locationId: string,
  ): Promise<Location | null>;

  findByFullCode(
    tenantId: string,
    warehouseId: string,
    fullCode: string,
  ): Promise<Location | null>;

  list(filter: LocationListFilter): Promise<Location[]>;

  save(location: Location): Promise<Location>;
}
