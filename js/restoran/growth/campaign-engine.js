/**
 * GarsonAI campaign suggestion engine.
 */

/**
 * @typedef {Object} CampaignSuggestion
 * @property {'campaign'} type
 * @property {string} message
 */

/**
 * @param {{ customers?: import('./customer-analyzer.js').CustomerAnalysis, revenue?: import('./revenue-predictor.js').RevenuePrediction, peakHours?: { quietHours?: Array<{ hour: number }> } }} data
 * @returns {CampaignSuggestion[]}
 */
export function generateCampaignSuggestions(data = {}) {
  const customers = data.customers;
  const revenue = data.revenue;
  const quietHours = data.peakHours?.quietHours || [];

  /** @type {CampaignSuggestion[]} */
  const campaigns = [];

  if (customers?.inactiveCustomers?.length) {
    campaigns.push({
      type: 'campaign',
      message: `${customers.inactiveCustomers.length} müşteri 30 gündür sipariş vermiyor; geri kazanım indirimi gönderilebilir.`
    });
  }

  if (customers?.vipCustomers?.length) {
    campaigns.push({
      type: 'campaign',
      message: `${customers.vipCustomers.length} VIP müşteri için sadakat kampanyası ve öncelikli teklif planlayın.`
    });
  }

  if (customers?.repeatCustomers?.length && customers.totalCustomers > 0) {
    const repeatRate = customers.repeatCustomers.length / customers.totalCustomers;
    if (repeatRate < 0.35) {
      campaigns.push({
        type: 'campaign',
        message:
          'Tekrar sipariş oranı düşük; ikinci siparişe özel kupon ile müşteri bağlılığını artırın.'
      });
    }
  }

  if (revenue?.trend === 'down') {
    campaigns.push({
      type: 'campaign',
      message:
        'Satış trendi düşüşte; hafta içi hedefli kampanya ve paket menü ile ciroyu destekleyin.'
    });
  }

  if (quietHours.length) {
    const hour = quietHours[0].hour;
    campaigns.push({
      type: 'campaign',
      message: `${String(hour).padStart(2, '0')}:00 civarı sakin saatler için saatlik indirim kampanyası deneyin.`
    });
  }

  if (!campaigns.length) {
    campaigns.push({
      type: 'campaign',
      message: 'Mevcut müşteri tabanı dengeli; haftalık WhatsApp duyurusu ile yeni ürünleri tanıtın.'
    });
  }

  return campaigns;
}
