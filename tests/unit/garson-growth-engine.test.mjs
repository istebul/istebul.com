import test from 'node:test';
import assert from 'node:assert/strict';

const { analyzeCustomers } = await import('../../js/restoran/growth/customer-analyzer.js');
const { generateCampaignSuggestions } = await import('../../js/restoran/growth/campaign-engine.js');
const { predictRevenue } = await import('../../js/restoran/growth/revenue-predictor.js');
const { generateSmartDiscounts } = await import('../../js/restoran/growth/smart-discount.js');
const { generateCustomerMessage } = await import('../../js/restoran/growth/customer-message-ai.js');
const { analyzeRestaurantGrowth } = await import('../../js/restoran/growth/index.js');

const DEMO_RESTAURANT_ID = 'a0000000-0000-4000-8000-00000000cafe';
const OTHER_RESTAURANT_ID = 'b0000000-0000-4000-8000-00000000bistro';
const NOW = new Date('2026-07-09T18:00:00.000Z');

const CUSTOMERS = [
  {
    id: 'c-1',
    restaurantId: DEMO_RESTAURANT_ID,
    name: 'Ahmet Yılmaz',
    phone: '+905551110001'
  },
  {
    id: 'c-2',
    restaurantId: DEMO_RESTAURANT_ID,
    name: 'Ayşe Demir',
    phone: '+905551110002'
  },
  {
    id: 'c-3',
    restaurantId: DEMO_RESTAURANT_ID,
    name: 'Mehmet Kaya',
    phone: '+905551110003'
  },
  {
    id: 'c-4',
    restaurantId: DEMO_RESTAURANT_ID,
    name: 'Zeynep Ak',
    phone: '+905551110004'
  },
  {
    id: 'c-other',
    restaurantId: OTHER_RESTAURANT_ID,
    name: 'Başka Müşteri',
    phone: '+905559999999'
  }
];

const ORDERS = [
  {
    id: 'o-1',
    restaurantId: DEMO_RESTAURANT_ID,
    customerId: 'c-1',
    customer: { phone: '+905551110001', name: 'Ahmet Yılmaz' },
    status: 'completed',
    total: 420,
    createdAt: '2026-07-08T12:00:00.000Z',
    items: [{ name: 'Lahmacun', quantity: 2 }]
  },
  {
    id: 'o-2',
    restaurantId: DEMO_RESTAURANT_ID,
    customerId: 'c-1',
    customer: { phone: '+905551110001', name: 'Ahmet Yılmaz' },
    status: 'completed',
    total: 360,
    createdAt: '2026-07-09T11:00:00.000Z',
    items: [{ name: 'Adana kebap', quantity: 1 }]
  },
  {
    id: 'o-3',
    restaurantId: DEMO_RESTAURANT_ID,
    customerId: 'c-2',
    customer: { phone: '+905551110002', name: 'Ayşe Demir' },
    status: 'completed',
    total: 780,
    createdAt: '2026-07-09T13:00:00.000Z',
    items: [{ name: 'Lahmacun', quantity: 4 }]
  },
  {
    id: 'o-4',
    restaurantId: DEMO_RESTAURANT_ID,
    customerId: 'c-3',
    customer: { phone: '+905551110003', name: 'Mehmet Kaya' },
    status: 'completed',
    total: 120,
    createdAt: '2026-05-01T10:00:00.000Z',
    items: [{ name: 'Ayran', quantity: 2 }]
  },
  {
    id: 'o-5',
    restaurantId: DEMO_RESTAURANT_ID,
    customerId: 'c-4',
    customer: { phone: '+905551110004', name: 'Zeynep Ak' },
    status: 'completed',
    total: 200,
    createdAt: '2026-06-01T10:00:00.000Z',
    items: [{ name: 'Sütlaç', quantity: 1 }]
  },
  {
    id: 'o-other',
    restaurantId: OTHER_RESTAURANT_ID,
    customerId: 'c-other',
    customer: { phone: '+905559999999', name: 'Başka Müşteri' },
    status: 'completed',
    total: 999,
    createdAt: '2026-07-09T12:00:00.000Z',
    items: [{ name: 'Başka ürün', quantity: 1 }]
  }
];

