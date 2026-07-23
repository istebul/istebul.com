import type { ActionHandler } from './types.ts';
import type { ActionResult } from '../types.ts';

async function executeTable(
  request: Parameters<ActionHandler['execute']>[0],
  deps: Parameters<ActionHandler['execute']>[1],
): Promise<ActionResult> {
  const actionId = request.actionId;
  const { payload } = request;

  if (!payload.reservationId) {
    return {
      ok: false,
      status: 'rejected',
      actionId,
      family: 'table_assignment',
      message: 'reservationId gerekli',
      errorCode: 'MISSING_RESERVATION_ID',
    };
  }
  if (!payload.tableId) {
    return {
      ok: false,
      status: 'rejected',
      actionId,
      family: 'table_assignment',
      message: 'tableId gerekli',
      errorCode: 'MISSING_TABLE_ID',
    };
  }

  const existing = await deps.reservations.get(payload.reservationId);
  if (!existing) {
    return {
      ok: false,
      status: 'failed',
      actionId,
      family: 'table_assignment',
      message: 'Rezervasyon bulunamadı',
      errorCode: 'NOT_FOUND',
    };
  }

  const validation = await deps.validator.validateTableAction({
    ...payload,
    date: payload.date || existing.date,
    partySize: payload.partySize || existing.guestCount,
  });
  if (!validation.ok) {
    return {
      ok: false,
      status: 'rejected',
      actionId,
      family: 'table_assignment',
      message: validation.errors.join('; '),
      errorCode: 'TABLE_UNAVAILABLE',
      validationErrors: validation.errors,
    };
  }

  const previousTableId = existing.tableIds?.[0];
  const updated = await deps.reservations.assignTable(
    payload.reservationId,
    payload.tableId,
  );

  return {
    ok: true,
    status: 'ok',
    actionId,
    family: 'table_assignment',
    message:
      actionId === 'change_table'
        ? `Masa değiştirildi → ${payload.tableId}`
        : `Masa atandı → ${payload.tableId}`,
    reservationId: updated.id,
    data: {
      reservation: updated,
      previousTableId,
      compensation: {
        actionId,
        reservationId: updated.id,
        previous: { tableId: previousTableId },
      },
    },
  };
}

export const AssignTableAction: ActionHandler = {
  id: 'assign_table',
  family: 'table_assignment',
  displayName: 'TableAssignmentAction',
  execute: executeTable,
  async rollback(compensation, deps) {
    const prev = compensation.previous?.tableId as string | undefined;
    if (!compensation.reservationId || !prev) {
      return {
        ok: true,
        status: 'rolled_back',
        actionId: 'assign_table',
        family: 'table_assignment',
        message: 'Önceki masa yok — atama temizlendi',
        reservationId: compensation.reservationId,
        rolledBack: true,
      };
    }
    const restored = await deps.reservations.assignTable(
      compensation.reservationId,
      prev,
    );
    return {
      ok: true,
      status: 'rolled_back',
      actionId: 'assign_table',
      family: 'table_assignment',
      message: `Masa ataması geri alındı → ${prev}`,
      reservationId: restored.id,
      rolledBack: true,
      data: { reservation: restored },
    };
  },
};

export const ChangeTableAction: ActionHandler = {
  ...AssignTableAction,
  id: 'change_table',
  displayName: 'TableAssignmentAction(change)',
};
