import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getTableStatusLabel,
  isOccupiedTableStatus,
  normalizeTableStatus,
  type TableStatus,
} from '@/lib/table-status';
import { getOrderStatusLabel } from '@/lib/order-status';
import { formatCurrencyTry } from '@/lib/format';

export class TablesDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TablesDataError';
  }
}

export interface TableGuaranteeInfo {
  status: string;
  statusLabel: string;
  amountLabel: string;
}

export interface TableOrderSummary {
  id: string;
  orderNo: string;
  status: string;
  statusLabel: string;
  totalLabel: string;
  customerName: string | null;
}

export interface FloorTableCard {
  id: string;
  name: string;
  salon: string;
  capacity: number;
  sortOrder: number;
  active: boolean;
  status: TableStatus;
  statusLabel: string;
  /** Stored DB status (may differ from derived when auto-composed) */
  storedStatus: TableStatus;
  reservedAt: string | null;
  guestName: string | null;
  guestPhone: string | null;
  guestCount: number | null;
  hasPreorder: boolean;
  guarantee: TableGuaranteeInfo | null;
  reservationId: string | null;
  reservationStatus: string | null;
  arrivalStatus: string | null;
  checkInTime: string | null;
  assignedWaiter: string | null;
  notes: string | null;
  orderSummary: TableOrderSummary | null;
  /** Layout hooks for future drag-drop floor plan */
  posX: number | null;
  posY: number | null;
  layoutMeta: Record<string, unknown>;
}

export interface TablesKpis {
  empty: number;
  occupied: number;
  reserved: number;
  awaitingCheckin: number;
}

export interface TablesPageData {
  tables: FloorTableCard[];
  salons: string[];
  kpis: TablesKpis;
}

interface RestaurantTableDb {
  id: string;
  name: string;
  salon: string;
  capacity: number;
  sort_order: number;
  active: boolean;
  status: string | null;
  assigned_waiter: string | null;
  notes: string | null;
  pos_x: number | null;
  pos_y: number | null;
  layout_meta: Record<string, unknown> | null;
}

interface ReservationGuaranteeDb {
  reservation_guarantee_amount: number | null;
  reservation_guarantee_status: string | null;
}

interface ReservationDb {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  date: string;
  time: string;
  guest_count: number;
  status: string;
  has_preorder: boolean | null;
  arrival_status: string | null;
  check_in_time: string | null;
  notes: string | null;
  no_show: boolean | null;
  reservation_guarantees: ReservationGuaranteeDb | ReservationGuaranteeDb[] | null;
}

interface ReservationLinkDb {
  table_id: string;
  reservation_id: string;
  reservations: ReservationDb | ReservationDb[] | null;
}

interface OrderDb {
  id: string;
  order_no: string | null;
  status: string;
  total_amount: number | null;
  total: number | null;
  table_id: string | null;
  items: unknown;
  customers:
    | { name: string | null; phone: string | null }
    | { name: string | null; phone: string | null }[]
    | null;
}

const GUARANTEE_LABELS: Record<string, string> = {
  none: 'Yok',
  pending: 'Bekliyor',
  authorized: 'Provizyon',
  captured: 'Tahsil',
  released: 'Serbest',
  failed: 'Başarısız',
};

const OPEN_ORDER_STATUSES = new Set([
  'pending',
  'accepted',
  'preparing',
  'ready',
  'delivering',
]);

function requireClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) throw new TablesDataError('Supabase bağlantısı yapılandırılmamış.');
  return client;
}

function requireRestaurantId(restaurantId: string): string {
  const value = String(restaurantId || '').trim();
  if (!value) throw new TablesDataError('Restoran kimliği gerekli.');
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

function resolveOrderTableName(items: unknown): string {
  if (!Array.isArray(items)) return '';
  for (const item of items) {
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const table = String(record.table ?? record.tableName ?? record.table_name ?? '').trim();
      if (table) return table;
    }
  }
  return '';
}

