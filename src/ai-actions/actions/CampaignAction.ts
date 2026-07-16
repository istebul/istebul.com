import type { ActionHandler } from './types.ts';

export const CampaignAction: ActionHandler = {
  id: 'apply_campaign',
  family: 'campaign',
  displayName: 'CampaignAction',

  async execute(request, deps) {
    const { payload } = request;
    if (!payload.reservationId) {
      return {
        ok: false,
        status: 'rejected',
        actionId: 'apply_campaign',
        family: 'campaign',
        message: 'reservationId gerekli',
        errorCode: 'MISSING_RESERVATION_ID',
      };
    }

    const snapshot = await deps.knowledge.getSnapshotData(payload.restaurantId);
    const campaign =
      snapshot.campaigns.find(
        (c) =>
          c.active !== false &&
          (payload.campaign
            ? c.name.toLowerCase() === payload.campaign.toLowerCase() ||
              c.id === payload.campaign
            : true),
      ) || snapshot.campaigns.find((c) => c.active !== false);

    if (!campaign) {
      return {
        ok: false,
        status: 'rejected',
        actionId: 'apply_campaign',
        family: 'campaign',
        message: 'Uygulanabilir kampanya yok',
        errorCode: 'NO_CAMPAIGN',
      };
    }

    const existing = await deps.reservations.get(payload.reservationId);
    if (!existing) {
      return {
        ok: false,
        status: 'failed',
        actionId: 'apply_campaign',
        family: 'campaign',
        message: 'Rezervasyon bulunamadı',
        errorCode: 'NOT_FOUND',
      };
    }

    const previousCampaign = existing.metadata?.campaign;
    const updated = await deps.reservations.update(payload.reservationId, {
      campaign: campaign.name,
      metadata: { campaignId: campaign.id },
    });

    return {
      ok: true,
      status: 'ok',
      actionId: 'apply_campaign',
      family: 'campaign',
      message: `Kampanya uygulandı: ${campaign.name}`,
      reservationId: updated.id,
      data: {
        campaign,
        reservation: updated,
        compensation: {
          actionId: 'apply_campaign' as const,
          reservationId: updated.id,
          previous: { campaign: previousCampaign },
        },
      },
    };
  },

  async rollback(compensation, deps) {
    if (!compensation.reservationId) {
      return {
        ok: false,
        status: 'failed',
        actionId: 'apply_campaign',
        family: 'campaign',
        message: 'Rollback için reservationId yok',
        errorCode: 'ROLLBACK_NO_ID',
      };
    }
    const restored = await deps.reservations.update(compensation.reservationId, {
      campaign: (compensation.previous?.campaign as string | undefined) || '',
    });
    return {
      ok: true,
      status: 'rolled_back',
      actionId: 'apply_campaign',
      family: 'campaign',
      message: 'Kampanya geri alındı',
      reservationId: restored.id,
      rolledBack: true,
      data: { reservation: restored },
    };
  },
};
