import type {
  Warehouse,
  WarehouseListFilter,
} from "../types/Warehouse";

export interface WarehouseRepository {
  findById(
    tenantId: string,
    warehouseId: string,
  ): Promise<Warehouse | null>;

  findByCode(
    tenantId: string,
    code: string,
  ): Promise<Warehouse | null>;

  list(filter: WarehouseListFilter): Promise<Warehouse[]>;

  save(warehouse: Warehouse): Promise<Warehouse>;
}
