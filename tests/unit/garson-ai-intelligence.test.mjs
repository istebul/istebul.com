import test from 'node:test';
import assert from 'node:assert/strict';

const { analyzeSales } = await import('../../js/restoran/intelligence/sales-analyzer.js');
const { analyzePeakHours } = await import('../../js/restoran/intelligence/peak-hours.js');
const { generateMenuInsights } = await import('../../js/restoran/intelligence/menu-insights.js');
const { analyzePerformance } = await import('../../js/restoran/intelligence/performance-engine.js');
const { generateRestaurantAdvice } = await import('../../js/restoran/intelligence/ai-advisor.js');
const { analyzeRestaurantPerformance } = await import('../../js/restoran/intelligence/index.js');

const DEMO_RESTAURANT_ID = 'a0000000-0000-4000-8000-00000000cafe';
const OTHER_RESTAURANT_ID = 'b0000000-0000-4000-8000-00000000bistro';

const ORDERS = [
  {
    id: 'o-1',
    restaurantId: DEMO_RESTAURANT_ID,
    status: 'completed',
    total: 300,
    createdAt: '2026-07-09T12:00:00.000Z',
    preparationMinutes: 18,
    delayed: false,
    items: [
      { name: 'Lahmacun', quantity: 2, menuItemId: 'item-lahmacun' },
      { name: 'Ayran', quantity: 1, menuItemId: 'item-ayran' }
    ]
  },
  {
    id: 'o-2',
    restaurantId: DEMO_RESTAURANT_ID,
    status: 'completed',
    total: 360,
    createdAt: '2026-07-09T12:30:00.000Z',
    preparationMinutes: 35,
    delayed: true,
    items: [{ name: 'Lahmacun', quantity: 1, menuItemId: 'item-lahmacun' }]
  },
  {
    id: 'o-3',
    restaurantId: DEMO_RESTAURANT_ID,
    status: 'completed',
    total: 120,
    createdAt: '2026-07-09T19:00:00.000Z',
    preparationMinutes: 12,
    delayed: false,
    items: [{ name: 'Sütlaç', quantity: 1, menuItemId: 'item-sutlac' }]
  },
  {
    id: 'o-4',
    restaurantId: DEMO_RESTAURANT_ID,
    status: 'cancelled',
    total: 200,
    createdAt: '2026-07-09T20:00:00.000Z',
    items: [{ name: 'Kebap', quantity: 1 }]
  },
  {
    id: 'o-other',
    restaurantId: OTHER_RESTAURANT_ID,
    status: 'completed',
    total: 999,
    createdAt: '2026-07-09T12:00:00.000Z',
    items: [{ name: 'Başka ürün', quantity: 5 }]
  }
];

const PRODUCTS = [
  {
    id: 'item-lahmacun',
    restaurant_id: DEMO_RESTAURANT_ID,
    name: 'Lahmacun',
    price: 120,
    active: true
  },
  {
    id: 'item-ayran',
    restaurant_id: DEMO_RESTAURANT_ID,
    name: 'Ayran',
    price: 40,
    active: true
  },
  {
    id: 'item-sutlac',
    restaurant_id: DEMO_RESTAURANT_ID,
    name: 'Sütlaç',
    price: 120,
    active: true
  },
  {
    id: 'item-kebap',
    restaurant_id: DEMO_RESTAURANT_ID,
    name: 'Adana kebap',
    price: 360,
    active: false
  },
  {
    id: 'item-other',
    restaurant_id: OTHER_RESTAURANT_ID,
    name: 'Başka ürün',
    price: 99,
    active: true
  }
];

test('analyzeSales calculates revenue basket and product rankings', () => {
  const sales = analyzeSales(ORDERS, { restaurantId: DEMO_RESTAURANT_ID });

  assert.equal(sales.totalOrders, 3);
  assert.equal(sales.totalRevenue, 780);
  assert.equal(sales.averageBasket, 260);
  assert.equal(sales.topProducts[0].name, 'Lahmacun');
  assert.ok(sales.topProducts[0].quantity >= 3);
  assert.equal(sales.slowProducts.some((item) => item.name === 'Sütlaç'), true);
});

test('analyzePeakHours detects busiest and quiet hours', () => {
  const peaks = analyzePeakHours(ORDERS, { restaurantId: DEMO_RESTAURANT_ID });

  assert.ok(Array.isArray(peaks.busiestHours));
  assert.ok(Array.isArray(peaks.quietHours));
  assert.equal(peaks.busiestHours[0].hour, 12);
  assert.equal(peaks.busiestHours[0].orderCount, 2);
  assert.equal(peaks.quietHours.some((entry) => entry.hour === 19), true);
});

test('generateMenuInsights produces Turkish recommendation messages', () => {
  const insights = generateMenuInsights(PRODUCTS, ORDERS, {
    restaurantId: DEMO_RESTAURANT_ID
  });

  assert.ok(insights.recommendations.length >= 2);
  assert.match(insights.recommendations.join(' '), /Lahmacun|çok sat/i);
  assert.match(insights.recommendations.join(' '), /Sütlaç|düşük|az sat/i);
});

test('analyzePerformance computes preparation delay rate and score', () => {
  const performance = analyzePerformance(ORDERS, { restaurantId: DEMO_RESTAURANT_ID });

  assert.equal(performance.avgPreparationTime, 22);
  assert.equal(performance.delayedRate, 1 / 3);
  assert.ok(performance.score >= 0 && performance.score <= 100);
});

test('generateRestaurantAdvice returns Turkish operational suggestions', () => {
  const sales = analyzeSales(ORDERS, { restaurantId: DEMO_RESTAURANT_ID });
  const peakHours = analyzePeakHours(ORDERS, { restaurantId: DEMO_RESTAURANT_ID });
  const menuInsights = generateMenuInsights(PRODUCTS, ORDERS, {
    restaurantId: DEMO_RESTAURANT_ID
  });
  const performance = analyzePerformance(ORDERS, { restaurantId: DEMO_RESTAURANT_ID });

  const advice = generateRestaurantAdvice({
    sales,
    peakHours,
    menuInsights,
    performance
  });

  assert.ok(advice.length >= 3);
  assert.match(advice.join(' '), /satış|sipariş|yoğun|menü|mutfak/i);
});

test('analyzeRestaurantPerformance orchestrates tenant-scoped intelligence report', () => {
  const report = analyzeRestaurantPerformance({
    restaurantId: DEMO_RESTAURANT_ID,
    orders: ORDERS,
    products: PRODUCTS
  });

  assert.equal(report.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(report.sales.totalOrders, 3);
  assert.equal(report.peakHours.busiestHours[0].hour, 12);
  assert.ok(report.menuInsights.recommendations.length > 0);
  assert.ok(report.performance.score > 0);
  assert.ok(report.advice.length > 0);
});

test('analyzeRestaurantPerformance requires restaurantId', () => {
  assert.throws(
    () =>
      analyzeRestaurantPerformance({
        restaurantId: '',
        orders: ORDERS,
        products: PRODUCTS
      }),
    /restoran/i
  );
});
