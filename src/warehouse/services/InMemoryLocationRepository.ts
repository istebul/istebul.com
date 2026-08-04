import type {
  Location,
  LocationListFilter,
} from "../types/Location";
import type { LocationRepository } from "./LocationRepository";

export class InMemoryLocationRepository
  implements LocationRepository
{
  private readonly locations = new Map<string, Location>();

  async findById(
    tenantId: string,
    warehouseId: string,
    locationId: string,
  ): Promise<Location | null> {
    const location = this.locations.get(locationId);

    if (
      !location ||
      location.tenantId !== tenantId ||
      location.warehouseId !== warehouseId
    ) {
      return null;
    }

    return structuredClone(location);
  }

  async findByFullCode(
    tenantId: string,
    warehouseId: string,
    fullCode: string,
  ): Promise<Location | null> {
    const normalizedCode = fullCode.trim().toUpperCase();

    for (const location of this.locations.values()) {
      if (
        location.tenantId === tenantId &&
        location.warehouseId === warehouseId &&
        location.fullCode === normalizedCode
      ) {
        return structuredClone(location);
      }
    }

    return null;
  }

  async list(filter: LocationListFilter): Promise<Location[]> {
    const search = filter.search?.trim().toLocaleLowerCase("tr-TR");

    return [...this.locations.values()]
      .filter(
        (location) =>
          location.tenantId === filter.tenantId &&
          location.warehouseId === filter.warehouseId,
      )
      .filter(
        (location) =>
          filter.type === undefined ||
          location.type === filter.type,
      )
      .filter(
        (location) =>
          filter.status === undefined ||
          location.status === filter.status,
      )
      .filter(
        (location) =>
          filter.active === undefined ||
          location.active === filter.active,
      )
      .filter((location) => {
        if (!search) {
          return true;
        }

        return (
          location.name
            .toLocaleLowerCase("tr-TR")
            .includes(search) ||
          location.code
            .toLocaleLowerCase("tr-TR")
            .includes(search) ||
          location.fullCode
            .toLocaleLowerCase("tr-TR")
            .includes(search)
        );
      })
      .sort((left, right) =>
        left.fullCode.localeCompare(right.fullCode, "tr-TR"),
      )
      .map((location) => structuredClone(location));
  }

  async save(location: Location): Promise<Location> {
    const storedLocation = structuredClone(location);
    this.locations.set(storedLocation.id, storedLocation);

    return structuredClone(storedLocation);
  }
}
