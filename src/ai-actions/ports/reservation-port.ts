import type { Reservation } from '../../restaurant-knowledge/entities/reservation.ts';

export interface ReservationDraftInput {
  restaurantId: string;
  date: string;
  time: string;
  guestCount: number;
  salon?: string;
  tableIds?: string[];
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  hasPreorder?: boolean;
  campaign?: string;
  guaranteePolicyId?: string;
  guaranteeAmount?: number;
  metadata?: Record<string, unknown>;
}

export interface PreorderLine {
  name: string;
  quantity: number;
  menuItemId?: string;
}

/**
 * Reservation persistence port.
 * Default mock implements an in-memory Reservation Engine.
 * Future adapters can map to P7 CX / public API without changing Action code.
 */
export interface ReservationActionPort {
  create(input: ReservationDraftInput): Promise<Reservation>;
  update(
    reservationId: string,
    patch: Partial<ReservationDraftInput> & { status?: string },
  ): Promise<Reservation>;
  get(reservationId: string): Promise<Reservation | null>;
  assignTable(reservationId: string, tableId: string): Promise<Reservation>;
  setPreorder(reservationId: string, lines: PreorderLine[]): Promise<Reservation>;
  applyGuarantee(
    reservationId: string,
    policy: { policyId: string; amount: number; currency?: string },
  ): Promise<Reservation>;
  /** Compensating delete/cancel for rollback support. */
  cancel(reservationId: string, reason?: string): Promise<Reservation | null>;
  list(restaurantId: string): Promise<Reservation[]>;
}
