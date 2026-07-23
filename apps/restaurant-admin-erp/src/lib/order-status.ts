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
  completed: 'Teslim Edildi',
  cancelled: 'İptal',
};

export const ERP_STATUS_FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed'];

export const ERP_ORDER_FILTERS = [
  { id: 'all', label: 'Tümü', status: null },
  { id: 'pending', label: 'Yeni', status: 'pending' },
  { id: 'preparing', label: 'Hazırlanıyor', status: 'preparing' },
  { id: 'ready', label: 'Hazır', status: 'ready' },
  { id: 'completed', label: 'Teslim Edildi', status: 'completed' },
  { id: 'cancelled', label: 'İptal', status: 'cancelled' },
] as const;

export type ErpOrderFilterId = (typeof ERP_ORDER_FILTERS)[number]['id'];

export function getOrderStatusLabel(status: string): string {
  const key = String(status || '').trim().toLowerCase();
  return ORDER_STATUS_LABELS[key] || key || '—';
}

export function normalizeOrderStatus(status: string): OrderStatus {
  const key = String(status || '').trim().toLowerCase();
  return (ORDER_STATUSES.includes(key as OrderStatus) ? key : 'pending') as OrderStatus;
}

export function getOrderChannelLabel(source: string): string {
  const key = String(source || '').trim().toLowerCase();
  if (key === 'whatsapp') return 'WhatsApp';
  if (key === 'qr') return 'QR';
  return 'Garson';
}

export function getNextErpStatus(current: string): OrderStatus | null {
  const normalized = normalizeOrderStatus(current);
  const index = ERP_STATUS_FLOW.indexOf(normalized);
  if (index < 0 || index >= ERP_STATUS_FLOW.length - 1) return null;
  return ERP_STATUS_FLOW[index + 1];
}

export function canCancelOrder(status: string): boolean {
  const normalized = normalizeOrderStatus(status);
  return normalized !== 'completed' && normalized !== 'cancelled';
}

export function getErpActionStatuses(current: string): OrderStatus[] {
  const actions: OrderStatus[] = [];
  const next = getNextErpStatus(current);
  if (next) actions.push(next);
  if (canCancelOrder(current)) actions.push('cancelled');
  return actions;
}
