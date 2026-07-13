import type { SupabaseClient } from '@supabase/supabase-js';
import { formatCurrencyTry, formatTimeTr } from '@/lib/format';
import { getOrderChannelLabel, getOrderStatusLabel } from '@/lib/order-status';

export class OrdersDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrdersDataError';
  }
}

export interface OrderListItem {
  id: string;
  orderNo: string;
  customerName: string;
  tableName: string;
  channel: string;
  channelLabel: string;
  status: string;
  statusLabel: string;
  total: number;
  totalLabel: string;
  timeLabel: string;
  createdAt: string;
  customerPhone: string | null;
}

export interface OrderLineItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitPriceLabel: string;
  lineTotal: number;
  lineTotalLabel: string;
  note: string | null;
}

export interface OrderStatusHistoryItem {
  id: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  timeLabel: string;
}

export interface OrderDetail {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string | null;
  tableName: string;
  channelLabel: string;
  status: string;
  statusLabel: string;
  total: number;
  totalLabel: string;
  createdAt: string;
  updatedAt: string | null;
  items: OrderLineItem[];
  statusHistory: OrderStatusHistoryItem[];
  notes: string | null;
}

export interface OrdersKpis {
  totalOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  todayRevenue: number;
}

export interface FetchOrdersParams {
  restaurantId: string;
  page: number;
  pageSize: number;
  status?: string | null;
  search?: string;
}

export interface FetchOrdersResult {
  rows: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface OrderRow {
  id: string;
  order_no: string | null;
  status: string;
  total_amount: number | null;
  total: number | null;
  created_at: string;
  updated_at: string | null;
  source: string | null;
  items: unknown;
  customers:
    | { name: string | null; phone: string | null }
    | { name: string | null; phone: string | null }[]
    | null;
}

function requireClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) throw new OrdersDataError('Supabase bağlantısı yapılandırılmamış.');
  return client;
}

function requireRestaurantId(restaurantId: string): string {
  const value = String(restaurantId || '').trim();
  if (!value) throw new OrdersDataError('Restoran kimliği gerekli.');
  return value;
}

function sanitizeSearchTerm(term: string): string {
  return String(term || '')
    .trim()
    .replace(/[%_,]/g, ' ')
    .slice(0, 80);
}

