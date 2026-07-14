export const PAYMENT_STATUSES = [
  'pending',
  'authorized',
  'captured',
  'released',
  'refunded',
  'cancelled',
  'expired',
  'failed',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  authorized: 'Authorized',
  captured: 'Captured',
  released: 'Released',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
  expired: 'Expired',
  failed: 'Failed',
};

export const PAYMENT_PROVIDERS = ['stripe', 'iyzico', 'paytr', 'mock'] as const;
export type PaymentProviderCode = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProviderCode, string> = {
  stripe: 'Stripe',
  iyzico: 'iyzico',
  paytr: 'PayTR',
  mock: 'Mock',
};

export type PaymentDatePreset = 'today' | 'week' | 'month' | 'all';

export const PAYMENT_DATE_PRESETS: { id: PaymentDatePreset; label: string }[] = [
  { id: 'today', label: 'Bugün' },
  { id: 'week', label: 'Bu hafta' },
  { id: 'month', label: 'Bu ay' },
  { id: 'all', label: 'Tümü' },
];

export function getPaymentStatusLabel(status: string): string {
  if ((PAYMENT_STATUSES as readonly string[]).includes(status)) {
    return PAYMENT_STATUS_LABELS[status as PaymentStatus];
  }
  return status || '—';
}

export function getPaymentProviderLabel(code: string): string {
  if ((PAYMENT_PROVIDERS as readonly string[]).includes(code)) {
    return PAYMENT_PROVIDER_LABELS[code as PaymentProviderCode];
  }
  return code || '—';
}

export function paymentStatusTone(status: string): string {
  switch (status) {
    case 'captured':
    case 'authorized':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'pending':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'refunded':
    case 'released':
      return 'bg-sky-500/10 text-sky-600 dark:text-sky-400';
    case 'failed':
    case 'expired':
    case 'cancelled':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    default:
      return 'bg-primary/10 text-primary';
  }
}
