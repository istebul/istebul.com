/**
 * Ownership Cost — breakdown builder (Sprint-21 v1).
 */

/**
 * @param {number} value
 * @returns {string}
 */
export function formatCostTry(value) {
  const n = Math.round(Number(value) || 0);
  return `${n.toLocaleString('tr-TR')} TRY`;
}

/**
 * @param {'vehicle'|'housing'|'travel'|string} category
 * @param {Record<string, unknown>} model
 * @returns {Array<{ key: string, label: string, amount: number, period: 'one_time'|'annual'|'total' }>}
 */
export function buildCostBreakdown(category, model) {
  const cat = String(category ?? 'vehicle').toLowerCase();

  if (cat === 'housing' || cat === 'real_estate' || cat === 'konut') {
    return [
      { key: 'purchase_price', label: 'Satın alma / ilan fiyatı', amount: Number(model.purchase_price ?? 0), period: 'one_time' },
      { key: 'aidat_annual', label: 'Aidat (yıllık tahmin)', amount: Number(model.aidat_annual ?? 0), period: 'annual' },
      { key: 'maintenance_annual', label: 'Bakım (yıllık tahmin)', amount: Number(model.maintenance_annual ?? 0), period: 'annual' },
      { key: 'tax_annual', label: 'Vergi (yıllık tahmin)', amount: Number(model.tax_annual ?? 0), period: 'annual' },
      { key: 'insurance_annual', label: 'Sigorta (yıllık tahmin)', amount: Number(model.insurance_annual ?? 0), period: 'annual' },
      { key: 'credit_placeholder', label: 'Kredi maliyeti (placeholder)', amount: Number(model.credit_placeholder ?? 0), period: 'one_time' },
      { key: 'moving_cost', label: 'Taşınma maliyeti (tahmin)', amount: Number(model.moving_cost ?? 0), period: 'one_time' },
      { key: 'total_ownership', label: 'Toplam sahip olma maliyeti', amount: Number(model.total_ownership ?? 0), period: 'total' }
    ];
  }

  if (cat === 'vacation' || cat === 'travel' || cat === 'tatil') {
    return [
      { key: 'accommodation', label: 'Konaklama (tahmin)', amount: Number(model.accommodation ?? 0), period: 'one_time' },
      { key: 'transport', label: 'Ulaşım (tahmin)', amount: Number(model.transport ?? 0), period: 'one_time' },
      { key: 'food', label: 'Yemek (tahmin)', amount: Number(model.food ?? 0), period: 'one_time' },
      { key: 'extra_fees', label: 'Ek ücretler (tahmin)', amount: Number(model.extra_fees ?? 0), period: 'one_time' },
      { key: 'cancel_risk_buffer', label: 'İptal riski tamponu', amount: Number(model.cancel_risk_buffer ?? 0), period: 'one_time' },
      { key: 'season_adjustment', label: 'Sezon farkı (tahmin)', amount: Number(model.season_adjustment ?? 0), period: 'one_time' },
      { key: 'total_trip', label: 'Toplam tatil maliyeti', amount: Number(model.total_trip ?? 0), period: 'total' }
    ];
  }

  return [
    { key: 'purchase_price', label: 'Satın alma / ilan fiyatı', amount: Number(model.purchase_price ?? 0), period: 'one_time' },
    { key: 'fuel_annual', label: 'Yakıt (yıllık tahmin)', amount: Number(model.fuel_annual ?? 0), period: 'annual' },
    { key: 'maintenance_annual', label: 'Bakım (yıllık tahmin)', amount: Number(model.maintenance_annual ?? 0), period: 'annual' },
    { key: 'insurance_annual', label: 'Sigorta / kasko (yıllık tahmin)', amount: Number(model.insurance_annual ?? 0), period: 'annual' },
    { key: 'mtv_annual', label: 'MTV (yıllık tahmin)', amount: Number(model.mtv_annual ?? 0), period: 'annual' },
    { key: 'ekspertiz', label: 'Ekspertiz (tahmin)', amount: Number(model.ekspertiz ?? 0), period: 'one_time' },
    { key: 'depreciation_total', label: 'Değer kaybı (tahmin)', amount: Number(model.depreciation_total ?? 0), period: 'one_time' },
    { key: 'total_ownership', label: 'Toplam sahip olma maliyeti', amount: Number(model.total_ownership ?? 0), period: 'total' }
  ];
}
