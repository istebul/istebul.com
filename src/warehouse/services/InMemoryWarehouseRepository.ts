import type {
  Warehouse,
  WarehouseListFilter,
} from "../types/Warehouse";
import type { WarehouseRepository } from "./WarehouseRepository";

export class InMemoryWarehouseRepository
  implements WarehouseRepository
{
  private readonly warehouses = new Map<string, Warehouse>();

  async findById(
    tenantId: string,
    warehouseId: string,
  ): Promise<Warehouse | null> {
    const warehouse = this.warehouses.get(warehouseId);

    if (!warehouse || warehouse.tenantId !== tenantId) {
      return null;
    }

    return structuredClone(warehouse);
  }

  async findByCode(
    tenantId: string,
    code: string,
  ): Promise<Warehouse | null> {
    const normalizedCode = code.trim().toUpperCase();

    for (const warehouse of this.warehouses.values()) {
      if (
        warehouse.tenantId === tenantId &&
        warehouse.code === normalizedCode
      ) {
        return structuredClone(warehouse);
      }
    }

    return null;
  }

  async list(filter: WarehouseListFilter): Promise<Warehouse[]> {
    const search = filter.search?.trim().toLocaleLowerCase("tr-TR");

    return [...this.warehouses.values()]
      .filter((warehouse) => warehouse.tenantId === filter.tenantId)
      .filter(
        (warehouse) =>
          filter.status === undefined ||
          warehouse.status === filter.status,
      )
      .filter((warehouse) => {
        if (!search) {
          return true;
        }

        return (
          warehouse.name.toLocaleLowerCase("tr-TR").includes(search) ||
          warehouse.code.toLocaleLowerCase("tr-TR").includes(search)
        );
      })
      .sort((left, right) =>
        left.name.localeCompare(right.name, "tr-TR"),
      )
      .map((warehouse) => structuredClone(warehouse));
  }

  async save(warehouse: Warehouse): Promise<Warehouse> {
    const storedWarehouse = structuredClone(warehouse);
    this.warehouses.set(storedWarehouse.id, storedWarehouse);

    return structuredClone(storedWarehouse);
  }
}
