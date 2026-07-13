import type { SupabaseClient } from '@supabase/supabase-js';
import { formatCurrencyTry } from '@/lib/format';

export class ReservationsDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReservationsDataError';
  }
}

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type DatePreset = 'today' | 'tomorrow' | 'week' | 'all';

export interface RestaurantTableRow {
  id: string;
  name: string;
  salon: string;
  capacity: number;
}

export interface ReservationGuaranteeInfo {
  amount: number;
  amountLabel: string;
  status: string;
  statusLabel: string;
  paymentId: string | null;
  refundStatus: string;
  refundStatusLabel: string;
  policy: string | null;
}

export interface ReservationListItem {
  id: string;
  time: string;
  date: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  guestCount: number;
  salon: string;
  tableName: string;
  status: ReservationStatus;
  statusLabel: string;
  guarantee: ReservationGuaranteeInfo | null;
  hasPreorder: boolean;
  notes: string | null;
  specialRequests: string | null;
  noShow: boolean;
  arrivalStatus: string;
  checkInTime: string | null;
  cancelReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ReservationsKpis {
  todayTotal: number;
  pending: number;
  confirmed: number;
  noShow: number;
  occupancyRate: number;
  occupancyLabel: string;
}

export interface ReservationsPageData {
  rows: ReservationListItem[];
  tables: RestaurantTableRow[];
  salons: string[];
  kpis: ReservationsKpis;
}

interface ReservationDbRow {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  date: string;
  time: string;
  guest_count: number;
  status: string;
  notes: string | null;
  special_requests: string | null;
  salon: string | null;
  has_preorder: boolean | null;
  no_show: boolean | null;
  arrival_status: string | null;
  check_in_time: string | null;
  cancel_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
  reservation_tables:
    | {
        table_id: string;
        restaurant_tables: { id: string; name: string; salon: string } | { id: string; name: string; salon: string }[] | null;
      }[]
    | null;
  reservation_guarantees:
    | {
        reservation_guarantee_amount: number | null;
        reservation_guarantee_status: string | null;
        reservation_guarantee_payment_id: string | null;
        reservation_guarantee_refund_status: string | null;
        reservation_guarantee_policy: string | null;
      }
    | {
        reservation_guarantee_amount: number | null;
        reservation_guarantee_status: string | null;
        reservation_guarantee_payment_id: string | null;
        reservation_guarantee_refund_status: string | null;
        reservation_guarantee_policy: string | null;
      }[]
    | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekleyen',
  confirmed: 'Onaylanan',
  seated: 'Oturdu',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  no_show: 'No-show',
};

const GUARANTEE_STATUS_LABELS: Record<string, string> = {
  none: 'Yok',
  pending: 'Bekliyor',
  authorized: 'Provizyon',
  captured: 'Tahsil',
  released: 'Serbest',
  failed: 'Başarısız',
};

const REFUND_STATUS_LABELS: Record<string, string> = {
  none: 'Yok',
  pending: 'Bekliyor',
  refunded: 'İade',
  partial: 'Kısmi',
  failed: 'Başarısız',
};

function requireClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) throw new ReservationsDataError('Supabase bağlantısı yapılandırılmamış.');
  return client;
}

function requireRestaurantId(restaurantId: string): string {
  const value = String(restaurantId || '').trim();
  if (!value) throw new ReservationsDataError('Restoran kimliği gerekli.');
  return value;
}

function toNumber(value: number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDateRangeForPreset(preset: DatePreset): { start: string | null; end: string | null } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preset === 'all') return { start: null, end: null };

  if (preset === 'today') {
    const value = formatLocalDate(today);
    return { start: value, end: value };
  }

  if (preset === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const value = formatLocalDate(tomorrow);
    return { start: value, end: value };
  }

  const end = new Date(today);
  end.setDate(end.getDate() + 6);
  return { start: formatLocalDate(today), end: formatLocalDate(end) };
}

export function getReservationStatusLabel(status: string): string {
  return STATUS_LABELS[String(status || '').toLowerCase()] || status || '—';
}

function mapGuarantee(
  raw: ReservationDbRow['reservation_guarantees'],
): ReservationGuaranteeInfo | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row) return null;

  const status = String(row.reservation_guarantee_status || 'none');
  const refundStatus = String(row.reservation_guarantee_refund_status || 'none');
  const amount = toNumber(row.reservation_guarantee_amount);

  return {
    amount,
    amountLabel: formatCurrencyTry(amount),
    status,
    statusLabel: GUARANTEE_STATUS_LABELS[status] || status,
    paymentId: row.reservation_guarantee_payment_id,
    refundStatus,
    refundStatusLabel: REFUND_STATUS_LABELS[refundStatus] || refundStatus,
    policy: row.reservation_guarantee_policy,
  };
}

function mapTableInfo(row: ReservationDbRow): { salon: string; tableName: string } {
  const links = Array.isArray(row.reservation_tables) ? row.reservation_tables : [];
  const names: string[] = [];
  let salon = String(row.salon || '').trim();

  for (const link of links) {
    const table = Array.isArray(link.restaurant_tables)
      ? link.restaurant_tables[0]
      : link.restaurant_tables;
    if (table?.name) names.push(table.name);
    if (!salon && table?.salon) salon = table.salon;
  }

  return {
    salon: salon || '—',
    tableName: names.length ? names.join(', ') : '—',
  };
}

