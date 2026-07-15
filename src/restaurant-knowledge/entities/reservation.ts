/** Maps from existing `reservations`. */
export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'waitlist'
  | string;

export interface Reservation {
  id: string;
  restaurantId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  date: string;
  time: string;
  guestCount: number;
  status: ReservationStatus;
  salon?: string;
  tableIds?: string[];
  notes?: string;
  specialRequests?: string;
  hasPreorder?: boolean;
  arrivalStatus?: string;
  metadata?: Record<string, unknown>;
}

export function createReservation(
  partial: Partial<Reservation> &
    Pick<Reservation, 'id' | 'restaurantId' | 'date' | 'time' | 'guestCount'>,
): Reservation {
  return {
    status: 'pending',
    tableIds: [],
    ...partial,
  };
}
