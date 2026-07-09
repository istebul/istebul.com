/**
 * GarsonAI dashboard widget renderers for panel and intelligence center pages.
 */

/**
 * @param {number} value
 * @returns {string}
 */
export function formatCurrencyTry(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * @param {import('./ai-dashboard-service.js').DashboardSalesSummary} sales
 * @returns {string}
 */
export function renderSalesInsight(sales) {
  const topProducts = (sales.topProducts || [])
    .slice(0, 3)
    .map((product) => `<li>${product.name} · ${product.quantity} adet</li>`)
    .join('');

  return `
    <section class="garson-ai-widget" aria-labelledby="garson-ai-sales-title">
      <h2 id="garson-ai-sales-title" class="garson-ai-widget__title">Bugünkü Performans</h2>
      <dl class="garson-ai-metrics">
        <div><dt>Günlük ciro</dt><dd>${formatCurrencyTry(sales.dailyRevenue)}</dd></div>
        <div><dt>Sipariş sayısı</dt><dd>${sales.orderCount}</dd></div>
        <div><dt>Ortalama sepet</dt><dd>${formatCurrencyTry(sales.averageBasket)}</dd></div>
      </dl>
      ${
        topProducts
          ? `<div class="garson-ai-widget__list-wrap"><p class="garson-ai-widget__subtitle">En çok satan ürünler</p><ul class="garson-ai-widget__list">${topProducts}</ul></div>`
          : ''
      }
    </section>
  `.trim();
}

/**
 * @param {import('./ai-dashboard-service.js').DashboardKitchenSummary} kitchen
 * @returns {string}
 */
export function renderKitchenInsight(kitchen) {
  const delayedPct = Math.round((kitchen.delayedRate || 0) * 100);

  return `
    <section class="garson-ai-widget" aria-labelledby="garson-ai-kitchen-title">
      <h2 id="garson-ai-kitchen-title" class="garson-ai-widget__title">Mutfak Performansı</h2>
      <p class="garson-ai-widget__score">${kitchen.score}<span>/100</span></p>
      <p class="garson-ai-widget__badge">${kitchen.statusLabel}</p>
      <dl class="garson-ai-metrics garson-ai-metrics--compact">
        <div><dt>Ort. hazırlık</dt><dd>${kitchen.avgPreparationTime} dk</dd></div>
        <div><dt>Gecikme oranı</dt><dd>%${delayedPct}</dd></div>
      </dl>
    </section>
  `.trim();
}

/**
 * @param {import('./ai-dashboard-service.js').DashboardCustomerSummary} customers
 * @returns {string}
 */
export function renderCustomerInsight(customers) {
  return `
    <section class="garson-ai-widget" aria-labelledby="garson-ai-customers-title">
      <h2 id="garson-ai-customers-title" class="garson-ai-widget__title">Müşteri Analizi</h2>
      <dl class="garson-ai-metrics">
        <div><dt>Toplam müşteri</dt><dd>${customers.totalCustomers}</dd></div>
        <div><dt>VIP müşteri</dt><dd>${customers.vipCount}</dd></div>
        <div><dt>Tekrar sipariş</dt><dd>${customers.repeatCount}</dd></div>
        <div><dt>Pasif müşteri</dt><dd>${customers.inactiveCount}</dd></div>
      </dl>
    </section>
  `.trim();
}

/**
 * @param {import('./ai-dashboard-service.js').DashboardRecommendations} recommendations
 * @returns {string}
 */
export function renderAIAdvice(recommendations) {
  const adviceItems = (recommendations.advice || [])
    .map((line) => `<li>${line}</li>`)
    .join('');
  const campaignItems = (recommendations.campaigns || [])
    .map((campaign) => `<li>${campaign.message}</li>`)
    .join('');
  const discountItems = (recommendations.discounts || [])
    .map((line) => `<li>${line}</li>`)
    .join('');

  return `
    <section class="garson-ai-widget garson-ai-widget--wide" aria-labelledby="garson-ai-advice-title">
      <h2 id="garson-ai-advice-title" class="garson-ai-widget__title">AI Önerileri</h2>
      ${
        adviceItems
          ? `<div class="garson-ai-widget__list-wrap"><p class="garson-ai-widget__subtitle">Performans önerileri</p><ul class="garson-ai-widget__list">${adviceItems}</ul></div>`
          : ''
      }
      ${
        campaignItems
          ? `<div class="garson-ai-widget__list-wrap"><p class="garson-ai-widget__subtitle">Kampanya fikirleri</p><ul class="garson-ai-widget__list">${campaignItems}</ul></div>`
          : ''
      }
      ${
        discountItems
          ? `<div class="garson-ai-widget__list-wrap"><p class="garson-ai-widget__subtitle">Akıllı indirimler</p><ul class="garson-ai-widget__list">${discountItems}</ul></div>`
          : ''
      }
    </section>
  `.trim();
}

/**
 * @param {import('./ai-dashboard-service.js').RestaurantDashboardReport} dashboard
 * @returns {string}
 */
export function renderAdminAiStatCardsHtml(dashboard) {
  const topAdvice =
    dashboard.recommendations.highlights?.[0] ||
    dashboard.recommendations.advice?.[0] ||
    'AI önerileri hazırlanıyor.';

  const cards = [
    {
      id: 'daily-revenue',
      label: 'Günlük ciro',
      value: formatCurrencyTry(dashboard.sales.dailyRevenue),
      hint: 'Bugünkü tamamlanan siparişler'
    },
    {
      id: 'order-count',
      label: 'Sipariş sayısı',
      value: String(dashboard.sales.orderCount),
      hint: 'Bugünkü sipariş adedi'
    },
    {
      id: 'average-basket',
      label: 'Ortalama sepet',
      value: formatCurrencyTry(dashboard.sales.averageBasket),
      hint: 'Sipariş başına ortalama tutar'
    },
    {
      id: 'kitchen-score',
      label: 'Mutfak performans skoru',
      value: `${dashboard.kitchen.score}/100`,
      hint: dashboard.kitchen.statusLabel
    },
    {
      id: 'vip-customers',
      label: 'VIP müşteri sayısı',
      value: String(dashboard.customers.vipCount),
      hint: `${dashboard.customers.totalCustomers} müşteri içinde`
    },
    {
      id: 'ai-advice',
      label: 'AI önerileri',
      value: String(
        (dashboard.recommendations.advice?.length || 0) +
          (dashboard.recommendations.campaigns?.length || 0)
      ),
      hint: topAdvice.length > 72 ? `${topAdvice.slice(0, 69)}…` : topAdvice
    }
  ];

  return cards
    .map(
      (card) => `
    <article class="garson-admin-stat-card garson-ai-stat-card" id="garson-ai-stat-${card.id}">
      <p class="garson-admin-stat-card__label">${card.label}</p>
      <p class="garson-admin-stat-card__value">${card.value}</p>
      <p class="garson-admin-stat-card__hint">${card.hint}</p>
    </article>
  `.trim()
    )
    .join('');
}

/**
 * @param {import('./ai-dashboard-service.js').RestaurantDashboardReport} dashboard
 * @returns {string}
 */
export function renderAiDashboardPageHtml(dashboard) {
  return `
    <div class="garson-ai-dashboard-grid">
      ${renderSalesInsight(dashboard.sales)}
      ${renderKitchenInsight(dashboard.kitchen)}
      ${renderCustomerInsight(dashboard.customers)}
      ${renderAIAdvice(dashboard.recommendations)}
    </div>
  `.trim();
}
