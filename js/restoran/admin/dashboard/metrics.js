import {
  getRestaurantCustomerData,
  getRestaurantOrderData,
  getRestaurantReservationData
} from '../../data-service.js';
import {
  buildDemoDashboardDataset,
  enrichOrdersForIntelligence,
  loadRestaurantDashboard,
  loadRestaurantDashboardLive,
  resolveDailySalesMetrics
} from '../../dashboard/ai-dashboard-service.js';
import { analyzePeakHours } from '../../intelligence/peak-hours.js';
import { normalizeRestaurantSettings } from '../../tenant.js';
import { getMockDemoTenantPayload } from '../../admin-portal.js';
import { KITCHEN_STATUS_LABELS } from '../shared/constants.js';
import { formatCurrencyTry } from '../shared/format.js';

/**
 * @typedef {import('../shared/context.js').AdminPanelContext} AdminPanelContext
 */

/**
 * @param {unknown[]} orders
 * @returns {{ pending: number, preparing: number, ready: number, served: number }}
 */
export function countOrdersByKitchenStatus(orders) {
  let pending = 0;
  let preparing = 0;
  let ready = 0;
  let served = 0;

  for (const order of orders) {
    const row = /** @type {Record<string, unknown>} */ (
      order && typeof order === 'object' ? order : {}
    );
    const status = String(row.kitchenStatus ?? row.kitchen_status ?? row.status ?? 'pending')
      .trim()
      .toLowerCase();

    if (status === 'preparing') preparing += 1;
    else if (status === 'ready') ready += 1;
    else if (status === 'served' || status === 'completed') served += 1;
    else pending += 1;
  }

  return { pending, preparing, ready, served };
}

/**
 * @param {string} dateStr
 * @returns {boolean}
 */
function isTodayDate(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const value = new Date(String(dateStr));
  if (Number.isNaN(value.getTime())) {
    const parts = String(dateStr).split(/[T\s]/)[0];
    const parsed = new Date(parts);
    if (Number.isNaN(parsed.getTime())) return false;
    return (
      parsed.getFullYear() === today.getFullYear() &&
      parsed.getMonth() === today.getMonth() &&
      parsed.getDate() === today.getDate()
    );
  }
  return (
    value.getFullYear() === today.getFullYear() &&
    value.getMonth() === today.getMonth() &&
    value.getDate() === today.getDate()
  );
}

/**
 * @param {AdminPanelContext} context
 * @returns {Promise<import('../shared/cards.js').MetricCard[]>}
 */
export async function loadDashboardMetrics(context) {
  const options = {
    restaurantId: context.restaurantId,
    slug: context.slug
  };

  const [ordersResult, reservationsResult, customersResult, aiReport] = await Promise.all([
    getRestaurantOrderData(options),
    getRestaurantReservationData(options),
    getRestaurantCustomerData(options),
    (async () => {
      if (context.mode === 'live') {
        return loadRestaurantDashboardLive({ restaurantId: context.restaurantId, now: new Date() });
      }
      const demo = buildDemoDashboardDataset(context.restaurantId);
      return loadRestaurantDashboard({
        restaurantId: context.restaurantId,
        orders: demo.orders,
        products: demo.products,
        customers: demo.customers,
        now: new Date()
      });
    })()
  ]);

  const orders = ordersResult.data?.orders || [];
  const reservations = reservationsResult.data?.reservations || [];
  const statusCounts = countOrdersByKitchenStatus(orders);

  const todayOrders = orders.filter((order) => {
    const raw = order.raw && typeof order.raw === 'object' ? order.raw : order;
    const created = /** @type {Record<string, unknown>} */ (raw).created_at ?? raw.createdAt;
    if (!created) return true;
    const date = new Date(String(created));
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  });

  const daily = resolveDailySalesMetrics(
    enrichOrdersForIntelligence(orders, context.restaurantId),
    new Date()
  );

  const activeReservations = reservations.filter((item) => {
    const status = String(item.status || '').toLowerCase();
    return status !== 'cancelled' && status !== 'completed';
  });

  const todayReservations = reservations.filter(
    (item) => isTodayDate(item.date) && String(item.status || '').toLowerCase() !== 'cancelled'
  );

  const peak = analyzePeakHours(
    enrichOrdersForIntelligence(orders, context.restaurantId),
    { restaurantId: context.restaurantId, topCount: 1 }
  );
  const busiest = peak.busiestHours[0];
  const busiestLabel = busiest
    ? `${String(busiest.hour).padStart(2, '0')}:00`
    : '—';

  const topProduct = aiReport?.sales?.topProducts?.[0];
  const topProductLabel = topProduct?.name || '—';

  const settings = normalizeRestaurantSettings(getMockDemoTenantPayload().settings);

  const avgBasket =
    daily.dailyOrderCount > 0
      ? daily.dailyRevenue / daily.dailyOrderCount
      : aiReport?.sales?.averageBasket ?? 0;

  return [
    {
      id: 'today-orders',
      label: 'Bugünkü Siparişler',
      value: String(todayOrders.length || daily.dailyOrderCount),
      hint: 'Gün içi toplam sipariş'
    },
    {
      id: 'pending-orders',
      label: 'Bekleyen Siparişler',
      value: String(statusCounts.pending),
      hint: 'Mutfak kuyruğunda bekleyen',
      tone: statusCounts.pending > 0 ? 'warning' : undefined
    },
    {
      id: 'preparing-orders',
      label: 'Hazırlanan Siparişler',
      value: String(statusCounts.preparing),
      hint: KITCHEN_STATUS_LABELS.preparing
    },
    {
      id: 'active-reservations',
      label: 'Aktif Rezervasyonlar',
      value: String(activeReservations.length),
      hint: `${todayReservations.length} bugün`
    },
    {
      id: 'today-revenue',
      label: 'Bugünkü Ciro',
      value: formatCurrencyTry(daily.dailyRevenue || aiReport?.sales?.dailyRevenue || 0),
      hint: 'Tamamlanan siparişler'
    },
    {
      id: 'avg-basket',
      label: 'Ortalama Sepet Tutarı',
      value: formatCurrencyTry(avgBasket),
      hint: 'Bugünkü ortalama'
    },
    {
      id: 'top-product',
      label: 'En Çok Satan Ürünler',
      value: topProductLabel,
      hint: topProduct ? `${topProduct.quantity || 0} adet` : 'Veri yok'
    },
    {
      id: 'peak-hour',
      label: 'Yoğun Saatler',
      value: busiestLabel,
      hint: busiest ? `${busiest.orderCount} sipariş` : 'Henüz veri yok'
    },
    {
      id: 'kitchen-status',
      label: 'Mutfak Durumu',
      value: aiReport?.kitchen?.statusLabel || (statusCounts.preparing > 0 ? 'Hazırlanıyor' : 'Beklemede'),
      hint: `${statusCounts.ready} hazır · ${statusCounts.served} teslim`
    },
    {
      id: 'whatsapp-status',
      label: 'WhatsApp Durumu',
      value: settings.whatsappEnabled ? 'Bağlı' : 'Kapalı',
      hint: settings.whatsappEnabled ? 'Bildirim altyapısı aktif' : 'Ayarlardan açılabilir'
    },
    {
      id: 'ai-status',
      label: 'AI Durumu',
      value: settings.aiEnabled ? 'Aktif' : 'Kapalı',
      hint: aiReport
        ? `${aiReport.customers?.totalCustomers ?? 0} müşteri analizi`
        : `${customersResult.data?.customers?.length ?? 0} müşteri kaydı`
    }
  ];
}
