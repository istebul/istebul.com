import type { SupabaseClient } from '@supabase/supabase-js';
import { formatCurrencyTry, getTodayBounds } from '@/lib/format';
import {
  getPaymentProviderLabel,
  getPaymentStatusLabel,
  type PaymentDatePreset,
  type PaymentProviderCode,
  type PaymentStatus,
} from '@/lib/payment-status';
import { prepareSettlementPreview, type SettlementPreview } from '@/lib/payments';

export class PaymentsDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentsDataError';
  }
}

export interface PaymentKpis {
  todayCapturedLabel: string;
  pendingGuarantee: number;
  authorized: number;
  captureWaiting: number;
  refundWaiting: number;
  noShowCapturedLabel: string;
}

export interface PaymentPolicySettings {
  id: string | null;
  name: string;
  isActive: boolean;
  currency: string;
  fixedGuaranteeEnabled: boolean;
  fixedGuaranteeAmount: number;
  perGuestGuaranteeEnabled: boolean;
  perGuestGuaranteeAmount: number;
  weekendGuaranteeEnabled: boolean;
  weekendGuaranteeAmount: number;
  specialDayGuaranteeEnabled: boolean;
  specialDayGuaranteeAmount: number;
  specialDayDates: string[];
  vipExemptionEnabled: boolean;
  childExemptionEnabled: boolean;
  freeReservationLimit: number;
  cancelDeadlineHours: number;
  noShowPolicy: 'none' | 'capture' | 'partial' | 'fee';
  noShowFeeAmount: number;
  notes: string | null;
}

export interface PaymentProviderRow {
  id: string;
  providerCode: PaymentProviderCode;
  displayName: string;
  isEnabled: boolean;
  isDefault: boolean;
}

export interface PaymentAuditEvent {
  id: string;
  action: string;
  actorType: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
  detailLabel: string;
}

export interface PaymentTransactionListItem {
  id: string;
  customerName: string;
  reservationId: string | null;
  reservationLabel: string;
  phone: string | null;
  provider: PaymentProviderCode | string;
  providerLabel: string;
  amount: number;
  amountLabel: string;
  status: PaymentStatus | string;
  statusLabel: string;
  createdAt: string;
  dateLabel: string;
  restaurantId: string;
  restaurantLabel: string;
}

export interface PaymentTransactionDetail extends PaymentTransactionListItem {
  notes: string | null;
  providerTransactionId: string | null;
  kind: string;
  preorderSummaryLabel: string;
  guaranteeLabel: string;
  settlement: SettlementPreview;
  audit: PaymentAuditEvent[];
  reservation: {
    id: string | null;
    customerName: string;
    phone: string | null;
    guestCount: number | null;
    date: string | null;
    time: string | null;
  };
  customer: {
    name: string;
    phone: string | null;
  };
}

export interface PaymentsPageData {
  kpis: PaymentKpis;
  policy: PaymentPolicySettings;
  providers: PaymentProviderRow[];
  rows: PaymentTransactionListItem[];
  settlementPrep: SettlementPreview;
}

export interface PaymentListFilters {
  datePreset: PaymentDatePreset;
  provider: 'all' | PaymentProviderCode | string;
  status: 'all' | PaymentStatus | string;
  search: string;
}

interface PaymentTransactionDb {
  id: string;
  restaurant_id: string;
  reservation_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  provider_code: string;
  provider_transaction_id: string | null;
  amount: number | string | null;
  currency: string | null;
  status: string;
  kind: string | null;
  notes: string | null;
  preorder_summary: Record<string, unknown> | null;
  settlement_total: number | string | null;
  settlement_guarantee_offset: number | string | null;
  settlement_remaining: number | string | null;
  settlement_refund: number | string | null;
  created_at: string;
  restaurants: { id: string; name: string } | { id: string; name: string }[] | null;
  reservations:
    | {
        id: string;
        customer_name: string;
        customer_phone: string | null;
        guest_count: number | null;
        date: string | null;
        time: string | null;
      }
    | {
        id: string;
        customer_name: string;
        customer_phone: string | null;
        guest_count: number | null;
        date: string | null;
        time: string | null;
      }[]
    | null;
}