test('analyzeCustomers segments total repeat VIP and inactive customers', () => {
  const analysis = analyzeCustomers(CUSTOMERS, ORDERS, {
    restaurantId: DEMO_RESTAURANT_ID,
    now: NOW,
    inactiveDays: 30,
    vipOrderThreshold: 2,
    vipSpendThreshold: 500
  });

  assert.equal(analysis.totalCustomers, 4);
  assert.equal(analysis.repeatCustomers.length, 1);
  assert.equal(analysis.repeatCustomers[0].name, 'Ahmet Yılmaz');
  assert.equal(analysis.vipCustomers.some((c) => c.name === 'Ahmet Yılmaz'), true);
  assert.equal(analysis.vipCustomers.some((c) => c.name === 'Ayşe Demir'), true);
  assert.equal(analysis.inactiveCustomers.some((c) => c.name === 'Mehmet Kaya'), true);
  assert.equal(analysis.inactiveCustomers.some((c) => c.name === 'Zeynep Ak'), true);
});

test('generateCampaignSuggestions returns Turkish campaign messages', () => {
  const customerAnalysis = analyzeCustomers(CUSTOMERS, ORDERS, {
    restaurantId: DEMO_RESTAURANT_ID,
    now: NOW
  });
  const revenue = predictRevenue(ORDERS, { restaurantId: DEMO_RESTAURANT_ID, now: NOW });

  const campaigns = generateCampaignSuggestions({
    customers: customerAnalysis,
    revenue
  });

  assert.ok(campaigns.length >= 1);
  assert.equal(campaigns[0].type, 'campaign');
  assert.match(campaigns[0].message, /30 gün|sipariş vermeyen|indirim/i);
});

test('predictRevenue estimates trend and risk from order history', () => {
  const prediction = predictRevenue(ORDERS, {
    restaurantId: DEMO_RESTAURANT_ID,
    now: NOW
  });

  assert.ok(prediction.currentRevenue > 0);
  assert.ok(['up', 'stable', 'down'].includes(prediction.trend));
  assert.ok(['low', 'medium', 'high'].includes(prediction.risk));
  assert.ok(prediction.predictedRevenue >= 0);
});

test('generateSmartDiscounts suggests contextual discount ideas in Turkish', () => {
  const customerAnalysis = analyzeCustomers(CUSTOMERS, ORDERS, {
    restaurantId: DEMO_RESTAURANT_ID,
    now: NOW
  });
  const peakHours = { quietHours: [{ hour: 14, orderCount: 0, revenue: 0 }] };

  const discounts = generateSmartDiscounts({
    customers: customerAnalysis,
    peakHours,
    revenue: predictRevenue(ORDERS, { restaurantId: DEMO_RESTAURANT_ID, now: NOW })
  });

  assert.ok(discounts.length >= 1);
  assert.match(discounts.join(' '), /kampanya|indirim|combo/i);
});

test('generateCustomerMessage creates WhatsApp friendly personalized text', () => {
  const message = generateCustomerMessage(
    { name: 'Ahmet Yılmaz', phone: '+905551110001' },
    {
      favoriteProduct: 'Lahmacun',
      offer: 'bugün özel fırsat'
    }
  );

  assert.match(message, /Merhaba Ahmet/i);
  assert.match(message, /Lahmacun/i);
  assert.match(message, /özel fırsat/i);
});

test('analyzeRestaurantGrowth orchestrates tenant-scoped growth report', () => {
  const report = analyzeRestaurantGrowth({
    restaurantId: DEMO_RESTAURANT_ID,
    customers: CUSTOMERS,
    orders: ORDERS,
    now: NOW
  });

  assert.equal(report.restaurantId, DEMO_RESTAURANT_ID);
  assert.equal(report.customers.totalCustomers, 4);
  assert.ok(report.campaigns.length > 0);
  assert.ok(report.revenue.currentRevenue > 0);
  assert.ok(report.discounts.length > 0);
});

test('analyzeRestaurantGrowth enforces tenant isolation and requires restaurantId', () => {
  assert.throws(
    () =>
      analyzeRestaurantGrowth({
        restaurantId: '',
        customers: CUSTOMERS,
        orders: ORDERS
      }),
    /restoran/i
  );

  const report = analyzeRestaurantGrowth({
    restaurantId: DEMO_RESTAURANT_ID,
    customers: CUSTOMERS,
    orders: ORDERS,
    now: NOW
  });

  assert.equal(
    report.customers.inactiveCustomers.some((c) => c.name === 'Başka Müşteri'),
    false
  );
  // Demo tenant recent revenue (420+360+780); other-tenant order (999) excluded
  assert.equal(report.revenue.currentRevenue, 1560);
});
