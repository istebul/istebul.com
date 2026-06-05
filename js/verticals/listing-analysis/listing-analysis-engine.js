/**
 * AI İlan Analizi V1 — deterministik karar motoru.
 * Canonical skorlar yalnızca bu modülden üretilir; AI skoru değiştiremez.
 */

const CURRENT_YEAR = new Date().getFullYear();

function safeNumber(value) {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function clampScore(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

function cleanText(value, max = 120) {
  return String(value ?? '').trim().slice(0, max);
}

function riskFromScore(score) {
  if (score >= 70) return 'düşük';
  if (score >= 45) return 'orta';
  return 'yüksek';
}

function scoreLabel(score) {
  if (score >= 80) return 'Çok uygun';
  if (score >= 65) return 'Uygun';
  if (score >= 45) return 'Dikkatli değerlendir';
  return 'Riskli ilan';
}

const VEHICLE_FUEL_ANNUAL_COST = {
  benzin: 42000,
  dizel: 36000,
  lpg: 30000,
  hibrit: 24000,
  elektrik: 12000
};

const HOUSING_SQM_BENCHMARK = {
  default: 28000,
  istanbul: 45000,
  ankara: 32000,
  izmir: 38000,
  antalya: 35000,
  bursa: 30000
};

function normalizeCityKey(city) {
  const key = cleanText(city, 40).toLocaleLowerCase('tr-TR');
  if (key.includes('istanbul') || key.includes('İstanbul'.toLocaleLowerCase('tr-TR'))) return 'istanbul';
  if (key.includes('ankara')) return 'ankara';
  if (key.includes('izmir')) return 'izmir';
  if (key.includes('antalya')) return 'antalya';
  if (key.includes('bursa')) return 'bursa';
  return 'default';
}

function computeConfidenceScore(type, input) {
  let filled = 0;
  let total = 0;

  if (type === 'vehicle') {
    const fields = ['marka', 'model', 'yil', 'km', 'yakit_turu', 'fiyat', 'il'];
    total = fields.length;
    fields.forEach((f) => {
      if (cleanText(input[f])) filled += 1;
    });
    let score = Math.round((filled / total) * 55);
    if (cleanText(input.il)) score += 20;
    if (cleanText(input.marka) && cleanText(input.model)) score += 15;
    if (safeNumber(input.yil) > 0 && safeNumber(input.km) >= 0) score += 10;
    return clampScore(score);
  }

  const fields = ['il', 'ilce', 'metrekare', 'oda_sayisi', 'bina_yasi', 'fiyat', 'kullanim_amaci'];
  total = fields.length;
  fields.forEach((f) => {
    if (cleanText(input[f])) filled += 1;
  });
  let score = Math.round((filled / total) * 50);
  if (cleanText(input.il) && cleanText(input.ilce)) score += 25;
  if (safeNumber(input.metrekare) > 0 && safeNumber(input.fiyat) > 0) score += 15;
  if (safeNumber(input.bina_yasi) >= 0) score += 10;
  return clampScore(score);
}

/**
 * @param {'vehicle'|'housing'} type
 * @param {object} input
 */
export function validateListingInput(type, input = {}) {
  const errors = [];

  if (type === 'vehicle') {
    if (!cleanText(input.marka)) errors.push('Marka zorunludur.');
    if (!cleanText(input.model)) errors.push('Model zorunludur.');
    const year = safeNumber(input.yil);
    if (!year || year < 1990 || year > CURRENT_YEAR + 1) errors.push('Geçerli bir model yılı girin.');
    const km = safeNumber(input.km);
    if (km < 0 || km > 1_500_000) errors.push('Geçerli bir kilometre değeri girin.');
    if (!cleanText(input.yakit_turu)) errors.push('Yakıt türü seçin.');
    const price = safeNumber(input.fiyat);
    if (!price || price < 50_000) errors.push('Geçerli bir fiyat girin.');
    return { valid: errors.length === 0, errors };
  }

  if (type === 'housing') {
    if (!cleanText(input.il)) errors.push('İl zorunludur.');
    if (!cleanText(input.ilce)) errors.push('İlçe zorunludur.');
    const sqm = safeNumber(input.metrekare);
    if (!sqm || sqm < 20 || sqm > 2000) errors.push('Geçerli bir m² değeri girin.');
    const rooms = safeNumber(input.oda_sayisi);
    if (!rooms || rooms < 1 || rooms > 20) errors.push('Geçerli bir oda sayısı girin.');
    const age = safeNumber(input.bina_yasi);
    if (age < 0 || age > 120) errors.push('Geçerli bir bina yaşı girin.');
    const price = safeNumber(input.fiyat);
    if (!price || price < 100_000) errors.push('Geçerli bir fiyat girin.');
    const usage = cleanText(input.kullanim_amaci);
    if (!['oturum', 'yatirim', 'belirsiz'].includes(usage)) errors.push('Kullanım amacı seçin.');
    return { valid: errors.length === 0, errors };
  }

  return { valid: false, errors: ['Geçersiz ilan türü.'] };
}

export function analyzeVehicleListing(input = {}) {
  const year = safeNumber(input.yil);
  const km = safeNumber(input.km);
  const price = safeNumber(input.fiyat);
  const fuel = cleanText(input.yakit_turu, 20) || 'benzin';
  const ageYears = Math.max(0, CURRENT_YEAR - year);

  let decisionScore = 58;
  const factors = [];
  const strengths = [];
  const weaknesses = [];

  if (ageYears <= 3) {
    decisionScore += 18;
    strengths.push('Güncel model yılı düşük amortisman riski sunar.');
    factors.push({ key: 'year', label: 'Model yılı', impact: 'positive', detail: `${year} — düşük yaş` });
  } else if (ageYears <= 7) {
    decisionScore += 10;
    strengths.push('Orta yaş bandında makul değerleme potansiyeli.');
    factors.push({ key: 'year', label: 'Model yılı', impact: 'neutral', detail: `${year}` });
  } else if (ageYears <= 12) {
    decisionScore -= 4;
    weaknesses.push('Araç yaşı bakım ve yenileme maliyetlerini artırabilir.');
    factors.push({ key: 'year', label: 'Model yılı', impact: 'negative', detail: `${year} — orta-yüksek yaş` });
  } else {
    decisionScore -= 16;
    weaknesses.push('Eski model yılı teknik risk ve değer kaybı baskısı oluşturur.');
    factors.push({ key: 'year', label: 'Model yılı', impact: 'negative', detail: `${year} — yüksek yaş` });
  }

  if (km <= 50_000) {
    decisionScore += 12;
    strengths.push('Düşük kilometre kullanım izlenimi güçlendirir.');
    factors.push({ key: 'km', label: 'Kilometre', impact: 'positive', detail: `${km.toLocaleString('tr-TR')} km` });
  } else if (km <= 100_000) {
    decisionScore += 6;
    factors.push({ key: 'km', label: 'Kilometre', impact: 'neutral', detail: `${km.toLocaleString('tr-TR')} km` });
  } else if (km <= 180_000) {
    decisionScore -= 6;
    weaknesses.push('Yüksek kilometre mekanik aşınma riskini artırır.');
    factors.push({ key: 'km', label: 'Kilometre', impact: 'negative', detail: `${km.toLocaleString('tr-TR')} km` });
  } else {
    decisionScore -= 14;
    weaknesses.push('Çok yüksek kilometre bakım ve satış likiditesi riski taşır.');
    factors.push({ key: 'km', label: 'Kilometre', impact: 'negative', detail: `${km.toLocaleString('tr-TR')} km` });
  }

  const expectedPrice = Math.max(120_000, 1_450_000 - ageYears * 55_000 - Math.floor(km / 1000) * 420);
  const priceRatio = price / expectedPrice;
  let priceFit = 72;

  if (priceRatio <= 0.88) {
    priceFit += 18;
    strengths.push('Fiyat bandı model profiline göre uygun görünüyor.');
    factors.push({ key: 'price', label: 'Fiyat uygunluğu', impact: 'positive', detail: 'Beklenen bandın altında' });
  } else if (priceRatio <= 1.05) {
    priceFit += 6;
    factors.push({ key: 'price', label: 'Fiyat uygunluğu', impact: 'neutral', detail: 'Beklenen banda yakın' });
  } else if (priceRatio <= 1.2) {
    priceFit -= 12;
    weaknesses.push('Fiyat beklentinin üzerinde; pazarlık marjı sınırlı olabilir.');
    factors.push({ key: 'price', label: 'Fiyat uygunluğu', impact: 'negative', detail: 'Beklenen bandın üstünde' });
  } else {
    priceFit -= 24;
    weaknesses.push('Fiyat profili agresif; değerleme uyumsuzluğu riski yüksek.');
    factors.push({ key: 'price', label: 'Fiyat uygunluğu', impact: 'negative', detail: 'Belirgin yüksek fiyat' });
  }

  decisionScore += Math.round((priceFit - 60) * 0.25);
  priceFit = clampScore(priceFit);

  const annualFuel = VEHICLE_FUEL_ANNUAL_COST[fuel] || VEHICLE_FUEL_ANNUAL_COST.benzin;
  const maintenance = Math.max(8000, 14000 + ageYears * 900 + Math.floor(km / 50_000) * 2500);
  const insurance = Math.max(6000, Math.round(price * 0.028));
  const totalCostEstimate = {
    purchasePrice: price,
    annualFuelCost: annualFuel,
    annualMaintenance: maintenance,
    annualInsurance: insurance,
    firstYearTotal: price + annualFuel + maintenance + insurance,
    currency: 'TRY',
    note: 'İlk yıl toplam sahiplik maliyeti tahminidir.'
  };

  if (fuel === 'elektrik' || fuel === 'hibrit') {
    strengths.push('Yakıt maliyeti düşük enerji profili avantaj sağlar.');
  } else if (fuel === 'benzin') {
    weaknesses.push('Benzinli profil yıllık yakıt maliyetini yükseltir.');
  }

  if (cleanText(input.il)) {
    strengths.push('Konum bilgisi mevcut; bölgesel piyasa bağlamı güçlendirildi.');
    factors.push({ key: 'location', label: 'Konum', impact: 'positive', detail: cleanText(input.il) });
  }

  decisionScore = clampScore(decisionScore);
  const confidenceScore = computeConfidenceScore('vehicle', input);
  const riskScore = 100 - decisionScore + (ageYears > 10 ? 8 : 0) + (km > 150_000 ? 10 : 0);
  const riskLevel = riskFromScore(100 - clampScore(riskScore));

  return {
    listingType: 'vehicle',
    decisionScore,
    confidenceScore,
    priceFit,
    riskLevel,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    totalCostEstimate,
    summary: `${cleanText(input.marka)} ${cleanText(input.model)} (${year}) için karar skoru ${decisionScore}/100.`,
    factors,
    scoreLabel: scoreLabel(decisionScore),
    inputSnapshot: {
      marka: cleanText(input.marka),
      model: cleanText(input.model),
      yil: year,
      km,
      yakit_turu: fuel,
      fiyat: price,
      il: cleanText(input.il)
    }
  };
}

export function analyzeHousingListing(input = {}) {
  const sqm = safeNumber(input.metrekare);
  const price = safeNumber(input.fiyat);
  const buildingAge = safeNumber(input.bina_yasi);
  const usage = cleanText(input.kullanim_amaci) || 'oturum';
  const cityKey = normalizeCityKey(input.il);
  const sqmPrice = sqm > 0 ? price / sqm : 0;
  const benchmark = HOUSING_SQM_BENCHMARK[cityKey] || HOUSING_SQM_BENCHMARK.default;

  let decisionScore = 56;
  let priceFit = 68;
  const factors = [];
  const strengths = [];
  const weaknesses = [];

  if (sqmPrice > 0 && sqmPrice <= benchmark * 0.9) {
    priceFit += 20;
    strengths.push('m² fiyatı bölge referansının altında; fiyat uygunluğu güçlü.');
    factors.push({ key: 'sqm_price', label: 'm² fiyatı', impact: 'positive', detail: `${Math.round(sqmPrice).toLocaleString('tr-TR')} ₺/m²` });
  } else if (sqmPrice <= benchmark * 1.08) {
    priceFit += 8;
    factors.push({ key: 'sqm_price', label: 'm² fiyatı', impact: 'neutral', detail: `${Math.round(sqmPrice).toLocaleString('tr-TR')} ₺/m²` });
  } else if (sqmPrice <= benchmark * 1.25) {
    priceFit -= 14;
    weaknesses.push('m² fiyatı bölge ortalamasının üzerinde.');
    factors.push({ key: 'sqm_price', label: 'm² fiyatı', impact: 'negative', detail: 'Referansın üstünde' });
  } else {
    priceFit -= 26;
    weaknesses.push('Agresif m² fiyatı likidite ve değerleme riski oluşturur.');
    factors.push({ key: 'sqm_price', label: 'm² fiyatı', impact: 'negative', detail: 'Belirgin yüksek' });
  }

  if (buildingAge <= 5) {
    decisionScore += 14;
    strengths.push('Yeni veya genç bina yapısı bakım riskini düşürür.');
    factors.push({ key: 'building_age', label: 'Bina yaşı', impact: 'positive', detail: `${buildingAge} yıl` });
  } else if (buildingAge <= 15) {
    decisionScore += 4;
    factors.push({ key: 'building_age', label: 'Bina yaşı', impact: 'neutral', detail: `${buildingAge} yıl` });
  } else if (buildingAge <= 30) {
    decisionScore -= 8;
    weaknesses.push('Orta-yüksek bina yaşı yenileme ihtiyacı doğurabilir.');
    factors.push({ key: 'building_age', label: 'Bina yaşı', impact: 'negative', detail: `${buildingAge} yıl` });
  } else {
    decisionScore -= 16;
    weaknesses.push('Eski bina stoku deprem ve tadilat riskini artırır.');
    factors.push({ key: 'building_age', label: 'Bina yaşı', impact: 'negative', detail: `${buildingAge} yıl` });
  }

  if (usage === 'yatirim') {
    if (priceFit >= 70) {
      decisionScore += 6;
      strengths.push('Yatırım profili için fiyat/likidite dengesi olumlu.');
    } else {
      decisionScore -= 10;
      weaknesses.push('Yatırım amacında fiyat uygunluğu ve likidite baskısı var.');
    }
    factors.push({ key: 'usage', label: 'Kullanım amacı', impact: usage === 'yatirim' ? 'neutral' : 'neutral', detail: 'Yatırım' });
  } else if (usage === 'oturum') {
    decisionScore += 4;
    strengths.push('Oturum profili uzun vadeli kullanım senaryosuna uygun.');
    factors.push({ key: 'usage', label: 'Kullanım amacı', impact: 'positive', detail: 'Oturum' });
  } else {
    factors.push({ key: 'usage', label: 'Kullanım amacı', impact: 'neutral', detail: 'Belirsiz' });
  }

  decisionScore += Math.round((priceFit - 65) * 0.3);
  decisionScore = clampScore(decisionScore);
  priceFit = clampScore(priceFit);

  const tapuMasraf = Math.round(price * 0.04);
  const firstYearExpense = Math.round(price * 0.015) + (buildingAge > 20 ? 12000 : 6000);
  const totalCostEstimate = {
    purchasePrice: price,
    deedAndFees: tapuMasraf,
    firstYearExpense,
    totalAcquisitionCost: price + tapuMasraf + firstYearExpense,
    sqmPrice: Math.round(sqmPrice),
    benchmarkSqmPrice: benchmark,
    currency: 'TRY',
    note: 'Toplam maliyet = fiyat + tahmini tapu/masraf + ilk yıl gider.'
  };

  if (cleanText(input.il) && cleanText(input.ilce)) {
    strengths.push('İl/ilçe bilgisi mevcut; lokasyon güven skorunu artırır.');
    factors.push({ key: 'location', label: 'Konum', impact: 'positive', detail: `${cleanText(input.il)} / ${cleanText(input.ilce)}` });
  }

  const confidenceScore = computeConfidenceScore('housing', input);
  const riskLevel = riskFromScore(100 - decisionScore + (buildingAge > 25 ? 8 : 0) + (priceFit < 50 ? 10 : 0));

  return {
    listingType: 'housing',
    decisionScore,
    confidenceScore,
    priceFit,
    riskLevel,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    totalCostEstimate,
    summary: `${cleanText(input.il)} ${cleanText(input.ilce)} ${sqm} m² konut için karar skoru ${decisionScore}/100.`,
    factors,
    scoreLabel: scoreLabel(decisionScore),
    inputSnapshot: {
      il: cleanText(input.il),
      ilce: cleanText(input.ilce),
      metrekare: sqm,
      oda_sayisi: safeNumber(input.oda_sayisi),
      bina_yasi: buildingAge,
      fiyat: price,
      kullanim_amaci: usage
    }
  };
}

/**
 * @param {'vehicle'|'housing'} type
 * @param {object} input
 */
export function buildListingAnalysisResult(type, input = {}) {
  const validation = validateListingInput(type, input);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }
  const result = type === 'vehicle' ? analyzeVehicleListing(input) : analyzeHousingListing(input);
  return { ok: true, result };
}