function mapReservation(row: ReservationDbRow): ReservationListItem {
  const { salon, tableName } = mapTableInfo(row);
  const status = String(row.status || 'pending').toLowerCase() as ReservationStatus;

  return {
    id: row.id,
    time: String(row.time || '—'),
    date: String(row.date || ''),
    customerName: row.customer_name,
    phone: row.customer_phone,
    email: row.customer_email,
    guestCount: Number(row.guest_count || 1),
    salon,
    tableName,
    status,
    statusLabel: getReservationStatusLabel(status),
    guarantee: mapGuarantee(row.reservation_guarantees),
    hasPreorder: Boolean(row.has_preorder),
    notes: row.notes,
    specialRequests: row.special_requests,
    noShow: Boolean(row.no_show) || status === 'no_show',
    arrivalStatus: String(row.arrival_status || 'expected'),
    checkInTime: row.check_in_time,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchReservationsPageData(
  client: SupabaseClient | null,
  restaurantId: string,
  options: {
    datePreset?: DatePreset;
    status?: string | null;
    salon?: string | null;
    tableId?: string | null;
    guestCount?: number | null;
    search?: string;
  } = {},
): Promise<ReservationsPageData> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  const preset = options.datePreset || 'today';
  const { start, end } = getDateRangeForPreset(preset);
  const today = formatLocalDate(new Date());

  let reservationsQuery = db
    .from('reservations')
    .select(
      `
      id, customer_name, customer_phone, customer_email, date, time, guest_count, status,
      notes, special_requests, salon, has_preorder, no_show, arrival_status, check_in_time,
      cancel_reason, created_at, updated_at,
      reservation_tables(table_id, restaurant_tables(id, name, salon)),
      reservation_guarantees(
        reservation_guarantee_amount,
        reservation_guarantee_status,
        reservation_guarantee_payment_id,
        reservation_guarantee_refund_status,
        reservation_guarantee_policy
      )
    `,
    )
    .eq('restaurant_id', tenantId)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (start && end) {
    reservationsQuery = reservationsQuery.gte('date', start).lte('date', end);
  }

  if (options.status) {
    reservationsQuery = reservationsQuery.eq('status', options.status);
  }

  if (options.guestCount && options.guestCount > 0) {
    reservationsQuery = reservationsQuery.eq('guest_count', options.guestCount);
  }

  const [reservationsResult, tablesResult, todayResult] = await Promise.all([
    reservationsQuery,
    db
      .from('restaurant_tables')
      .select('id, name, salon, capacity')
      .eq('restaurant_id', tenantId)
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    db
      .from('reservations')
      .select('id, status, no_show')
      .eq('restaurant_id', tenantId)
      .eq('date', today),
  ]);

  if (reservationsResult.error) {
    throw new ReservationsDataError(
      reservationsResult.error.message || 'Rezervasyonlar yüklenemedi.',
    );
  }
  if (tablesResult.error) {
    throw new ReservationsDataError(tablesResult.error.message || 'Masalar yüklenemedi.');
  }
  if (todayResult.error) {
    throw new ReservationsDataError(todayResult.error.message || 'KPI verileri yüklenemedi.');
  }

  let rows = ((reservationsResult.data || []) as ReservationDbRow[]).map(mapReservation);

  if (options.salon) {
    rows = rows.filter((row) => row.salon === options.salon);
  }

  if (options.tableId) {
    const tableId = options.tableId;
    rows = rows.filter((row) => {
      const raw = (reservationsResult.data || []).find((item) => item.id === row.id) as
        | ReservationDbRow
        | undefined;
      const links = Array.isArray(raw?.reservation_tables) ? raw.reservation_tables : [];
      return links.some((link) => String(link.table_id) === tableId);
    });
  }

  const search = String(options.search || '').trim().toLowerCase();
  if (search) {
    rows = rows.filter((row) => {
      return (
        row.customerName.toLowerCase().includes(search) ||
        (row.phone || '').toLowerCase().includes(search) ||
        (row.email || '').toLowerCase().includes(search) ||
        row.tableName.toLowerCase().includes(search) ||
        row.notes?.toLowerCase().includes(search)
      );
    });
  }

  const tables: RestaurantTableRow[] = (tablesResult.data || []).map((row) => ({
    id: String((row as { id: string }).id),
    name: String((row as { name: string }).name),
    salon: String((row as { salon: string }).salon || 'Ana Salon'),
    capacity: Number((row as { capacity: number }).capacity || 2),
  }));

  const salons = [...new Set(tables.map((table) => table.salon).filter(Boolean))].sort();

  const todayRows = todayResult.data || [];
  const todayTotal = todayRows.length;
  const pending = todayRows.filter((row) => String((row as { status: string }).status) === 'pending').length;
  const confirmed = todayRows.filter((row) => {
    const status = String((row as { status: string }).status);
    return status === 'confirmed' || status === 'seated';
  }).length;
  const noShow = todayRows.filter((row) => {
    const record = row as { status: string; no_show?: boolean };
    return record.status === 'no_show' || Boolean(record.no_show);
  }).length;

  const occupying = confirmed;
  const capacity = Math.max(tables.length, 1);
  const occupancyRate = Math.min(100, Math.round((occupying / capacity) * 100));

  return {
    rows,
    tables,
    salons,
    kpis: {
      todayTotal,
      pending,
      confirmed,
      noShow,
      occupancyRate,
      occupancyLabel: `%${occupancyRate}`,
    },
  };
}