interface PaymentPolicyDb {
  id: string;
  name: string;
  is_active: boolean;
  currency: string;
  fixed_guarantee_enabled: boolean;
  fixed_guarantee_amount: number | string;
  per_guest_guarantee_enabled: boolean;
  per_guest_guarantee_amount: number | string;
  weekend_guarantee_enabled: boolean;
  weekend_guarantee_amount: number | string;
  special_day_guarantee_enabled: boolean;
  special_day_guarantee_amount: number | string;
  special_day_dates: unknown;
  vip_exemption_enabled: boolean;
  child_exemption_enabled: boolean;
  free_reservation_limit: number;
  cancel_deadline_hours: number;
  no_show_policy: string;
  no_show_fee_amount: number | string;
  notes: string | null;
}

interface PaymentProviderDb {
  id: string;
  provider_code: string;
  display_name: string;
  is_enabled: boolean;
  is_default: boolean;
}

interface AuditDb {
  id: string;
  action: string;
  actor_type: string;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
  detail: Record<string, unknown> | null;
}

function requireClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) {
    throw new PaymentsDataError('Supabase yapılandırılmamış.');
  }
  return client;
}

function requireTenantId(tenantId: string): string {
  if (!tenantId) {
    throw new PaymentsDataError('restaurant_id zorunludur.');
  }
  return tenantId;
}

