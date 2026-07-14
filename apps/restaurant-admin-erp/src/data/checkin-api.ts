import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getArrivalStatusLabel,
  getWaitlistStatusLabel,
  LATE_GRACE_MINUTES,
  NO_SHOW_HINT_MINUTES,
} from '@/lib/checkin-status';
import { formatCurrencyTry } from '@/lib/format';

export class CheckinDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckinDataError';
  }
}

export interface CheckinTableOption {
  id: string;
  name: string;
  salon: string;
  capacity: number;
  status: string;
  active: boolean;
}

export interface CheckinGuaranteeInfo {
  statusLabel: string;
  amountLabel: string;
}

export interface CheckinJourneyItem {
  id: string;
  time: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  guestCount: number;
  status: string;
  statusLabel: string;
  arrivalStatus: string;
  arrivalLabel: string;
  checkInTime: string | null;
  noShow: boolean;
  isLate: boolean;
  isNoShowHint: boolean;
  hasPreorder: boolean;
  salon: string;
  tableId: string | null;
  tableName: string;
  notes: string | null;
  specialRequests: string | null;
  guarantee: CheckinGuaranteeInfo | null;
  partySource: string;
}

export interface WaitlistItem {
  id: string;
  customerName: string;
  phone: string | null;
  guestCount: number;
  source: string;
  status: string;
  statusLabel: string;
  preferredSalon: string | null;
  assignedTableId: string | null;
  assignedTableName: string | null;
  notes: string | null;
  createdAt: string;
  quotedWaitMinutes: number | null;
}

export interface CheckinKpis {
  todayTotal: number;
  awaitingCheckin: number;
  checkedIn: number;
  queueWaiting: number;
  noShow: number;
  late: number;
}

export interface CheckinPageData {
  reservations: CheckinJourneyItem[];
  waitlist: WaitlistItem[];
  tables: CheckinTableOption[];
  kpis: CheckinKpis;
}

interface ReservationDb {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  date: string;
  time: string;
  guest_count: number;
  status: string;
  arrival_status: string | null;
  check_in_time: string | null;
  no_show: boolean | null;
  has_preorder: boolean | null;
  salon: string | null;
  notes: string | null;
  special_requests: string | null;
  party_source: string | null;
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
      }
    | {
        reservation_guarantee_amount: number | null;
        reservation_guarantee_status: string | null;
      }[]
    | null;
}

interface WaitlistDb {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  guest_count: number;
  source: string;
  status: string;
  preferred_salon: string | null;
  assigned_table_id: string | null;
  notes: string | null;
  created_at: string;
  quoted_wait_minutes: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekleyen',
  confirmed: 'Onaylanan',
  seated: 'Oturdu',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  no_show: 'No-show',
};

const GUARANTEE_LABELS: Record<string, string> = {
  none: 'Yok',
  pending: 'Bekliyor',
  authorized: 'Provizyon',
  captured: 'Tahsil',
  released: 'Serbest',
  failed: 'Başarısız',
};

function requireClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) throw new CheckinDataError('Supabase bağlantısı yapılandırılmamış.');
  return client;
}

