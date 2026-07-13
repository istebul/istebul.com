export const ORDER_STATUSES = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'delivering',
  'completed',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Aktif sipariş: yeni + hazırlanıyor */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['pending', 'preparing'];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Yeni',
  accepted: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  ready: 'Hazır',
  delivering: 'Teslimatta',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

export function getOrderStatusLabel(status: string): string {
  const key = String(status || '').trim().toLowerCase();
  return ORDER_STATUS_LABELS[key] || key || '—';
}

export function normalizeOrderStatus(status: string): OrderStatus {
  const key = String(status || '').trim().toLowerCase();
  return (ORDER_STATUSES.includes(key as OrderStatus) ? key : 'pending') as OrderStatus;
}
