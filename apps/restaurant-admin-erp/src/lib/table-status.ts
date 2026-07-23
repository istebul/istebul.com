/**
 * P7-G floor-plan table status model.
 * Extensible for AI Reservation / Kitchen / WhatsApp / QR / Preorder joins.
 */

export const TABLE_STATUSES = [
  'empty',
  'reserved',
  'awaiting_checkin',
  'occupied',
  'preparing',
  'serving',
  'awaiting_bill',
  'cleaning',
  'inactive',
] as const;

export type TableStatus = (typeof TABLE_STATUSES)[number];

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  empty: 'Boş',
  reserved: 'Rezerve',
  awaiting_checkin: 'Check-in Bekliyor',
  occupied: 'Dolu',
  preparing: 'Sipariş Hazırlanıyor',
  serving: 'Serviste',
  awaiting_bill: 'Hesap Bekliyor',
  cleaning: 'Temizlikte',
  inactive: 'Pasif',
};

/** Tailwind-friendly color tokens for light/dark cards */
export const TABLE_STATUS_STYLES: Record<
  TableStatus,
  { card: string; badge: string; accent: string }
> = {
  empty: {
    card: 'border-emerald-500/30 bg-emerald-500/5',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    accent: 'bg-emerald-500',
  },
  reserved: {
    card: 'border-sky-500/35 bg-sky-500/5',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    accent: 'bg-sky-500',
  },
  awaiting_checkin: {
    card: 'border-amber-500/40 bg-amber-500/5',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    accent: 'bg-amber-500',
  },
  occupied: {
    card: 'border-rose-500/35 bg-rose-500/5',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    accent: 'bg-rose-500',
  },
  preparing: {
    card: 'border-orange-500/40 bg-orange-500/5',
    badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    accent: 'bg-orange-500',
  },
  serving: {
    card: 'border-violet-500/35 bg-violet-500/5',
    badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    accent: 'bg-violet-500',
  },
  awaiting_bill: {
    card: 'border-fuchsia-500/35 bg-fuchsia-500/5',
    badge: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
    accent: 'bg-fuchsia-500',
  },
  cleaning: {
    card: 'border-slate-400/40 bg-slate-500/5',
    badge: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
    accent: 'bg-slate-500',
  },
  inactive: {
    card: 'border-muted bg-muted/30 opacity-70',
    badge: 'bg-muted text-muted-foreground',
    accent: 'bg-muted-foreground',
  },
};

export function getTableStatusLabel(status: string): string {
  const key = String(status || '').toLowerCase() as TableStatus;
  return TABLE_STATUS_LABELS[key] || status || '—';
}

export function normalizeTableStatus(status: string | null | undefined): TableStatus {
  const key = String(status || '').toLowerCase();
  return (TABLE_STATUSES.includes(key as TableStatus) ? key : 'empty') as TableStatus;
}

export function isOccupiedTableStatus(status: TableStatus): boolean {
  return (
    status === 'occupied' ||
    status === 'preparing' ||
    status === 'serving' ||
    status === 'awaiting_bill'
  );
}