function requireRestaurantId(restaurantId: string): string {
  const value = String(restaurantId || '').trim();
  if (!value) throw new CheckinDataError('Restoran kimliği gerekli.');
  return value;
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function minutesFromReservationTime(time: string): number | null {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const now = new Date();
  const target = new Date();
  target.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return Math.round((now.getTime() - target.getTime()) / 60000);
}

function mapGuarantee(raw: ReservationDb['reservation_guarantees']): CheckinGuaranteeInfo | null {
  const row = unwrapOne(raw);
  if (!row) return null;
  const status = String(row.reservation_guarantee_status || 'none');
  const amount = Number(row.reservation_guarantee_amount || 0);
  return {
    statusLabel: GUARANTEE_LABELS[status] || status,
    amountLabel: formatCurrencyTry(Number.isFinite(amount) ? amount : 0),
  };
}

function mapReservation(row: ReservationDb): CheckinJourneyItem {
  const links = Array.isArray(row.reservation_tables) ? row.reservation_tables : [];
  let tableId: string | null = null;
  let tableName = '—';
  let salon = String(row.salon || '').trim();

  for (const link of links) {
    const table = unwrapOne(link.restaurant_tables);
    if (table) {
      tableId = table.id || link.table_id;
      tableName = table.name || tableName;
      if (!salon && table.salon) salon = table.salon;
    } else if (link.table_id && !tableId) {
      tableId = link.table_id;
    }
  }

  const arrivalStatus = String(row.arrival_status || 'expected').toLowerCase();
  const status = String(row.status || 'pending').toLowerCase();
  const noShow = Boolean(row.no_show) || status === 'no_show' || arrivalStatus === 'no_show';
  const elapsed = minutesFromReservationTime(row.time);
  const isLate =
    arrivalStatus === 'late' ||
    (!noShow &&
      arrivalStatus === 'expected' &&
      status !== 'seated' &&
      status !== 'completed' &&
      status !== 'cancelled' &&
      elapsed !== null &&
      elapsed > LATE_GRACE_MINUTES);
  const isNoShowHint =
    !noShow &&
    arrivalStatus === 'expected' &&
    status !== 'seated' &&
    elapsed !== null &&
    elapsed >= NO_SHOW_HINT_MINUTES;

  return {
    id: row.id,
    time: String(row.time || '—'),
    customerName: row.customer_name,
    phone: row.customer_phone,
    email: row.customer_email,
    guestCount: Number(row.guest_count || 1),
    status,
    statusLabel: STATUS_LABELS[status] || status,
    arrivalStatus,
    arrivalLabel: getArrivalStatusLabel(arrivalStatus),
    checkInTime: row.check_in_time,
    noShow,
    isLate,
    isNoShowHint,
    hasPreorder: Boolean(row.has_preorder),
    salon: salon || '—',
    tableId,
    tableName,
    notes: row.notes,
    specialRequests: row.special_requests,
    guarantee: mapGuarantee(row.reservation_guarantees),
    partySource: String(row.party_source || 'reservation'),
  };
}

export async function fetchCheckinPageData(
  client: SupabaseClient | null,
  restaurantId: string,
): Promise<CheckinPageData> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  const today = formatLocalDate(new Date());

  const [reservationsResult, waitlistResult, tablesResult] = await Promise.all([
    db
      .from('reservations')
      .select(
        `
        id, customer_name, customer_phone, customer_email, date, time, guest_count, status,
        arrival_status, check_in_time, no_show, has_preorder, salon, notes, special_requests,
        party_source,
        reservation_tables(table_id, restaurant_tables(id, name, salon)),
        reservation_guarantees(reservation_guarantee_amount, reservation_guarantee_status)
      `,
      )
      .eq('restaurant_id', tenantId)
      .eq('date', today)
      .order('time', { ascending: true }),
    db
      .from('restaurant_waitlist')
      .select(
        `
        id, customer_name, customer_phone, guest_count, source, status, preferred_salon,
        assigned_table_id, notes, created_at, quoted_wait_minutes
      `,
      )
      .eq('restaurant_id', tenantId)
      .in('status', ['waiting', 'notified'])
      .order('created_at', { ascending: true }),
    db
      .from('restaurant_tables')
      .select('id, name, salon, capacity, status, active')
      .eq('restaurant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
  ]);

  if (reservationsResult.error) {
    throw new CheckinDataError(reservationsResult.error.message || 'Rezervasyonlar yüklenemedi.');
  }
  if (waitlistResult.error) {
    throw new CheckinDataError(waitlistResult.error.message || 'Bekleme listesi yüklenemedi.');
  }
  if (tablesResult.error) {
    throw new CheckinDataError(tablesResult.error.message || 'Masalar yüklenemedi.');
  }

  const reservations = ((reservationsResult.data || []) as ReservationDb[]).map(mapReservation);

  const tables: CheckinTableOption[] = (tablesResult.data || []).map((row) => ({
    id: String((row as { id: string }).id),
    name: String((row as { name: string }).name),
    salon: String((row as { salon: string }).salon || 'Ana Salon'),
    capacity: Number((row as { capacity: number }).capacity || 2),
    status: String((row as { status: string }).status || 'empty'),
    active: (row as { active: boolean }).active !== false,
  }));

  const tableNameById = new Map(tables.map((table) => [table.id, table.name]));

  const waitlist: WaitlistItem[] = ((waitlistResult.data || []) as WaitlistDb[]).map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    phone: row.customer_phone,
    guestCount: Number(row.guest_count || 1),
    source: row.source,
    status: row.status,
    statusLabel: getWaitlistStatusLabel(row.status),
    preferredSalon: row.preferred_salon,
    assignedTableId: row.assigned_table_id,
    assignedTableName: row.assigned_table_id
      ? tableNameById.get(row.assigned_table_id) || null
      : null,
    notes: row.notes,
    createdAt: row.created_at,
    quotedWaitMinutes: row.quoted_wait_minutes,
  }));

  const awaitingCheckin = reservations.filter(
    (item) =>
      !item.noShow &&
      item.arrivalStatus === 'expected' &&
      item.status !== 'cancelled' &&
      item.status !== 'completed' &&
      item.status !== 'seated',
  ).length;
  const checkedIn = reservations.filter(
    (item) => item.arrivalStatus === 'arrived' || item.status === 'seated',
  ).length;
  const noShow = reservations.filter((item) => item.noShow).length;
  const late = reservations.filter((item) => item.isLate || item.arrivalStatus === 'late').length;

  return {
    reservations,
    waitlist,
    tables,
    kpis: {
      todayTotal: reservations.length,
      awaitingCheckin,
      checkedIn,
      queueWaiting: waitlist.length,
      noShow,
      late,
    },
  };
}

