/**
 * P6 — B2B pricing strategy helpers (tier fit, talk tracks, ROI band).
 */
import { PARTNER_PRODUCT_TIERS, normalizeBillingPlan } from '../partner/partner-offers.js';

const BANDS = {
  starter: { cplMin: 5000, cplMax: 12000, pilotLeads: 5 },
  growth: { monthlyMin: 25000, monthlyMax: 120000 },
  enterprise: { platformMin: 150000 }
};

/**
 * @param {object} qualification
 */
export function recommendPartnerTier(qualification = {}) {
  const volume = Number(
    qualification.monthly_lead_volume ||
      qualification.lead_volume ||
      qualification.expected_leads ||
      0
  );
  const category = String(qualification.category || qualification.partner_type || '').toLowerCase();

  if (volume >= 150 || category.includes('enterprise') || category.includes('network')) {
    return { tierId: 'enterprise', reason: 'Yüksek hacim veya çoklu lokasyon' };
  }
  if (volume >= 40) {
    return { tierId: 'growth', reason: 'Orta ölçek lead hacmi' };
  }
  return { tierId: 'starter', reason: 'Pilot sonrası CPL veya düşük hacim' };
}

/**
 * @param {string} tierId
 */
export function getPricingTalkTrack(tierId) {
  const tier = PARTNER_PRODUCT_TIERS.find((t) => t.id === normalizeBillingPlan(tierId)) || PARTNER_PRODUCT_TIERS[0];
  const band = BANDS[tier.id] || BANDS.starter;

  let bandLine = tier.priceNote;
  if (tier.id === 'starter' && band.cplMin) {
    bandLine = `Referans CPL bandı ₺${band.cplMin.toLocaleString('tr-TR')}–₺${band.cplMax.toLocaleString('tr-TR')} (teklif ile netleşir). Pilot: ${band.pilotLeads} lead.`;
  }
  if (tier.id === 'growth' && band.monthlyMin) {
    bandLine = `Aylık kapasite referansı ₺${band.monthlyMin.toLocaleString('tr-TR')}–₺${band.monthlyMax.toLocaleString('tr-TR')}.`;
  }
  if (tier.id === 'enterprise' && band.platformMin) {
    bandLine = `Platform + hacim; referans alt band ₺${band.platformMin.toLocaleString('tr-TR')}+ (SOW).`;
  }

  return {
    tierId: tier.id,
    headline: tier.priceLabel,
    bandLine,
    anchors: tier.highlights,
    objectionHook: 'Fiyat listesi yok — şeffaf bant + sözleşme; sahte indirim yok.'
  };
}

/**
 * @param {{ tierId?: string, monthlyLeads?: number, closeRate?: number, avgDealValue?: number }} inputs
 */
export function estimatePartnerPipelineValue(inputs = {}) {
  const leads = Number(inputs.monthlyLeads || 50);
  const closeRate = Number(inputs.closeRate || 0.08);
  const avgDeal = Number(inputs.avgDealValue || 450000);
  const gross = leads * closeRate * avgDeal;
  const tier = normalizeBillingPlan(inputs.tierId || 'starter');
  const costBand =
    tier === 'enterprise'
      ? BANDS.enterprise.platformMin
      : tier === 'growth'
        ? BANDS.growth.monthlyMin
        : BANDS.starter.cplMin * Math.min(leads, 50);

  return {
    estimatedMonthlyGrossTry: Math.round(gross),
    estimatedPlatformCostTry: costBand,
    roughRoiMultiple: costBand ? Number((gross / costBand).toFixed(1)) : null
  };
}