function minutesUntilTime(time: string): number | null {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const now = new Date();
  const target = new Date();
  target.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

function deriveStatus(input: {
  active: boolean;
  storedStatus: TableStatus;
  reservation: ReservationDb | null;
  order: OrderDb | null;
}): TableStatus {
  if (!input.active || input.storedStatus === 'inactive') return 'inactive';

  // Manual ops overrides that should win over auto derivation
  if (
    input.storedStatus === 'cleaning' ||
    input.storedStatus === 'awaiting_bill' ||
    input.storedStatus === 'serving'
  ) {
    return input.storedStatus;
  }

  if (input.order) {
    const orderStatus = String(input.order.status || '').toLowerCase();
    if (orderStatus === 'preparing' || orderStatus === 'accepted' || orderStatus === 'pending') {
      return 'preparing';
    }
    if (orderStatus === 'ready' || orderStatus === 'delivering') {
      return 'serving';
    }
  }

  const reservation = input.reservation;
  if (reservation && !reservation.no_show) {
    const resStatus = String(reservation.status || '').toLowerCase();
    const arrival = String(reservation.arrival_status || 'expected').toLowerCase();

    if (resStatus === 'seated' || arrival === 'arrived') {
      return input.order ? 'preparing' : 'occupied';
    }

    if (resStatus === 'pending' || resStatus === 'confirmed') {
      const minutes = minutesUntilTime(reservation.time);
      if (minutes !== null && minutes <= 30 && minutes >= -15) {
        return 'awaiting_checkin';
      }
      return 'reserved';
    }
  }

  if (input.storedStatus !== 'empty') {
    return input.storedStatus;
  }

  return 'empty';
}

function mapGuarantee(
  raw: ReservationDb['reservation_guarantees'],
): TableGuaranteeInfo | null {
  const row = unwrapOne(raw);
  if (!row) return null;
  const status = String(row.reservation_guarantee_status || 'none');
  const amount = Number(row.reservation_guarantee_amount || 0);
  return {
    status,
    statusLabel: GUARANTEE_LABELS[status] || status,
    amountLabel: formatCurrencyTry(Number.isFinite(amount) ? amount : 0),
  };
}

function mapOrderSummary(order: OrderDb | null): TableOrderSummary | null {
  if (!order) return null;
  const customer = unwrapOne(order.customers);
  const total = Number(order.total_amount ?? order.total ?? 0);
  return {
    id: order.id,
    orderNo: order.order_no ? String(order.order_no) : order.id.slice(0, 8),
    status: order.status,
    statusLabel: getOrderStatusLabel(order.status),
    totalLabel: formatCurrencyTry(Number.isFinite(total) ? total : 0),
    customerName: customer?.name || customer?.phone || null,
  };
}

function computeKpis(tables: FloorTableCard[]): TablesKpis {
  return {
    empty: tables.filter((table) => table.status === 'empty').length,
    occupied: tables.filter((table) => isOccupiedTableStatus(table.status)).length,
    reserved: tables.filter((table) => table.status === 'reserved').length,
    awaitingCheckin: tables.filter((table) => table.status === 'awaiting_checkin').length,
  };
}

export async function fetchTablesPageData(
  client: SupabaseClient | null,
  restaurantId: string,
): Promise<TablesPageData> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  const today = formatLocalDate(new Date());

  const [tablesResult, linksResult, ordersResult] = await Promise.all([
    db
      .from('restaurant_tables')
      .select(
        'id, name, salon, capacity, sort_order, active, status, assigned_waiter, notes, pos_x, pos_y, layout_meta',
      )
      .eq('restaurant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    db
      .from('reservation_tables')
      .select(
        `
        table_id, reservation_id,
        reservations(
          id, customer_name, customer_phone, date, time, guest_count, status,
          has_preorder, arrival_status, check_in_time, notes, no_show,
          reservation_guarantees(reservation_guarantee_amount, reservation_guarantee_status)
        )
      `,
      )
      .eq('restaurant_id', tenantId),
    db
      .from('orders')
      .select(
        'id, order_no, status, total_amount, total, table_id, items, customers(name, phone)',
      )
      .eq('restaurant_id', tenantId)
      .in('status', [...OPEN_ORDER_STATUSES])
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (tablesResult.error) {
    throw new TablesDataError(tablesResult.error.message || 'Masalar yüklenemedi.');
  }
  if (linksResult.error) {
    throw new TablesDataError(linksResult.error.message || 'Rezervasyon bağlantıları yüklenemedi.');
  }
  if (ordersResult.error) {
    throw new TablesDataError(ordersResult.error.message || 'Siparişler yüklenemedi.');
  }

  const tables = (tablesResult.data || []) as RestaurantTableDb[];
  const links = (linksResult.data || []) as ReservationLinkDb[];
  const orders = (ordersResult.data || []) as OrderDb[];

  const reservationByTable = new Map<string, ReservationDb>();
  for (const link of links) {
    const reservation = unwrapOne(link.reservations);
    if (!reservation) continue;
    if (String(reservation.date) !== today) continue;
    if (['cancelled', 'completed', 'no_show'].includes(String(reservation.status).toLowerCase())) {
      continue;
    }
    const existing = reservationByTable.get(link.table_id);
    if (!existing || String(reservation.time) < String(existing.time)) {
      reservationByTable.set(link.table_id, reservation);
    }
  }

  const orderByTableId = new Map<string, OrderDb>();
  const orderByTableName = new Map<string, OrderDb>();
  for (const order of orders) {
    if (order.table_id && !orderByTableId.has(order.table_id)) {
      orderByTableId.set(order.table_id, order);
    }
    const name = resolveOrderTableName(order.items).toLowerCase();
    if (name && !orderByTableName.has(name)) {
      orderByTableName.set(name, order);
    }
  }

  const cards: FloorTableCard[] = tables.map((table) => {
    const reservation = reservationByTable.get(table.id) ?? null;
    const order =
      orderByTableId.get(table.id) ||
      orderByTableName.get(String(table.name).toLowerCase()) ||
      null;
    const storedStatus = normalizeTableStatus(table.active === false ? 'inactive' : table.status);
    const status = deriveStatus({
      active: table.active !== false,
      storedStatus,
      reservation,
      order,
    });

    const guarantee = reservation ? mapGuarantee(reservation.reservation_guarantees) : null;

    return {
      id: table.id,
      name: table.name,
      salon: table.salon || 'Ana Salon',
      capacity: Number(table.capacity || 2),
      sortOrder: Number(table.sort_order || 0),
      active: table.active !== false,
      status,
      statusLabel: getTableStatusLabel(status),
      storedStatus,
      reservedAt: reservation?.time ?? null,
      guestName: reservation?.customer_name ?? mapOrderSummary(order)?.customerName ?? null,
      guestPhone: reservation?.customer_phone ?? null,
      guestCount: reservation ? Number(reservation.guest_count || 0) : null,
      hasPreorder: Boolean(reservation?.has_preorder),
      guarantee,
      reservationId: reservation?.id ?? null,
      reservationStatus: reservation?.status ?? null,
      arrivalStatus: reservation?.arrival_status ?? null,
      checkInTime: reservation?.check_in_time ?? null,
      assignedWaiter: table.assigned_waiter,
      notes: table.notes || reservation?.notes || null,
      orderSummary: mapOrderSummary(order),
      posX: table.pos_x === null || table.pos_x === undefined ? null : Number(table.pos_x),
      posY: table.pos_y === null || table.pos_y === undefined ? null : Number(table.pos_y),
      layoutMeta: table.layout_meta || {},
    };
  });

  const salons = [...new Set(cards.map((card) => card.salon).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  );

  return {
    tables: cards,
    salons,
    kpis: computeKpis(cards),
  };
}
