import {
  createReservation,
  type Reservation,
} from '../../restaurant-knowledge/entities/reservation.ts';
import type {
  PreorderLine,
  ReservationActionPort,
  ReservationDraftInput,
} from '../ports/reservation-port.ts';

function nextId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * In-memory Reservation Engine used by P8-D Action layer.
 * Integrates with KG `createReservation` entity factory — no P6/P7 writes.
 */
export class ReservationEngine implements ReservationActionPort {
  private readonly byId = new Map<string, Reservation>();

  async create(input: ReservationDraftInput): Promise<Reservation> {
    const id = nextId('res');
    const reservation = createReservation({
      id,
      restaurantId: input.restaurantId,
      date: input.date,
      time: input.time,
      guestCount: input.guestCount,
      salon: input.salon,
      tableIds: input.tableIds || [],
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      notes: input.notes,
      hasPreorder: Boolean(input.hasPreorder),
      status: 'pending',
      metadata: {
        ...(input.metadata || {}),
        campaign: input.campaign,
        guaranteePolicyId: input.guaranteePolicyId,
        guaranteeAmount: input.guaranteeAmount,
        preorder: [] as PreorderLine[],
        engine: 'p8d-reservation-engine',
      },
    });
    this.byId.set(id, reservation);
    return { ...reservation, tableIds: [...(reservation.tableIds || [])] };
  }

  async update(
    reservationId: string,
    patch: Partial<ReservationDraftInput> & { status?: string },
  ): Promise<Reservation> {
    const existing = this.require(reservationId);
    const next: Reservation = {
      ...existing,
      date: patch.date || existing.date,
      time: patch.time || existing.time,
      guestCount: patch.guestCount ?? existing.guestCount,
      salon: patch.salon !== undefined ? patch.salon : existing.salon,
      tableIds: patch.tableIds ? [...patch.tableIds] : [...(existing.tableIds || [])],
      customerName:
        patch.customerName !== undefined ? patch.customerName : existing.customerName,
      customerPhone:
        patch.customerPhone !== undefined ? patch.customerPhone : existing.customerPhone,
      notes: patch.notes !== undefined ? patch.notes : existing.notes,
      hasPreorder:
        patch.hasPreorder !== undefined ? patch.hasPreorder : existing.hasPreorder,
      status: patch.status || existing.status,
      metadata: {
        ...(existing.metadata || {}),
        ...(patch.metadata || {}),
        campaign:
          patch.campaign !== undefined
            ? patch.campaign
            : (existing.metadata?.campaign as string | undefined),
        guaranteePolicyId:
          patch.guaranteePolicyId !== undefined
            ? patch.guaranteePolicyId
            : existing.metadata?.guaranteePolicyId,
        guaranteeAmount:
          patch.guaranteeAmount !== undefined
            ? patch.guaranteeAmount
            : existing.metadata?.guaranteeAmount,
      },
    };
    this.byId.set(reservationId, next);
    return { ...next, tableIds: [...(next.tableIds || [])] };
  }

  async get(reservationId: string): Promise<Reservation | null> {
    const found = this.byId.get(reservationId);
    return found ? { ...found, tableIds: [...(found.tableIds || [])] } : null;
  }

  async assignTable(reservationId: string, tableId: string): Promise<Reservation> {
    const existing = this.require(reservationId);
    const next: Reservation = {
      ...existing,
      tableIds: [tableId],
      metadata: {
        ...(existing.metadata || {}),
        previousTableIds: existing.tableIds || [],
      },
    };
    this.byId.set(reservationId, next);
    return { ...next, tableIds: [...(next.tableIds || [])] };
  }

  async setPreorder(reservationId: string, lines: PreorderLine[]): Promise<Reservation> {
    const existing = this.require(reservationId);
    const next: Reservation = {
      ...existing,
      hasPreorder: lines.length > 0,
      metadata: {
        ...(existing.metadata || {}),
        previousPreorder: existing.metadata?.preorder,
        preorder: lines.map((l) => ({ ...l })),
      },
    };
    this.byId.set(reservationId, next);
    return { ...next, tableIds: [...(next.tableIds || [])] };
  }

  async applyGuarantee(
    reservationId: string,
    policy: { policyId: string; amount: number; currency?: string },
  ): Promise<Reservation> {
    const existing = this.require(reservationId);
    const next: Reservation = {
      ...existing,
      metadata: {
        ...(existing.metadata || {}),
        previousGuarantee: {
          policyId: existing.metadata?.guaranteePolicyId,
          amount: existing.metadata?.guaranteeAmount,
        },
        guaranteePolicyId: policy.policyId,
        guaranteeAmount: policy.amount,
        guaranteeCurrency: policy.currency || 'TRY',
        /** Explicit: no live provision / charge in P8-D. */
        guaranteeProvisioned: false,
      },
    };
    this.byId.set(reservationId, next);
    return { ...next, tableIds: [...(next.tableIds || [])] };
  }

  async cancel(reservationId: string, reason?: string): Promise<Reservation | null> {
    const existing = this.byId.get(reservationId);
    if (!existing) return null;
    const next: Reservation = {
      ...existing,
      status: 'cancelled',
      metadata: {
        ...(existing.metadata || {}),
        cancelReason: reason || 'rollback',
      },
    };
    this.byId.set(reservationId, next);
    return { ...next, tableIds: [...(next.tableIds || [])] };
  }

  async list(restaurantId: string): Promise<Reservation[]> {
    return [...this.byId.values()]
      .filter((r) => r.restaurantId === restaurantId)
      .map((r) => ({ ...r, tableIds: [...(r.tableIds || [])] }));
  }

  private require(reservationId: string): Reservation {
    const found = this.byId.get(reservationId);
    if (!found) {
      throw new Error(`Reservation not found: ${reservationId}`);
    }
    return found;
  }
}
