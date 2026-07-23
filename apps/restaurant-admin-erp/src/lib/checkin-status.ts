/**
 * P7-H Customer Journey / Check-in status helpers.
 * Extensible for AI table suggestion, QR check-in, and preorder handoff.
 */

export type JourneyArrivalStatus =
  | 'expected'
  | 'arrived'
  | 'late'
  | 'no_show'
  | 'cancelled';

export type WaitlistStatus = 'waiting' | 'notified' | 'seated' | 'cancelled' | 'left';

export const ARRIVAL_STATUS_LABELS: Record<string, string> = {
  expected: 'Bekleniyor',
  arrived: 'Check-in',
  late: 'Geç',
  no_show: 'No-show',
  cancelled: 'İptal',
};

export const WAITLIST_STATUS_LABELS: Record<string, string> = {
  waiting: 'Bekliyor',
  notified: 'Bilgilendirildi',
  seated: 'Oturdu',
  cancelled: 'İptal',
  left: 'Ayrıldı',
};

export function getArrivalStatusLabel(status: string): string {
  const key = String(status || '').toLowerCase();
  return ARRIVAL_STATUS_LABELS[key] || status || '—';
}

export function getWaitlistStatusLabel(status: string): string {
  const key = String(status || '').toLowerCase();
  return WAITLIST_STATUS_LABELS[key] || status || '—';
}

/** Grace window (minutes) after reservation time before auto-late label. */
export const LATE_GRACE_MINUTES = 15;

/** Minutes after reservation time before no-show action is highlighted. */
export const NO_SHOW_HINT_MINUTES = 30;
