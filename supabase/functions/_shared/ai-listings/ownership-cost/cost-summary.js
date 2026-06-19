/**
 * Ownership Cost — safe Turkish summary (Sprint-21 v1).
 */

/** @type {ReadonlyArray<string>} */
export const COST_FORBIDDEN_PHRASES = Object.freeze([
  'kesin maliyet',
  'garanti',
  'kazandırır',
  'yatırım tavsiyesi',
  'gerçek değer',
  'kesin değer',
  'garantili'
]);

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeCostSummary(text) {
  let safe = String(text ?? '').trim();
  for (const phrase of COST_FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    safe = safe.replace(regex, 'tahmini');
  }
  return safe;
}

/**
 * @param {'low'|'medium'|'high'|string} level
 * @returns {string}
 */
export function buildCostRiskLabel(level) {
  if (level === 'low') return 'Düşük maliyet riski';
  if (level === 'high') return 'Yüksek maliyet riski';
  return 'Orta maliyet riski';
}

/**
 * @param {number} riskScore
 * @param {number} qualityScore
 * @param {number} confidence
 * @returns {'low'|'medium'|'high'}
 */
export function classifyCostRiskLevel(riskScore, qualityScore, confidence) {
  const risk = Number(riskScore) || 50;
  const quality = Number(qualityScore) || 50;
  const conf = Number(confidence) || 50;

  if (risk >= 65 || quality < 45 || conf < 40) return 'high';
  if (risk <= 35 && quality >= 70 && conf >= 60) return 'low';
  return 'medium';
}

/**
 * @param {'vehicle'|'housing'|'travel'|string} category
 * @param {Record<string, unknown>} input
 * @returns {string[]}
 */
export function buildCostAssumptions(category, input) {
  const cat = String(category ?? 'vehicle').toLowerCase();
  const city = String(input.city ?? 'belirtilmedi');
  const usage = String(input.usage_type ?? 'family');
  const annualKm = Number(input.annual_km ?? 15000);
  const years = Number(input.ownership_period ?? (cat.includes('vacation') || cat === 'travel' || cat === 'tatil' ? 7 : 5));

  const base = [
    'Maliyet kalemleri mevcut ilan ve profil bilgilerine dayalı ön değerlendirmedir.',
    `Şehir varsayımı: ${city}.`,
    `Kullanım tipi: ${usage}.`
  ];

  if (cat === 'housing' || cat === 'real_estate' || cat === 'konut') {
    return [
      ...base,
      `Sahiplik süresi varsayımı: ${years} yıl.`,
      'Kredi maliyeti placeholder olarak hesaplanmıştır; banka teklifi ile doğrulama önerilir.',
      'Aidat ve vergi kalemleri bölgesel farklılık gösterebilir.'
    ];
  }

  if (cat === 'vacation' || cat === 'travel' || cat === 'tatil') {
    return [
      ...base,
      `Tatil süresi varsayımı: ${years} gün.`,
      'Sezon farkı piyasa verisi sınırlıysa geniş bantta okunmalıdır.',
      'İptal riski tamponu operatör koşullarına göre değişebilir.'
    ];
  }

  return [
    ...base,
    `Yıllık km varsayımı: ${annualKm.toLocaleString('tr-TR')} km.`,
    `Sahiplik süresi varsayımı: ${years} yıl.`,
    'Yakıt ve sigorta kalemleri güncel tekliflerle doğrulanmalıdır.'
  ];
}

/**
 * @param {Record<string, unknown>} input
 * @param {'low'|'medium'|'high'} costRiskLevel
 * @returns {string[]}
 */
export function buildCostWarnings(input, costRiskLevel) {
  const warnings = ['Bu çıktı bağlayıcı maliyet teklifi değildir; doğrulama önerilir.'];
  const risk = Number(input.risk_score ?? 50);
  const priceIntel = /** @type {Record<string, unknown>} */ (input.price_intelligence ?? {});
  const marketIntel = /** @type {Record<string, unknown>} */ (input.market_intelligence ?? {});

  if (risk >= 60) {
    warnings.push('Risk skoru yüksek — maliyet sapması daha geniş bir bantta olabilir.');
  }
  if (priceIntel.overpriced === true || priceIntel.signal === 'high') {
    warnings.push('Fiyat zekâsı ilan fiyatının piyasa üstü olabileceğini işaret ediyor.');
  }
  if (marketIntel.liquidity === 'low' || marketIntel.demand === 'low') {
    warnings.push('Piyasa likiditesi düşük görünüyor; değer kaybı tahmini genişletilmiştir.');
  }
  if (costRiskLevel === 'high') {
    warnings.push('Maliyet risk seviyesi yüksek — ön değerlendirme ile teklif toplama önerilir.');
  }
  if (!input.listing_price) {
    warnings.push('İlan fiyatı eksik; toplam maliyet tahmini sınırlı güvenle üretilmiştir.');
  }

  return warnings;
}

/**
 * @param {'vehicle'|'housing'|'travel'|string} category
 * @param {number} totalCost
 * @param {'low'|'medium'|'high'} costRiskLevel
 * @returns {string}
 */
export function buildCostSummaryText(category, totalCost, costRiskLevel) {
  const cat = String(category ?? 'vehicle').toLowerCase();
  const formatted = Math.round(totalCost).toLocaleString('tr-TR');
  const riskLabel = buildCostRiskLabel(costRiskLevel);

  if (cat === 'vacation' || cat === 'travel' || cat === 'tatil') {
    return sanitizeCostSummary(
      `Mevcut bilgiler ışığında toplam tatil maliyeti yaklaşık ${formatted} TRY olarak ön değerlendirilmiştir. ${riskLabel}; doğrulama önerilir.`
    );
  }

  return sanitizeCostSummary(
    `Mevcut bilgiler ışığında toplam sahip olma maliyeti yaklaşık ${formatted} TRY olarak ön değerlendirilmiştir. ${riskLabel}; doğrulama önerilir.`
  );
}
