import type { ActionHandler, ActionHandlerDeps } from './types.ts';
import type { ActionCompensation, ActionRequest, ActionResult } from '../types.ts';

export const ReservationAction: ActionHandler = {
  id: 'create_reservation',
  family: 'reservation',
  displayName: 'ReservationAction',

  async execute(request: ActionRequest, deps: ActionHandlerDeps): Promise<ActionResult> {
    const { payload } = request;
    const actionId =
      request.actionId === 'update_reservation'
        ? 'update_reservation'
        : 'create_reservation';

    if (actionId === 'update_reservation') {
      if (!payload.reservationId) {
        return fail(actionId, 'reservationId gerekli', 'MISSING_RESERVATION_ID');
      }
      const existing = await deps.reservations.get(payload.reservationId);
      if (!existing) {
        return fail(actionId, 'Rezervasyon bulunamadı', 'NOT_FOUND');
      }
      const validation = await deps.validator.validateReservationDraft({
        ...payload,
        date: payload.date || existing.date,
        time: payload.time || existing.time,
        partySize: payload.partySize || existing.guestCount,
        tableId: payload.tableId || existing.tableIds?.[0],
      });
      if (!validation.ok) {
        return fail(
          actionId,
          validation.errors.join('; '),
          'KNOWLEDGE_VALIDATION',
          validation.errors,
        );
      }
      const updated = await deps.reservations.update(payload.reservationId, {
        date: payload.date,
        time: payload.time,
        guestCount: payload.partySize,
        salon: payload.salon,
        tableIds: payload.tableId ? [payload.tableId] : undefined,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        notes: payload.notes,
        campaign: payload.campaign,
      });
      return ok(actionId, 'Rezervasyon güncellendi', updated.id, {
        reservation: updated,
        compensation: {
          actionId,
          reservationId: updated.id,
          previous: {
            date: existing.date,
            time: existing.time,
            guestCount: existing.guestCount,
            salon: existing.salon,
            tableIds: existing.tableIds,
          },
        } satisfies ActionCompensation,
      });
    }

    const validation = await deps.validator.validateReservationDraft(payload);
    if (!validation.ok) {
      return fail(
        actionId,
        validation.errors.join('; '),
        'KNOWLEDGE_VALIDATION',
        validation.errors,
      );
    }

    const created = await deps.reservations.create({
      restaurantId: payload.restaurantId,
      date: payload.date!,
      time: payload.time!,
      guestCount: payload.partySize!,
      salon: payload.salon,
      tableIds: payload.tableId ? [payload.tableId] : [],
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      notes: payload.notes,
      hasPreorder: Boolean(payload.preorder?.length),
      campaign: payload.campaign,
      guaranteePolicyId: payload.guaranteePolicyId,
      guaranteeAmount: payload.guaranteeAmount,
    });

    return ok(actionId, 'Rezervasyon oluşturuldu', created.id, {
      reservation: created,
      compensation: {
        actionId,
        reservationId: created.id,
      } satisfies ActionCompensation,
    });
  },

  async rollback(compensation, deps): Promise<ActionResult> {
    if (!compensation.reservationId) {
      return fail('create_reservation', 'Rollback için reservationId yok', 'ROLLBACK_NO_ID');
    }
    if (compensation.previous) {
      const restored = await deps.reservations.update(compensation.reservationId, {
        date: compensation.previous.date as string | undefined,
        time: compensation.previous.time as string | undefined,
        guestCount: compensation.previous.guestCount as number | undefined,
        salon: compensation.previous.salon as string | undefined,
        tableIds: compensation.previous.tableIds as string[] | undefined,
      });
      return {
        ok: true,
        status: 'rolled_back',
        actionId: 'update_reservation',
        family: 'reservation',
        message: 'Rezervasyon güncellemesi geri alındı',
        reservationId: restored.id,
        rolledBack: true,
        data: { reservation: restored },
      };
    }
    const cancelled = await deps.reservations.cancel(
      compensation.reservationId,
      'action_rollback',
    );
    return {
      ok: true,
      status: 'rolled_back',
      actionId: 'create_reservation',
      family: 'reservation',
      message: 'Rezervasyon iptal edilerek geri alındı',
      reservationId: compensation.reservationId,
      rolledBack: true,
      data: { reservation: cancelled },
    };
  },
};

/** Sibling handler for update_reservation id registration. */
export const UpdateReservationAction: ActionHandler = {
  ...ReservationAction,
  id: 'update_reservation',
  displayName: 'ReservationAction(update)',
};

function ok(
  actionId: ActionResult['actionId'],
  message: string,
  reservationId: string,
  data: Record<string, unknown>,
): ActionResult {
  return {
    ok: true,
    status: 'ok',
    actionId,
    family: 'reservation',
    message,
    reservationId,
    data,
  };
}

function fail(
  actionId: ActionResult['actionId'],
  message: string,
  errorCode: string,
  validationErrors?: string[],
): ActionResult {
  return {
    ok: false,
    status: 'rejected',
    actionId,
    family: 'reservation',
    message,
    errorCode,
    validationErrors,
  };
}
