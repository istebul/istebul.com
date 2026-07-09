/**
 * GarsonAI restaurant AI advisor (rule-based Turkish recommendations).
 */

/**
 * @typedef {Object} AdvisorInput
 * @property {import('./sales-analyzer.js').SalesAnalysis} [sales]
 * @property {import('./peak-hours.js').PeakHoursAnalysis} [peakHours]
 * @property {import('./menu-insights.js').MenuInsights} [menuInsights]
 * @property {import('./performance-engine.js').PerformanceAnalysis} [performance]
 */

/**
 * @param {number} hour
 * @returns {string}
 */
function formatHourLabel(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

/**
 * @param {AdvisorInput} data
 * @returns {string[]}
 */
export function generateRestaurantAdvice(data = {}) {
  const sales = data.sales;
  const peakHours = data.peakHours;
  const menuInsights = data.menuInsights;
  const performance = data.performance;

  /** @type {string[]} */
  const advice = [];

  if (sales) {
    if (sales.totalOrders === 0) {
      advice.push('Henüz yeterli sipariş verisi yok; kampanya ve WhatsApp sipariş kanalını güçlendirin.');
    } else {
      advice.push(
        `Son dönemde ${sales.totalOrders} sipariş ve ${sales.totalRevenue} TL ciro oluştu; ortalama sepet ${sales.averageBasket} TL.`
      );
      if (sales.topProducts[0]) {
        advice.push(
          `${sales.topProducts[0].name} en çok satan ürün; stok ve mutfak hazırlığını bu ürün için önceliklendirin.`
        );
      }
    }
  }

  if (peakHours?.busiestHours?.length) {
    const busiest = peakHours.busiestHours
      .map((entry) => `${formatHourLabel(entry.hour)} (${entry.orderCount} sipariş)`)
      .join(', ');
    advice.push(`Yoğun saatler: ${busiest}. Bu saatlerde mutfak personelini artırın.`);

    if (peakHours.quietHours?.length) {
      const quiet = peakHours.quietHours
        .map((entry) => formatHourLabel(entry.hour))
        .join(', ');
      advice.push(`Sakin saatler: ${quiet}. Bu aralıkta hedefli indirim veya paket menü deneyin.`);
    }
  }

  if (menuInsights?.recommendations?.length) {
    advice.push(...menuInsights.recommendations.slice(0, 2));
  }

  if (performance) {
    if (performance.delayedRate > 0.2) {
      advice.push(
        `Mutfak gecikme oranı %${Math.round(performance.delayedRate * 100)}; hazırlık sürecini sadeleştirin ve yoğun saat kuyruğunu izleyin.`
      );
    } else {
      advice.push(
        `Ortalama hazırlık süresi ${performance.avgPreparationTime} dakika; operasyon skoru ${performance.score}/100.`
      );
    }
  }

  if (!advice.length) {
    advice.push('Restoran performansını izlemek için daha fazla sipariş verisi toplayın.');
  }

  return advice;
}