function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? Number(value) : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function oneRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function parseSpecialDayDates(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function defaultPolicy(): PaymentPolicySettings {
  return {
    id: null,
    name: 'default',
    isActive: true,
    currency: 'TRY',
    fixedGuaranteeEnabled: false,
    fixedGuaranteeAmount: 0,
    perGuestGuaranteeEnabled: false,
    perGuestGuaranteeAmount: 0,
    weekendGuaranteeEnabled: false,
    weekendGuaranteeAmount: 0,
    specialDayGuaranteeEnabled: false,
    specialDayGuaranteeAmount: 0,
    specialDayDates: [],
    vipExemptionEnabled: false,
    childExemptionEnabled: false,
    freeReservationLimit: 0,
    cancelDeadlineHours: 24,
    noShowPolicy: 'none',
    noShowFeeAmount: 0,
    notes: null,
  };
}

function mapPolicy(row: PaymentPolicyDb | null): PaymentPolicySettings {
  if (!row) return defaultPolicy();
  const noShow = row.no_show_policy;
  return {
    id: row.id,
    name: row.name || 'default',
    isActive: Boolean(row.is_active),
    currency: row.currency || 'TRY',
    fixedGuaranteeEnabled: Boolean(row.fixed_guarantee_enabled),
    fixedGuaranteeAmount: toNumber(row.fixed_guarantee_amount),
    perGuestGuaranteeEnabled: Boolean(row.per_guest_guarantee_enabled),
    perGuestGuaranteeAmount: toNumber(row.per_guest_guarantee_amount),
    weekendGuaranteeEnabled: Boolean(row.weekend_guarantee_enabled),
    weekendGuaranteeAmount: toNumber(row.weekend_guarantee_amount),
    specialDayGuaranteeEnabled: Boolean(row.special_day_guarantee_enabled),
    specialDayGuaranteeAmount: toNumber(row.special_day_guarantee_amount),
    specialDayDates: parseSpecialDayDates(row.special_day_dates),
    vipExemptionEnabled: Boolean(row.vip_exemption_enabled),
    childExemptionEnabled: Boolean(row.child_exemption_enabled),
    freeReservationLimit: Number(row.free_reservation_limit || 0),
    cancelDeadlineHours: Number(row.cancel_deadline_hours || 0),
    noShowPolicy:
      noShow === 'capture' || noShow === 'partial' || noShow === 'fee' ? noShow : 'none',
    noShowFeeAmount: toNumber(row.no_show_fee_amount),
    notes: row.notes,
  };
}

function mapTransaction(row: PaymentTransactionDb): PaymentTransactionListItem {
  const restaurant = oneRelation(row.restaurants);
  const reservation = oneRelation(row.reservations);
  const amount = toNumber(row.amount);
  return {
    id: row.id,
    customerName: row.customer_name || reservation?.customer_name || '—',
    reservationId: row.reservation_id,
    reservationLabel: reservation
      ? `${reservation.date || '—'} ${reservation.time || ''}`.trim()
      : row.reservation_id
        ? row.reservation_id.slice(0, 8)
        : '—',
    phone: row.customer_phone || reservation?.customer_phone || null,
    provider: row.provider_code,
    providerLabel: getPaymentProviderLabel(row.provider_code),
    amount,
    amountLabel: formatCurrencyTry(amount),
    status: row.status,
    statusLabel: getPaymentStatusLabel(row.status),
    createdAt: row.created_at,
    dateLabel: formatDateTime(row.created_at),
    restaurantId: row.restaurant_id,
    restaurantLabel: restaurant?.name || row.restaurant_id.slice(0, 8),
  };
}

function dateRangeForPreset(preset: PaymentDatePreset): { start?: string; end?: string } {
  if (preset === 'all') return {};
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (preset === 'week') {
    start.setDate(start.getDate() - 6);
  } else if (preset === 'month') {
    start.setDate(1);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

function buildKpis(rows: PaymentTransactionDb[]): PaymentKpis {
  const { start, end } = getTodayBounds();
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  let todayCaptured = 0;
  let noShowCaptured = 0;
  let pendingGuarantee = 0;
  let authorized = 0;
  let captureWaiting = 0;

  for (const row of rows) {
    const amount = toNumber(row.amount);
    const created = new Date(row.created_at).getTime();
    const isToday = created >= startMs && created <= endMs;
    const status = row.status;
    const kind = row.kind || 'guarantee';

    if (status === 'captured' && isToday) {
      todayCaptured += amount;
      if (kind === 'noshow') noShowCaptured += amount;
    }
    if (status === 'pending' && kind === 'guarantee') pendingGuarantee += 1;
    if (status === 'authorized') {
      authorized += 1;
      captureWaiting += 1;
    }
  }

  return {
    todayCapturedLabel: formatCurrencyTry(todayCaptured),
    pendingGuarantee,
    authorized,
    captureWaiting,
    refundWaiting: 0,
    noShowCapturedLabel: formatCurrencyTry(noShowCaptured),
  };
}

export async function fetchPaymentsPageData(
  client: SupabaseClient | null,
  tenantId: string,
  filters: PaymentListFilters,
): Promise<PaymentsPageData> {
  const sb = requireClient(client);
  const restaurantId = requireTenantId(tenantId);
  const range = dateRangeForPreset(filters.datePreset);

  let txQuery = sb
    .from('payment_transactions')
    .select(
      `
      id,
      restaurant_id,
      reservation_id,
      customer_name,
      customer_phone,
      provider_code,
      provider_transaction_id,
      amount,
      currency,
      status,
      kind,
      notes,
      preorder_summary,
      settlement_total,
      settlement_guarantee_offset,
      settlement_remaining,
      settlement_refund,
      created_at,
      restaurants:restaurant_id ( id, name ),
      reservations:reservation_id (
        id,
        customer_name,
        customer_phone,
        guest_count,
        date,
        time
      )
    `,
    )
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (range.start) txQuery = txQuery.gte('created_at', range.start);
  if (range.end) txQuery = txQuery.lte('created_at', range.end);
  if (filters.provider !== 'all') txQuery = txQuery.eq('provider_code', filters.provider);
  if (filters.status !== 'all') txQuery = txQuery.eq('status', filters.status);

  const [txResult, policyResult, providersResult, refundPendingResult] = await Promise.all([
    txQuery,
    sb
      .from('payment_policies')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from('payment_providers')
      .select('id, provider_code, display_name, is_enabled, is_default')
      .eq('restaurant_id', restaurantId)
      .order('provider_code', { ascending: true }),
    sb
      .from('refund_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending'),
  ]);

  if (txResult.error) {
    throw new PaymentsDataError(txResult.error.message || 'Ödeme işlemleri yüklenemedi.');
  }
  if (policyResult.error) {
    throw new PaymentsDataError(policyResult.error.message || 'Ödeme politikası yüklenemedi.');
  }
  if (providersResult.error) {
    throw new PaymentsDataError(providersResult.error.message || 'Sağlayıcılar yüklenemedi.');
  }

  const dbRows = (txResult.data || []) as PaymentTransactionDb[];
  const kpis = buildKpis(dbRows);
  kpis.refundWaiting = refundPendingResult.count || 0;

  const search = filters.search.trim().toLocaleLowerCase('tr');
  const rows = dbRows
    .map(mapTransaction)
    .filter((row) => {
      if (!search) return true;
      const haystack = [
        row.customerName,
        row.phone || '',
        row.reservationLabel,
        row.providerLabel,
        row.statusLabel,
        row.restaurantLabel,
        row.id,
      ]
        .join(' ')
        .toLocaleLowerCase('tr');
      return haystack.includes(search);
    });

  const providers = ((providersResult.data || []) as PaymentProviderDb[]).map((row) => ({
    id: row.id,
    providerCode: row.provider_code as PaymentProviderCode,
    displayName: row.display_name,
    isEnabled: Boolean(row.is_enabled),
    isDefault: Boolean(row.is_default),
  }));

  return {
    kpis,
    policy: mapPolicy((policyResult.data as PaymentPolicyDb | null) || null),
    providers,
    rows,
    settlementPrep: prepareSettlementPreview({ currency: 'TRY' }),
  };
}

export async function fetchPaymentTransactionDetail(
  client: SupabaseClient | null,
  tenantId: string,
  transactionId: string,
): Promise<PaymentTransactionDetail> {
  const sb = requireClient(client);
  const restaurantId = requireTenantId(tenantId);

  const { data, error } = await sb
    .from('payment_transactions')
    .select(
      `
      id,
      restaurant_id,
      reservation_id,
      customer_name,
      customer_phone,
      provider_code,
      provider_transaction_id,
      amount,
      currency,
      status,
      kind,
      notes,
      preorder_summary,
      settlement_total,
      settlement_guarantee_offset,
      settlement_remaining,
      settlement_refund,
      created_at,
      restaurants:restaurant_id ( id, name ),
      reservations:reservation_id (
        id,
        customer_name,
        customer_phone,
        guest_count,
        date,
        time
      )
    `,
    )
    .eq('restaurant_id', restaurantId)
    .eq('id', transactionId)
    .maybeSingle();

  if (error) {
    throw new PaymentsDataError(error.message || 'İşlem detayı yüklenemedi.');
  }
  if (!data) {
    throw new PaymentsDataError('İşlem bulunamadı.');
  }

  const row = data as PaymentTransactionDb;
  const base = mapTransaction(row);
  const reservation = oneRelation(row.reservations);

  const { data: auditData, error: auditError } = await sb
    .from('payment_audit_logs')
    .select('id, action, actor_type, from_status, to_status, created_at, detail')
    .eq('restaurant_id', restaurantId)
    .eq('payment_transaction_id', transactionId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (auditError) {
    throw new PaymentsDataError(auditError.message || 'Audit timeline yüklenemedi.');
  }

  const audit = ((auditData || []) as AuditDb[]).map((event) => ({
    id: event.id,
    action: event.action,
    actorType: event.actor_type,
    fromStatus: event.from_status,
    toStatus: event.to_status,
    createdAt: event.created_at,
    detailLabel: event.detail ? JSON.stringify(event.detail) : '—',
  }));

  const preorder = row.preorder_summary || {};
  const preorderItems = Array.isArray(preorder.items) ? preorder.items.length : 0;
  const preorderTotal = toNumber(preorder.total as number | string | null | undefined);

  return {
    ...base,
    notes: row.notes,
    providerTransactionId: row.provider_transaction_id,
    kind: row.kind || 'guarantee',
    preorderSummaryLabel:
      preorderItems > 0 || preorderTotal > 0
        ? `${preorderItems} kalem · ${formatCurrencyTry(preorderTotal)}`
        : 'Ön sipariş yok',
    guaranteeLabel: `${getPaymentStatusLabel(row.status)} · ${formatCurrencyTry(toNumber(row.amount))}`,
    settlement: prepareSettlementPreview({
      currency: row.currency || 'TRY',
      totalBill:
        row.settlement_total === null || row.settlement_total === undefined
          ? null
          : toNumber(row.settlement_total),
      guaranteeOffset:
        row.settlement_guarantee_offset === null ||
        row.settlement_guarantee_offset === undefined
          ? null
          : toNumber(row.settlement_guarantee_offset),
      remainingCollection:
        row.settlement_remaining === null || row.settlement_remaining === undefined
          ? null
          : toNumber(row.settlement_remaining),
      refund:
        row.settlement_refund === null || row.settlement_refund === undefined
          ? null
          : toNumber(row.settlement_refund),
    }),
    audit,
    reservation: {
      id: reservation?.id || row.reservation_id,
      customerName: reservation?.customer_name || base.customerName,
      phone: reservation?.customer_phone || base.phone,
      guestCount: reservation?.guest_count ?? null,
      date: reservation?.date ?? null,
      time: reservation?.time ?? null,
    },
    customer: {
      name: base.customerName,
      phone: base.phone,
    },
  };
}

export async function upsertPaymentPolicy(
  client: SupabaseClient | null,
  tenantId: string,
  policy: PaymentPolicySettings,
): Promise<PaymentPolicySettings> {
  const sb = requireClient(client);
  const restaurantId = requireTenantId(tenantId);

  const payload = {
    restaurant_id: restaurantId,
    name: policy.name || 'default',
    is_active: policy.isActive,
    currency: policy.currency || 'TRY',
    fixed_guarantee_enabled: policy.fixedGuaranteeEnabled,
    fixed_guarantee_amount: policy.fixedGuaranteeAmount,
    per_guest_guarantee_enabled: policy.perGuestGuaranteeEnabled,
    per_guest_guarantee_amount: policy.perGuestGuaranteeAmount,
    weekend_guarantee_enabled: policy.weekendGuaranteeEnabled,
    weekend_guarantee_amount: policy.weekendGuaranteeAmount,
    special_day_guarantee_enabled: policy.specialDayGuaranteeEnabled,
    special_day_guarantee_amount: policy.specialDayGuaranteeAmount,
    special_day_dates: policy.specialDayDates,
    vip_exemption_enabled: policy.vipExemptionEnabled,
    child_exemption_enabled: policy.childExemptionEnabled,
    free_reservation_limit: policy.freeReservationLimit,
    cancel_deadline_hours: policy.cancelDeadlineHours,
    no_show_policy: policy.noShowPolicy,
    no_show_fee_amount: policy.noShowFeeAmount,
    notes: policy.notes,
    updated_at: new Date().toISOString(),
  };

  if (policy.id) {
    const { data, error } = await sb
      .from('payment_policies')
      .update(payload)
      .eq('restaurant_id', restaurantId)
      .eq('id', policy.id)
      .select('*')
      .maybeSingle();
    if (error) throw new PaymentsDataError(error.message || 'Politika güncellenemedi.');
    return mapPolicy((data as PaymentPolicyDb | null) || null);
  }

  const { data, error } = await sb
    .from('payment_policies')
    .insert(payload)
    .select('*')
    .maybeSingle();
  if (error) throw new PaymentsDataError(error.message || 'Politika kaydedilemedi.');
  return mapPolicy((data as PaymentPolicyDb | null) || null);
}
