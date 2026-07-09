/**
 * GarsonAI smart discount recommendation engine.
 */

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/**
 * @param {{ customers?: import('./customer-analyzer.js').CustomerAnalysis, revenue?: import('./revenue-predictor.js').RevenuePrediction, peakHours?: { quietHours?: Array<{ hour: number, orderCount?: number }> }, orders?: unknown[], now?: Date }} data
 * @returns {string[]}
 */
export function generateSmartDiscounts(data = {}) {
  const customers = data.customers;
  const revenue = data.revenue;
  const quietHours = data.peakHours?.quietHours || [];
  const now = data.now instanceof Date ? data.now : new Date();

  /** @type {string[]} */
  const discounts = [];

  if (customers?.inactiveCustomers?.length) {
    discounts.push(
      `${customers.inactiveCustomers.length} pasif müşteri için %15 geri dönüş kuponu önerilir.`
    );
  }

  if (customers?.vipCustomers?.length) {
    discounts.push('VIP müşterilere özel sadakat indirimi ve ücretsiz içecek hediyesi sunulabilir.');
  }

  const dayName = DAY_NAMES[now.getDay()] || 'hafta içi';
  if (dayName === 'Salı' || quietHours.length) {
    discounts.push('Salı günleri düşük satış için combo kampanya önerilir.');
  }

  if (revenue?.trend === 'down') {
    discounts.push('Düşen ciro trendi için hafta içi 2 al 1 öde kampanyası test edilebilir.');
  }

  if (quietHours[0]) {
    discounts.push(
      `${String(quietHours[0].hour).padStart(2, '0')}:00 sakin saatlerde sepete %10 indirim uygulanabilir.`
    );
  }

  if (!discounts.length) {
    discounts.push('Mevcut satış performansı dengeli; hedefli mini indirimlerle yeni ürünleri denetin.');
  }

  return discounts;
}
