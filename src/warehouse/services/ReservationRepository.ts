import type {
  InventoryReservation,
  InventoryReservationStatus,
} from "../types/InventoryReservation";

export interface ReservationListFilter {
  tenantId: string;
  warehouseId?: string;
  locationId?: string;
  productId?: string;
  skuId?: string;
  lotNumber?: string;
  serialNumber?: string;
  referenceType?: string;
  referenceId?: string;
  status?: InventoryReservationStatus;
  activeOnly?: boolean;
}

export interface ReservationRepository {
  findById(
    tenantId: string,
    reservationId: string,
  ): Promise<InventoryReservation | null>;

  findByNumber(
    tenantId: string,
    reservationNumber: string,
  ): Promise<InventoryReservation | null>;

  list(
    filter: ReservationListFilter,
  ): Promise<InventoryReservation[]>;

  save(
    reservation: InventoryReservation,
  ): Promise<InventoryReservation>;

  getReservedQuantity(
    filter: ReservationListFilter,
  ): Promise<number>;
}
