import type { SupabaseClient } from '@supabase/supabase-js';
import { ACTIVE_ORDER_STATUSES, getOrderStatusLabel } from '@/lib/order-status';
import { formatCurrencyTry, getHourLabel, getTodayBounds } from '@/lib/format';

export class DashboardDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DashboardDataError';
  }
}

export interface DashboardKpis {
  activeOrders: number;
  todayRevenue: number;
  averageOrderValue: number;
  activeProducts: number;
}

export interface RecentOrderRow {
  id: string;
  orderNo: string;
  customerLabel: string;
  status: string;
  statusLabel: string;
  amount: number;
  amountLabel: string;
  timeLabel: string;
  createdAt: string;
}

export interface StatusDistributionPoint {
  name: string;
  value: number;
  status: string;
}

export interface HourlyOrderPoint {
  label: string;
  orders: number;
  hour: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  recentOrders: RecentOrderRow[];
  statusDistribution: StatusDistributionPoint[];
  hourlyOrders: HourlyOrderPoint[];
}

interface OrderRow {
  id: string;
  order_no: string | null;
  status: string;
  total_amount: number | null;
  total: number | null;
  created_at: string;
  kitchen_status: string | null;
  source: string | null;
  items: unknown;
  customers: { name: string | null; phone: string | null } | { name: string | null; phone: string | null }[] | null;
}

function requireClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) {
    throw new DashboardDataError('Supabase bağlantısı yapılandırılmamış.');
  }
  return client;
}

function requireRestaurantId(restaurantId: string): string {
  const value = String(restaurantId || '').trim();
  if (!value) {
    throw new DashboardDataError('Restoran kimliği gerekli.');
  }
  return value;
}

function getOrderAmount(row: OrderRow): number {
  const amount = Number(row.total_amount ?? row.total ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function resolveCustomerLabel(row: OrderRow): string {
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  if (customer?.name) return customer.name;
  if (customer?.phone) return customer.phone;

  if (Array.isArray(row.items)) {
    for (const item of row.items) {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const table = String(record.table ?? record.tableName ?? record.table_name ?? '').trim();
        if (table) return `Masa ${table}`;
      }
    }
  }

  const source = String(row.source || '').trim().toLowerCase();
  if (source === 'whatsapp') return 'WhatsApp';
  if (source === 'qr') return 'QR';
  return '—';
}

function buildHourlyBuckets(): HourlyOrderPoint[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    orders: 0,
  }));
}

export async function fetchDashboardData(
  client: SupabaseClient | null,
  restaurantId: string,
): Promise<DashboardData> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);
  const { start, end } = getTodayBounds();

  const [
    activeOrdersResult,
    todayOrdersResult,
    activeProductsResult,
    recentOrdersResult,
    todayStatusResult,
  ] = await Promise.all([
    db
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', tenantId)
      .in('status', ACTIVE_ORDER_STATUSES),
    db
      .from('orders')
      .select('id, status, total_amount, total, created_at')
      .eq('restaurant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', start)
      .lte('created_at', end),
    db
      .from('menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', tenantId)
      .eq('active', true),
    db
      .from('orders')
      .select(
        'id, order_no, status, total_amount, total, created_at, kitchen_status, source, items, customers(name, phone)',
      )
      .eq('restaurant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10),
    db
      .from('orders')
      .select('status, created_at')
      .eq('restaurant_id', tenantId)
      .gte('created_at', start)
      .lte('created_at', end),
  ]);

  const firstError =
    activeOrdersResult.error ||
    todayOrdersResult.error ||
    activeProductsResult.error ||
    recentOrdersResult.error ||
    todayStatusResult.error;

  if (firstError) {
    throw new DashboardDataError(firstError.message || 'Dashboard verileri alınamadı.');
  }

  const completedToday = (todayOrdersResult.data || []) as OrderRow[];
  const todayRevenue = completedToday.reduce((sum, row) => sum + getOrderAmount(row), 0);
  const averageOrderValue =
    completedToday.length > 0 ? Math.round(todayRevenue / completedToday.length) : 0;

  const statusCounts = new Map<string, number>();
  for (const row of todayStatusResult.data || []) {
    const status = String((row as { status?: string }).status || 'pending').toLowerCase();
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  }

  const statusDistribution: StatusDistributionPoint[] = [...statusCounts.entries()]
    .map(([status, value]) => ({
      status,
      name: getOrderStatusLabel(status),
      value,
    }))
    .sort((a, b) => b.value - a.value);

  const hourlyBuckets = buildHourlyBuckets();
  for (const row of todayStatusResult.data || []) {
    const createdAt = String((row as { created_at?: string }).created_at || '');
    if (!createdAt) continue;
    const hour = new Date(createdAt).getHours();
    if (hour >= 0 && hour < 24) {
      hourlyBuckets[hour].orders += 1;
    }
  }

  const recentOrders: RecentOrderRow[] = ((recentOrdersResult.data || []) as OrderRow[]).map((row) => {
    const amount = getOrderAmount(row);
    return {
      id: row.id,
      orderNo: row.order_no ? String(row.order_no) : row.id.slice(0, 8),
      customerLabel: resolveCustomerLabel(row),
      status: row.status,
      statusLabel: getOrderStatusLabel(row.status),
      amount,
      amountLabel: formatCurrencyTry(amount),
      timeLabel: getHourLabel(row.created_at),
      createdAt: row.created_at,
    };
  });

  return {
    kpis: {
      activeOrders: activeOrdersResult.count ?? 0,
      todayRevenue,
      averageOrderValue,
      activeProducts: activeProductsResult.count ?? 0,
    },
    recentOrders,
    statusDistribution,
    hourlyOrders: hourlyBuckets.filter((bucket) => bucket.orders > 0 || bucket.hour >= 8 && bucket.hour <= 23),
  };
}
