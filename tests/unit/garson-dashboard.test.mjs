import test from 'node:test';
import assert from 'node:assert/strict';

const { loadRestaurantDashboard, buildDemoDashboardDataset, RestaurantDashboardError } =
  await import('../../js/restoran/dashboard/ai-dashboard-service.js');
const {
  renderAdminAiStatCardsHtml,
  renderSalesInsight,
  renderKitchenInsight,
  renderCustomerInsight,
  renderAIAdvice,
  renderAiDashboardPageHtml
} = await import('../../js/restoran/dashboard/restaurant-ai-widgets.js');

const DEMO_RESTAURANT_ID = 'a0000000-0000-4000-8000-00000000cafe';
const OTHER_RESTAURANT_ID = 'b0000000-0000-4000-8000-00000000bistro';
const NOW = new Date('2026-07-09T18:00:00.000Z');

test('loadRestaurantDashboard connects intelligence and growth engines', () => {
  const demo = buildDemoDashboardDataset(DEMO_RESTAURANT_ID);
  const dashboard = loadRestaurantDashboard({
    restaurantId: DEMO_RESTAURANT_ID,
    orders: demo.orders,
    products: demo.products,
    customers: demo.customers,
    now: NOW
  });

  assert.equal(dashboard.restaurantId, DEMO_RESTAURANT_ID);
  assert.ok(dashboard.sales.dailyRevenue > 0);
  assert.ok(dashboard.sales.orderCount > 0);
  assert.ok(dashboard.sales.averageBasket > 0);
  assert.ok(dashboard.sales.topProducts.length > 0);
  assert.ok(dashboard.kitchen.score >= 0 && dashboard.kitchen.score <= 100);
  assert.ok(dashboard.customers.totalCustomers > 0);
  assert.ok(dashboard.recommendations.advice.length > 0);
  assert.ok(dashboard.recommendations.campaigns.length > 0);
});

test('loadRestaurantDashboard enforces restaurantId requirement', () => {
  assert.throws(
    () =>
      loadRestaurantDashboard({
        restaurantId: '',
        orders: [],
        products: [],
        customers: []
      }),
    (error) => error instanceof RestaurantDashboardError
  );
});

test('loadRestaurantDashboard keeps tenant isolation for orders and customers', () => {
  const demo = buildDemoDashboardDataset(DEMO_RESTAURANT_ID);
  const dashboard = loadRestaurantDashboard({
    restaurantId: DEMO_RESTAURANT_ID,
    orders: demo.orders,
    products: demo.products,
    customers: demo.customers,
    now: NOW
  });

  assert.equal(dashboard.customers.totalCustomers, 3);
  assert.equal(dashboard.sales.totalRevenue, 1680);
  assert.equal(
    dashboard.recommendations.campaigns.some((item) => item.message.includes('Başka')),
    false
  );
});

test('dashboard widgets render sales kitchen customer and advice sections', () => {
  const demo = buildDemoDashboardDataset(DEMO_RESTAURANT_ID);
  const dashboard = loadRestaurantDashboard({
    restaurantId: DEMO_RESTAURANT_ID,
    orders: demo.orders,
    products: demo.products,
    customers: demo.customers,
    now: NOW
  });

  assert.match(renderSalesInsight(dashboard.sales), /Günlük ciro/i);
  assert.match(renderKitchenInsight(dashboard.kitchen), /Mutfak Performansı/i);
  assert.match(renderCustomerInsight(dashboard.customers), /VIP müşteri/i);
  assert.match(renderAIAdvice(dashboard.recommendations), /AI Önerileri/i);

  const panelCards = renderAdminAiStatCardsHtml(dashboard);
  assert.match(panelCards, /Günlük ciro/i);
  assert.match(panelCards, /VIP müşteri sayısı/i);
  assert.match(panelCards, /AI önerileri/i);

  const pageHtml = renderAiDashboardPageHtml(dashboard);
  assert.match(pageHtml, /Bugünkü Performans/i);
  assert.match(pageHtml, /Kampanya fikirleri/i);
});

test('other tenant dashboard excludes cross-tenant revenue totals', () => {
  const dashboard = loadRestaurantDashboard({
    restaurantId: OTHER_RESTAURANT_ID,
    orders: [
      {
        id: 'o-other',
        restaurantId: OTHER_RESTAURANT_ID,
        customerId: 'c-other',
        status: 'completed',
        total: 999,
        createdAt: '2026-07-09T12:00:00.000Z',
        items: [{ name: 'Başka ürün', quantity: 1 }]
      },
      {
        id: 'o-cafe',
        restaurantId: DEMO_RESTAURANT_ID,
        status: 'completed',
        total: 500,
        createdAt: '2026-07-09T12:00:00.000Z',
        items: [{ name: 'Lahmacun', quantity: 1 }]
      }
    ],
    products: [],
    customers: [
      {
        id: 'c-other',
        restaurantId: OTHER_RESTAURANT_ID,
        name: 'Başka Müşteri',
        phone: '+905559999999'
      }
    ],
    now: NOW
  });

  assert.equal(dashboard.restaurantId, OTHER_RESTAURANT_ID);
  assert.equal(dashboard.sales.totalRevenue, 999);
  assert.equal(dashboard.customers.totalCustomers, 1);
});