async function touchReservation(
  db: SupabaseClient,
  restaurantId: string,
  reservationId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await db
    .from('reservations')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', reservationId)
    .eq('restaurant_id', restaurantId);

  if (error) throw new CheckinDataError(error.message || 'Rezervasyon güncellenemedi.');
}

export async function checkInReservation(
  client: SupabaseClient | null,
  restaurantId: string,
  reservationId: string,
): Promise<void> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  await touchReservation(db, tenantId, reservationId, {
    arrival_status: 'arrived',
    check_in_time: new Date().toISOString(),
    status: 'seated',
    no_show: false,
  });
}

export async function markReservationLate(
  client: SupabaseClient | null,
  restaurantId: string,
  reservationId: string,
): Promise<void> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  await touchReservation(db, tenantId, reservationId, {
    arrival_status: 'late',
  });
}

export async function markReservationNoShow(
  client: SupabaseClient | null,
  restaurantId: string,
  reservationId: string,
  cancelReason?: string,
): Promise<void> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  await touchReservation(db, tenantId, reservationId, {
    arrival_status: 'no_show',
    no_show: true,
    status: 'no_show',
    cancel_reason: cancelReason || 'No-show',
  });
}

export async function assignReservationTable(
  client: SupabaseClient | null,
  restaurantId: string,
  reservationId: string,
  tableId: string,
): Promise<void> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  const targetTableId = String(tableId || '').trim();
  if (!targetTableId) throw new CheckinDataError('Masa seçimi gerekli.');

  const table = (
    await db
      .from('restaurant_tables')
      .select('id, salon')
      .eq('restaurant_id', tenantId)
      .eq('id', targetTableId)
      .maybeSingle()
  ).data as { id: string; salon: string } | null;

  if (!table) throw new CheckinDataError('Masa bulunamadı.');

  const { error: deleteError } = await db
    .from('reservation_tables')
    .delete()
    .eq('restaurant_id', tenantId)
    .eq('reservation_id', reservationId);

  if (deleteError) throw new CheckinDataError(deleteError.message || 'Masa bağlantısı temizlenemedi.');

  const { error: insertError } = await db.from('reservation_tables').insert({
    restaurant_id: tenantId,
    reservation_id: reservationId,
    table_id: targetTableId,
  });

  if (insertError) throw new CheckinDataError(insertError.message || 'Masa atanamadı.');

  await touchReservation(db, tenantId, reservationId, {
    salon: table.salon || null,
  });
}

export async function createWalkInParty(
  client: SupabaseClient | null,
  restaurantId: string,
  input: {
    customerName: string;
    phone?: string;
    guestCount: number;
    preferredSalon?: string;
    notes?: string;
    assignToQueue?: boolean;
  },
): Promise<void> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  const name = String(input.customerName || '').trim();
  const guestCount = Number(input.guestCount || 0);
  if (!name) throw new CheckinDataError('Misafir adı gerekli.');
  if (!Number.isFinite(guestCount) || guestCount < 1) {
    throw new CheckinDataError('Kişi sayısı geçersiz.');
  }

  const phone = String(input.phone || '').trim() || null;
  let customerId: string | null = null;

  if (phone) {
    const existing = await db
      .from('customers')
      .select('id')
      .eq('restaurant_id', tenantId)
      .eq('phone', phone)
      .maybeSingle();

    if (existing.data?.id) {
      customerId = String(existing.data.id);
      await db
        .from('customers')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', customerId)
        .eq('restaurant_id', tenantId);
    } else {
      const created = await db
        .from('customers')
        .insert({
          restaurant_id: tenantId,
          name,
          phone,
        })
        .select('id')
        .single();
      if (created.error) throw new CheckinDataError(created.error.message || 'Müşteri oluşturulamadı.');
      customerId = String(created.data.id);
    }
  }

  const { error } = await db.from('restaurant_waitlist').insert({
    restaurant_id: tenantId,
    customer_id: customerId,
    customer_name: name,
    customer_phone: phone,
    guest_count: guestCount,
    source: input.assignToQueue === false ? 'walk_in' : 'walk_in',
    status: 'waiting',
    preferred_salon: String(input.preferredSalon || '').trim() || null,
    notes: String(input.notes || '').trim() || null,
  });

  if (error) throw new CheckinDataError(error.message || 'Walk-in kaydı oluşturulamadı.');
}

