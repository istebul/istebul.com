import type { Reservation } from '../entities/reservation.ts';
import type { RestaurantSnapshot } from '../types/snapshot.ts';

const OPEN_STATUSES = new Set(['pending', 'confirmed', 'seated', 'waitlist']);

export function listReservationsForDate(
  snapshot: RestaurantSnapshot,
  date: string,
): Reservation[] {
  return snapshot.reservations.filter((r) => r.date === date);
}

export function listOpenReservations(
  snapshot: RestaurantSnapshot,
  date?: string,
): Reservation[] {
  return snapshot.reservations.filter((r) => {
    if (date && r.date !== date) return false;
    return OPEN_STATUSES.has(String(r.status));
  });
}

export function countGuestsBooked(
  snapshot: RestaurantSnapshot,
  date: string,
): number {
  return listOpenReservations(snapshot, date).reduce(
    (sum, r) => sum + (r.guestCount || 0),
    0,
  );
}

export function findReservationById(
  snapshot: RestaurantSnapshot,
  id: string,
): Reservation | undefined {
  return snapshot.reservations.find((r) => r.id === id);
}