export function getOrderAmount(row: Pick<OrderRow, 'total_amount' | 'total'>): number {
  const amount = Number(row.total_amount ?? row.total ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function resolveCustomer(row: OrderRow) {
  return Array.isArray(row.customers) ? row.customers[0] : row.customers;
}

export function resolveTableName(row: OrderRow): string {
  if (Array.isArray(row.items)) {
    for (const item of row.items) {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const table = String(record.table ?? record.tableName ?? record.table_name ?? '').trim();
        if (table) return table;
      }
    }
  }
  return '—';
}

function mapOrderListItem(row: OrderRow): OrderListItem {
  const customer = resolveCustomer(row);
  const amount = getOrderAmount(row);
  const channel = String(row.source || 'panel');

  return {
    id: row.id,
    orderNo: row.order_no ? String(row.order_no) : row.id.slice(0, 8),
    customerName: customer?.name || customer?.phone || '—',
    tableName: resolveTableName(row),
    channel,
    channelLabel: getOrderChannelLabel(channel),
    status: row.status,
    statusLabel: getOrderStatusLabel(row.status),
    total: amount,
    totalLabel: formatCurrencyTry(amount),
    timeLabel: formatTimeTr(row.created_at),
    createdAt: row.created_at,
    customerPhone: customer?.phone ?? null,
  };
}

async function resolveCustomerIdsForSearch(
  client: SupabaseClient,
  restaurantId: string,
  search: string,
): Promise<string[]> {
  const term = sanitizeSearchTerm(search);
  if (!term) return [];

  const { data, error } = await client
    .from('customers')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .or(`name.ilike.%${term}%,phone.ilike.%${term}%`)
    .limit(50);

  if (error) throw new OrdersDataError(error.message);
  return (data || []).map((row) => String((row as { id: string }).id));
}

export async function fetchOrdersPage(
  client: SupabaseClient | null,
  params: FetchOrdersParams,
): Promise<FetchOrdersResult> {
  const db = requireClient(client);
  const restaurantId = requireRestaurantId(params.restaurantId);
  const page = Math.max(1, params.page);
  const pageSize = Math.max(1, Math.min(params.pageSize, 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db
    .from('orders')
    .select(
      'id, order_no, status, total_amount, total, created_at, source, items, customers(name, phone)',
      { count: 'exact' },
    )
    .eq('restaurant_id', restaurantId);

  if (params.status) {
    query = query.eq('status', params.status);
  }

  const search = sanitizeSearchTerm(params.search || '');
  if (search) {
    const customerIds = await resolveCustomerIdsForSearch(db, restaurantId, search);
    if (customerIds.length > 0) {
      query = query.or(
        `order_no.ilike.%${search}%,customer_id.in.(${customerIds.join(',')})`,
      );
    } else {
      query = query.ilike('order_no', `%${search}%`);
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new OrdersDataError(error.message);

  const total = count ?? 0;
  return {
    rows: ((data || []) as OrderRow[]).map(mapOrderListItem),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function fetchOrdersKpis(
  client: SupabaseClient | null,
  restaurantId: string,
): Promise<OrdersKpis> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [totalResult, pendingResult, preparingResult, todayRevenueResult] = await Promise.all([
    db.from('orders').select('id', { count: 'exact', head: true }).eq('restaurant_id', tenantId),
    db
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', tenantId)
      .eq('status', 'pending'),
    db
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', tenantId)
      .eq('status', 'preparing'),
    db
      .from('orders')
      .select('total_amount, total')
      .eq('restaurant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
  ]);

  const firstError =
    totalResult.error || pendingResult.error || preparingResult.error || todayRevenueResult.error;
  if (firstError) throw new OrdersDataError(firstError.message);

  const todayRevenue = ((todayRevenueResult.data || []) as OrderRow[]).reduce(
    (sum, row) => sum + getOrderAmount(row),
    0,
  );

  return {
    totalOrders: totalResult.count ?? 0,
    pendingOrders: pendingResult.count ?? 0,
    preparingOrders: preparingResult.count ?? 0,
    todayRevenue,
  };
}

function mapJsonItems(items: unknown): OrderLineItem[] {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const quantity = Number(record.quantity ?? 1);
    const unitPrice = Number(record.unitPrice ?? record.unit_price ?? record.price ?? 0);
    const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const safePrice = Number.isFinite(unitPrice) ? unitPrice : 0;
    const lineTotal = safeQty * safePrice;

    return {
      id: String(record.id ?? `item-${index}`),
      name: String(record.name ?? record.title ?? 'Ürün'),
      quantity: safeQty,
      unitPrice: safePrice,
      unitPriceLabel: formatCurrencyTry(safePrice),
      lineTotal,
      lineTotalLabel: formatCurrencyTry(lineTotal),
      note: record.note !== null && record.note !== undefined ? String(record.note) : null,
    };
  });
}

export async function fetchOrderDetail(
  client: SupabaseClient | null,
  restaurantId: string,
  orderId: string,
): Promise<OrderDetail> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  const id = String(orderId || '').trim();
  if (!id) throw new OrdersDataError('Sipariş kimliği gerekli.');

  const [orderResult, lineItemsResult, eventsResult] = await Promise.all([
    db
      .from('orders')
      .select(
        'id, order_no, status, total_amount, total, created_at, updated_at, source, items, customers(name, phone)',
      )
      .eq('restaurant_id', tenantId)
      .eq('id', id)
      .maybeSingle(),
    db
      .from('order_items')
      .select('id, quantity, unit_price, note, menu_item_id, menu_items(name)')
      .eq('restaurant_id', tenantId)
      .eq('order_id', id),
    db
      .from('kitchen_events')
      .select('id, event_type, created_at')
      .eq('restaurant_id', tenantId)
      .eq('order_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (orderResult.error) throw new OrdersDataError(orderResult.error.message);
  if (!orderResult.data) throw new OrdersDataError('Sipariş bulunamadı.');

  const row = orderResult.data as OrderRow;
  const customer = resolveCustomer(row);
  const amount = getOrderAmount(row);

  let items: OrderLineItem[] = [];

  if (!lineItemsResult.error && lineItemsResult.data?.length) {
    items = lineItemsResult.data.map((item, index) => {
      const record = item as Record<string, unknown>;
      const menuItem = record.menu_items as { name?: string } | { name?: string }[] | null;
      const menuName = Array.isArray(menuItem) ? menuItem[0]?.name : menuItem?.name;
      const quantity = Number(record.quantity ?? 1);
      const unitPrice = Number(record.unit_price ?? 0);
      const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      const safePrice = Number.isFinite(unitPrice) ? unitPrice : 0;
      const lineTotal = safeQty * safePrice;

      return {
        id: String(record.id ?? `line-${index}`),
        name: String(menuName || 'Ürün'),
        quantity: safeQty,
        unitPrice: safePrice,
        unitPriceLabel: formatCurrencyTry(safePrice),
        lineTotal,
        lineTotalLabel: formatCurrencyTry(lineTotal),
        note: record.note !== null && record.note !== undefined ? String(record.note) : null,
      };
    });
  } else {
    items = mapJsonItems(row.items);
  }

  const statusHistory: OrderStatusHistoryItem[] = [];

  if (!eventsResult.error && eventsResult.data?.length) {
    for (const event of eventsResult.data) {
      const record = event as { id: string; event_type: string; created_at: string };
      statusHistory.push({
        id: record.id,
        status: record.event_type,
        statusLabel: getOrderStatusLabel(record.event_type),
        createdAt: record.created_at,
        timeLabel: formatTimeTr(record.created_at),
      });
    }
  }

  statusHistory.push({
    id: `current-${row.id}`,
    status: row.status,
    statusLabel: getOrderStatusLabel(row.status),
    createdAt: row.updated_at || row.created_at,
    timeLabel: formatTimeTr(row.updated_at || row.created_at),
  });

  const notes = items
    .map((item) => item.note)
    .filter(Boolean)
    .join(' · ');

  return {
    id: row.id,
    orderNo: row.order_no ? String(row.order_no) : row.id.slice(0, 8),
    customerName: customer?.name || customer?.phone || '—',
    customerPhone: customer?.phone ?? null,
    tableName: resolveTableName(row),
    channelLabel: getOrderChannelLabel(String(row.source || 'panel')),
    status: row.status,
    statusLabel: getOrderStatusLabel(row.status),
    total: amount,
    totalLabel: formatCurrencyTry(amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
    statusHistory,
    notes: notes || null,
  };
}

export async function updateOrderStatus(
  client: SupabaseClient | null,
  restaurantId: string,
  orderId: string,
  status: string,
): Promise<void> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  const id = String(orderId || '').trim();
  if (!id) throw new OrdersDataError('Sipariş kimliği gerekli.');

  const { error } = await db
    .from('orders')
    .update({
      status,
      kitchen_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('restaurant_id', tenantId);

  if (error) throw new OrdersDataError(error.message);

  const { error: eventError } = await db.from('kitchen_events').insert({
    restaurant_id: tenantId,
    order_id: id,
    event_type: status,
  });

  if (eventError) {
    throw new OrdersDataError(eventError.message);
  }
}