export async function seatWaitlistEntry(
  client: SupabaseClient | null,
  restaurantId: string,
  waitlistId: string,
  tableId: string,
): Promise<void> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  const entryId = String(waitlistId || '').trim();
  const targetTableId = String(tableId || '').trim();
  if (!entryId) throw new CheckinDataError('Kuyruk kaydı gerekli.');
  if (!targetTableId) throw new CheckinDataError('Masa seçimi gerekli.');

  const entryResult = await db
    .from('restaurant_waitlist')
    .select('id, customer_name, customer_phone, guest_count, notes, preferred_salon')
    .eq('restaurant_id', tenantId)
    .eq('id', entryId)
    .maybeSingle();

  if (entryResult.error || !entryResult.data) {
    throw new CheckinDataError(entryResult.error?.message || 'Kuyruk kaydı bulunamadı.');
  }

  const entry = entryResult.data as {
    customer_name: string;
    customer_phone: string | null;
    guest_count: number;
    notes: string | null;
    preferred_salon: string | null;
  };

  const table = (
    await db
      .from('restaurant_tables')
      .select('id, salon, name')
      .eq('restaurant_id', tenantId)
      .eq('id', targetTableId)
      .maybeSingle()
  ).data as { id: string; salon: string; name: string } | null;

  if (!table) throw new CheckinDataError('Masa bulunamadı.');

  const today = formatLocalDate(new Date());
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const reservationInsert = await db
    .from('reservations')
    .insert({
      restaurant_id: tenantId,
      customer_name: entry.customer_name,
      customer_phone: entry.customer_phone,
      date: today,
      time,
      guest_count: entry.guest_count,
      status: 'seated',
      arrival_status: 'arrived',
      check_in_time: now.toISOString(),
      salon: table.salon || entry.preferred_salon || null,
      notes: entry.notes,
      party_source: 'walk_in',
      no_show: false,
    })
    .select('id')
    .single();

  if (reservationInsert.error || !reservationInsert.data) {
    throw new CheckinDataError(reservationInsert.error?.message || 'Walk-in rezervasyonu oluşturulamadı.');
  }

  const reservationId = String(reservationInsert.data.id);

  const linkInsert = await db.from('reservation_tables').insert({
    restaurant_id: tenantId,
    reservation_id: reservationId,
    table_id: targetTableId,
  });
  if (linkInsert.error) {
    throw new CheckinDataError(linkInsert.error.message || 'Masa atanamadı.');
  }

  const { error: waitlistError } = await db
    .from('restaurant_waitlist')
    .update({
      status: 'seated',
      assigned_table_id: targetTableId,
      reservation_id: reservationId,
      seated_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', entryId)
    .eq('restaurant_id', tenantId);

  if (waitlistError) {
    throw new CheckinDataError(waitlistError.message || 'Kuyruk güncellenemedi.');
  }
}

export async function cancelWaitlistEntry(
  client: SupabaseClient | null,
  restaurantId: string,
  waitlistId: string,
): Promise<void> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  const { error } = await db
    .from('restaurant_waitlist')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', waitlistId)
    .eq('restaurant_id', tenantId);

  if (error) throw new CheckinDataError(error.message || 'Kuyruk kaydı iptal edilemedi.');
}

/** AI suggestion placeholder — capacity-aware empty tables, ranked for future ML. */
export function suggestTablesForParty(
  tables: CheckinTableOption[],
  guestCount: number,
  preferredSalon?: string | null,
): CheckinTableOption[] {
  return tables
    .filter((table) => table.active && table.status === 'empty' && table.capacity >= guestCount)
    .sort((a, b) => {
      const salonBoostA = preferredSalon && a.salon === preferredSalon ? -100 : 0;
      const salonBoostB = preferredSalon && b.salon === preferredSalon ? -100 : 0;
      const wasteA = a.capacity - guestCount;
      const wasteB = b.capacity - guestCount;
      return salonBoostA - salonBoostB || wasteA - wasteB || a.name.localeCompare(b.name, 'tr');
    })
    .slice(0, 5);
}
