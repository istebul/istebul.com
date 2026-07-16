import type { ActionHandler } from './types.ts';
import type { ActionResult } from '../types.ts';

async function executePreorder(
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
      family: 'preorder',
      message: 'reservationId gerekli',
      errorCode: 'MISSING_RESERVATION_ID',
    };
  }
  if (!payload.preorder?.length) {
    return {
      ok: false,
      status: 'rejected',
      actionId,
      family: 'preorder',
      message: 'ön sipariş kalemi gerekli',
      errorCode: 'EMPTY_PREORDER',
    };
  }

  const existing = await deps.reservations.get(payload.reservationId);
  if (!existing) {
    return {
      ok: false,
      status: 'failed',
      actionId,
      family: 'preorder',
      message: 'Rezervasyon bulunamadı',
      errorCode: 'NOT_FOUND',
    };
  }

  // Optional menu name check against Knowledge snapshot (soft warn, hard fail if empty menu)
  const snapshot = await deps.knowledge.getSnapshotData(payload.restaurantId);
  const menuNames = new Set(
    snapshot.menu.items.map((i) => i.name.toLowerCase()),
  );
  const unknown = payload.preorder.filter(
    (line) => line.name && !menuNames.has(line.name.toLowerCase()),
  );
  // Allow unknown names (concierge free-text) but record them
  const previous = (existing.metadata?.preorder as unknown) || [];
  const updated = await deps.reservations.setPreorder(
    payload.reservationId,
    payload.preorder,
  );

  return {
    ok: true,
    status: 'ok',
    actionId,
    family: 'preorder',
    message:
      actionId === 'update_preorder'
        ? 'Ön sipariş güncellendi'
        : 'Ön sipariş oluşturuldu',
    reservationId: updated.id,
    data: {
      reservation: updated,
      unknownMenuItems: unknown.map((u) => u.name),
      compensation: {
        actionId,
        reservationId: updated.id,
        previous: { preorder: previous },
      },
    },
  };
}

export const CreatePreorderAction: ActionHandler = {
  id: 'create_preorder',
  family: 'preorder',
  displayName: 'PreorderAction',
  execute: executePreorder,
  async rollback(compensation, deps) {
    const prev = (compensation.previous?.preorder || []) as Array<{
      name: string;
      quantity: number;
      menuItemId?: string;
    }>;
    if (!compensation.reservationId) {
      return {
        ok: false,
        status: 'failed',
        actionId: 'create_preorder',
        family: 'preorder',
        message: 'Rollback için reservationId yok',
        errorCode: 'ROLLBACK_NO_ID',
      };
    }
    const restored = await deps.reservations.setPreorder(
      compensation.reservationId,
      prev,
    );
    return {
      ok: true,
      status: 'rolled_back',
      actionId: 'create_preorder',
      family: 'preorder',
      message: 'Ön sipariş geri alındı',
      reservationId: restored.id,
      rolledBack: true,
      data: { reservation: restored },
    };
  },
};

export const UpdatePreorderAction: ActionHandler = {
  ...CreatePreorderAction,
  id: 'update_preorder',
  displayName: 'PreorderAction(update)',
};
