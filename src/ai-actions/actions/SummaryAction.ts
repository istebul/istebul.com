import type { ActionHandler } from './types.ts';

export const SummaryAction: ActionHandler = {
  id: 'create_reservation_summary',
  family: 'summary',
  displayName: 'SummaryAction',

  async execute(request, deps) {
    const { payload } = request;
    let reservation = null as Awaited<
      ReturnType<typeof deps.reservations.get>
    >;
    if (payload.reservationId) {
      reservation = await deps.reservations.get(payload.reservationId);
    }

    const lines: string[] = [];
    if (reservation) {
      lines.push(`Rezervasyon: ${reservation.id}`);
      lines.push(`Tarih: ${reservation.date}`);
      lines.push(`Saat: ${reservation.time}`);
      lines.push(`Kişi: ${reservation.guestCount}`);
      if (reservation.salon) lines.push(`Salon: ${reservation.salon}`);
      if (reservation.tableIds?.length) {
        lines.push(`Masa: ${reservation.tableIds.join(', ')}`);
      }
      const preorder = reservation.metadata?.preorder as
        | Array<{ name: string; quantity: number }>
        | undefined;
      if (preorder?.length) {
        lines.push(
          `Ön sipariş: ${preorder.map((p) => `${p.quantity}x ${p.name}`).join(', ')}`,
        );
      }
      if (reservation.metadata?.campaign) {
        lines.push(`Kampanya: ${String(reservation.metadata.campaign)}`);
      }
      if (reservation.metadata?.guaranteePolicyId) {
        lines.push(
          `Garanti: ${String(reservation.metadata.guaranteePolicyId)} / ${String(
            reservation.metadata.guaranteeAmount ?? 0,
          )} (provizyon yok)`,
        );
      }
      lines.push(`Durum: ${reservation.status}`);
    } else {
      // Draft summary from payload / memory slots
      if (payload.date) lines.push(`Tarih: ${payload.date}`);
      if (payload.time) lines.push(`Saat: ${payload.time}`);
      if (payload.partySize) lines.push(`Kişi: ${payload.partySize}`);
      if (payload.salon) lines.push(`Salon: ${payload.salon}`);
      if (payload.tableId || payload.tableName) {
        lines.push(`Masa: ${payload.tableName || payload.tableId}`);
      }
      if (payload.preorder?.length) {
        lines.push(
          `Ön sipariş: ${payload.preorder
            .map((p) => `${p.quantity}x ${p.name}`)
            .join(', ')}`,
        );
      }
      if (payload.campaign) lines.push(`Kampanya: ${payload.campaign}`);
      if (!lines.length) {
        return {
          ok: false,
          status: 'rejected',
          actionId: 'create_reservation_summary',
          family: 'summary',
          message: 'Özet için rezervasyon veya taslak veri yok',
          errorCode: 'EMPTY_SUMMARY',
        };
      }
    }

    const summaryText = lines.join('\n');
    return {
      ok: true,
      status: 'ok',
      actionId: 'create_reservation_summary',
      family: 'summary',
      message: 'Rezervasyon özeti oluşturuldu',
      reservationId: reservation?.id || payload.reservationId,
      data: {
        summaryText,
        lines,
        reservation,
      },
    };
  },
};
