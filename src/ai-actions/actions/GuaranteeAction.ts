import type { ActionHandler } from './types.ts';

export const GuaranteeAction: ActionHandler = {
  id: 'apply_guarantee',
  family: 'guarantee',
  displayName: 'GuaranteeAction',

  async execute(request, deps) {
    const { payload } = request;
    if (!payload.reservationId) {
      return {
        ok: false,
        status: 'rejected',
        actionId: 'apply_guarantee',
        family: 'guarantee',
        message: 'reservationId gerekli',
        errorCode: 'MISSING_RESERVATION_ID',
      };
    }

    const existing = await deps.reservations.get(payload.reservationId);
    if (!existing) {
      return {
        ok: false,
        status: 'failed',
        actionId: 'apply_guarantee',
        family: 'guarantee',
        message: 'Rezervasyon bulunamadı',
        errorCode: 'NOT_FOUND',
      };
    }

    const snapshot = await deps.knowledge.getSnapshotData(payload.restaurantId);
    const policy =
      snapshot.paymentPolicies.find(
        (p) =>
          p.active !== false &&
          (payload.guaranteePolicyId
            ? p.id === payload.guaranteePolicyId
            : true),
      ) || snapshot.paymentPolicies[0];

    if (!policy) {
      return {
        ok: false,
        status: 'rejected',
        actionId: 'apply_guarantee',
        family: 'guarantee',
        message: 'Garanti / ödeme politikası bulunamadı',
        errorCode: 'NO_POLICY',
      };
    }

    const amount =
      payload.guaranteeAmount ??
      policy.depositAmount ??
      (policy.depositPercent
        ? Math.round((policy.depositPercent / 100) * 500)
        : 0);

    const previous = {
      policyId: existing.metadata?.guaranteePolicyId,
      amount: existing.metadata?.guaranteeAmount,
    };

    const updated = await deps.reservations.applyGuarantee(payload.reservationId, {
      policyId: policy.id,
      amount,
      currency: policy.currency || 'TRY',
    });

    return {
      ok: true,
      status: 'ok',
      actionId: 'apply_guarantee',
      family: 'guarantee',
      message: `Garanti politikası uygulandı (${policy.name}) — provizyon çekilmedi`,
      reservationId: updated.id,
      data: {
        reservation: updated,
        policy,
        amount,
        provisioned: false,
        compensation: {
          actionId: 'apply_guarantee' as const,
          reservationId: updated.id,
          previous,
        },
      },
    };
  },

  async rollback(compensation, deps) {
    if (!compensation.reservationId) {
      return {
        ok: false,
        status: 'failed',
        actionId: 'apply_guarantee',
        family: 'guarantee',
        message: 'Rollback için reservationId yok',
        errorCode: 'ROLLBACK_NO_ID',
      };
    }
    const prev = compensation.previous || {};
    const restored = await deps.reservations.applyGuarantee(
      compensation.reservationId,
      {
        policyId: String(prev.policyId || ''),
        amount: Number(prev.amount || 0),
      },
    );
    return {
      ok: true,
      status: 'rolled_back',
      actionId: 'apply_guarantee',
      family: 'guarantee',
      message: 'Garanti politikası geri alındı',
      reservationId: restored.id,
      rolledBack: true,
      data: { reservation: restored },
    };
  },
};
