import type {
  InventoryReservation,
} from "../types/InventoryReservation";
import type {
  ReservationListFilter,
  ReservationRepository,
} from "./ReservationRepository";

const ACTIVE_STATUSES = new Set([
  "active",
  "partially_consumed",
]);

export class InMemoryReservationRepository
  implements ReservationRepository
{
  private readonly reservations =
    new Map<string, InventoryReservation>();

  async findById(
    tenantId: string,
    reservationId: string,
  ): Promise<InventoryReservation | null> {
    const reservation = this.reservations.get(reservationId);

    if (!reservation || reservation.tenantId !== tenantId) {
      return null;
    }

    return structuredClone(reservation);
  }

  async findByNumber(
    tenantId: string,
    reservationNumber: string,
  ): Promise<InventoryReservation | null> {
    for (const reservation of this.reservations.values()) {
      if (
        reservation.tenantId === tenantId &&
        reservation.reservationNumber === reservationNumber
      ) {
        return structuredClone(reservation);
      }
    }

    return null;
  }

  async list(
    filter: ReservationListFilter,
  ): Promise<InventoryReservation[]> {
    return [...this.reservations.values()]
      .filter(
        (reservation) =>
          reservation.tenantId === filter.tenantId,
      )
      .filter(
        (reservation) =>
          filter.warehouseId === undefined ||
          reservation.warehouseId === filter.warehouseId,
      )
      .filter(
        (reservation) =>
          filter.locationId === undefined ||
          reservation.locationId === filter.locationId,
      )
      .filter(
        (reservation) =>
          filter.productId === undefined ||
          reservation.productId === filter.productId,
      )
      .filter(
        (reservation) =>
          filter.skuId === undefined ||
          reservation.skuId === filter.skuId,
      )
      .filter(
        (reservation) =>
          filter.lotNumber === undefined ||
          reservation.lotNumber === filter.lotNumber,
      )
      .filter(
        (reservation) =>
          filter.serialNumber === undefined ||
          reservation.serialNumber === filter.serialNumber,
      )
      .filter(
        (reservation) =>
          filter.referenceType === undefined ||
          reservation.referenceType === filter.referenceType,
      )
      .filter(
        (reservation) =>
          filter.referenceId === undefined ||
          reservation.referenceId === filter.referenceId,
      )
      .filter(
        (reservation) =>
          filter.status === undefined ||
          reservation.status === filter.status,
      )
      .filter(
        (reservation) =>
          filter.activeOnly !== true ||
          ACTIVE_STATUSES.has(reservation.status),
      )
      .sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      )
      .map((reservation) => structuredClone(reservation));
  }

  async save(
    reservation: InventoryReservation,
  ): Promise<InventoryReservation> {
    const stored = structuredClone(reservation);
    this.reservations.set(stored.id, stored);

    return structuredClone(stored);
  }

  async getReservedQuantity(
    filter: ReservationListFilter,
  ): Promise<number> {
    const reservations = await this.list({
      ...filter,
      activeOnly: true,
    });

    return reservations.reduce(
      (total, reservation) =>
        total +
        (reservation.quantity - reservation.consumedQuantity),
      0,
    );
  }
}
