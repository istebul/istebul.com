/**
 * AI Decision Engine V3 — ortak, deterministik karar motoru.
 * Tüm dikeylerde (auto, housing, finance, vacation, insurance) kullanılabilir.
 * Aynı input her zaman aynı çıktıyı üretir; rastgelelik yoktur.
 */

const VERTICAL_ALIASES = {
  auto: 'auto',
  araba: 'auto',
  housing: 'housing',
  konut: 'housing',
  finance: 'finance',
  finansman: 'finance',
  finans: 'finance',
  vacation: 'vacation',
  tatil: 'vacation',
  insurance: 'insurance',
  sigorta: 'insurance',
  kasko: 'insurance'
};

const VERTICAL_FIELD_WEIGHTS = {
  auto: ['budget', 'usage', 'fuel', 'vehiclePrice', 'monthlyIncome', 'termMonths', 'downPayment'],
  housing: ['budget', 'monthlyIncome', 'monthlyDebt', 'city', 'squareMeters', 'downPayment', 'termMonths'],
  finance: ['budget', 'monthlyIncome', 'monthlyDebt', 'termMonths', 'downPayment'],
  vacation: ['budget', 'duration', 'travelers', 'destination'],
  insurance: ['budget', 'coverageType', 'vehiclePrice', 'monthlyIncome']
};

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function isPresent(value) {
  if (value == null) return false;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim().length > 0;
}

function normalizeVertical(raw) {
  const key = String(raw || 'auto').toLowerCase().trim();
  return VERTICAL_ALIASES[key] || 'auto';
}

function normalizeRiskTolerance(raw) {
  const v = String(raw || 'medium').toLowerCase();
  if (v === 'low' || v === 'düşük' || v === 'dusuk') return 'low';
  if (v === 'high' || v === 'yüksek' || v === 'yuksek') return 'high';
  return 'medium';
}

/**
 * Ham inputu normalize eder.
 * @param {object} input
 */
export function normalizeDecisionInput(input = {}) {
  const vertical = normalizeVertical(input.vertical || input.category);
  const form = input.formData || input.profile || {};
  const metrics = input.metrics || {};
  const topResult = input.topResult || metrics.topResult || {};

  const budget = safeNumber(input.budget ?? form.budget ?? form.totalBudget ?? metrics.budget);
  const vehiclePrice = safeNumber(
    input.vehiclePrice ?? topResult.price ?? metrics.vehiclePrice ?? form.vehiclePrice
  );
  const downPayment = safeNumber(
    input.downPayment ?? form.downPayment ?? form.down_payment ?? metrics.downPayment
  );
  const termMonths = safeNumber(
    input.termMonths ?? form.termMonths ?? form.term_months ?? form.ownership_months ?? 48
  ) || 48;
  const monthlyIncome = safeNumber(
    input.monthlyIncome ?? form.monthlyIncome ?? form.monthly_income ?? metrics.monthlyIncome
  );
  const monthlyDebt = safeNumber(
    input.monthlyDebt ?? form.monthlyDebt ?? form.existing_debt ?? metrics.monthlyDebt
  );
  const riskTolerance = normalizeRiskTolerance(
    input.riskTolerance ?? form.riskTolerance ?? form.risk_tolerance ?? 'medium'
  );

  const costs = topResult.costs || metrics.costs || {};
  const ownership = costs.ownership || {};
  const totals = ownership.totals || {};

  const totalCost12 = safeNumber(
    input.totalCost12 ?? totals.months12 ?? costs.total ?? metrics.totalCost12 ?? metrics.totalCost
  );
  const totalCost36 = safeNumber(input.totalCost36 ?? totals.months36 ?? metrics.totalCost36);
  const totalCost60 = safeNumber(input.totalCost60 ?? totals.months60 ?? metrics.totalCost60);

  const normalized = {
    vertical,
    budget,
    downPayment,
    termMonths,
    monthlyIncome,
    monthlyDebt,
    riskTolerance,
    vehiclePrice,
    totalCost12,
    totalCost36,
    totalCost60,
    usage: String(form.usage || input.usage || ''),
    fuel: String(form.fuel || topResult.fuel || input.fuel || ''),
    city: String(form.city || input.city || ''),
    squareMeters: safeNumber(form.squareMeters ?? form.square_meters),
    duration: safeNumber(form.duration ?? form.trip_days),
    travelers: safeNumber(form.travelers ?? form.traveler_count),
    destination: String(form.destination || form.region || ''),
    coverageType: String(form.coverageType || form.coverage_type || form.policy_type || ''),
    decisionScoreHint: safeNumber(input.decisionScore ?? metrics.decisionScore),
    confidenceScoreHint: safeNumber(input.confidenceScore ?? metrics.confidenceScore),
    reasons: Array.isArray(input.reasons)
      ? input.reasons
      : Array.isArray(topResult.reasons)
        ? topResult.reasons
        : [],
    risks: Array.isArray(input.risks)
      ? input.risks
      : Array.isArray(topResult.risks)
        ? topResult.risks
        : [],
    alternatives: Array.isArray(input.alternatives) ? input.alternatives : []
  };

  const fieldPresence = {};
  for (const field of VERTICAL_FIELD_WEIGHTS[vertical] || VERTICAL_FIELD_WEIGHTS.auto) {
    fieldPresence[field] = isPresent(normalized[field] ?? form[field]);
  }
  normalized.fieldPresence = fieldPresence;

  return normalized;
}

function budgetFitScore(normalized) {
  const budget = Math.max(normalized.budget, 1);
  const price = normalized.vehiclePrice || normalized.totalCost12;
  if (!price) return 55;
  const ratio = price / budget;
  if (ratio <= 0.85) return 92;
  if (ratio <= 0.95) return 82;
  if (ratio <= 1.0) return 72;
  if (ratio <= 1.08) return 58;
  if (ratio <= 1.15) return 45;
  return 32;
}

function incomeLoadScore(normalized) {
  const income = Math.max(normalized.monthlyIncome, 1);
  const debt = normalized.monthlyDebt;
  const paymentEstimate = normalized.totalCost12 > 0 ? normalized.totalCost12 / 12 / 3 : 0;
  const load = ((debt + paymentEstimate) / income) * 100;
  if (load <= 25) return 90;
  if (load <= 35) return 78;
  if (load <= 45) return 62;
  if (load <= 55) return 48;
  return 30;
}

function usageFitBonus(normalized) {
  if (normalized.vertical !== 'auto') return 0;
  const usage = normalized.usage;
  const fuel = normalized.fuel;
  let bonus = 0;
  if (usage === 'city' && (fuel === 'hybrid' || fuel === 'electric')) bonus += 8;
  if (usage === 'family' && fuel === 'hybrid') bonus += 5;
  if (usage === 'long' && fuel === 'diesel') bonus += 4;
  return bonus;
}

/**
 * @param {object} input
 */
export function calculateDecisionScore(input) {
  const n = normalizeDecisionInput(input);
  if (n.decisionScoreHint > 0) {
    return clamp(n.decisionScoreHint);
  }

  let score = 60;

  if (n.budget > 0) {
    score = budgetFitScore(n) * 0.45 + score * 0.55;
  }

  if (n.monthlyIncome > 0) {
    score = incomeLoadScore(n) * 0.35 + score * 0.65;
  }

  score += usageFitBonus(n);

  if (n.riskTolerance === 'high') score += 4;
  if (n.riskTolerance === 'low') score -= 6;

  if (n.termMonths > 60) score -= 3;
  if (n.downPayment > 0 && n.budget > 0 && n.downPayment / n.budget >= 0.3) score += 5;

  return clamp(score);
}

/**
 * @param {object} input
 */
export function calculateConfidenceScore(input) {
  const n = normalizeDecisionInput(input);
  if (n.confidenceScoreHint > 0) {
    return clamp(n.confidenceScoreHint);
  }

  const fields = VERTICAL_FIELD_WEIGHTS[n.vertical] || VERTICAL_FIELD_WEIGHTS.auto;
  const present = fields.filter((f) => n.fieldPresence[f]).length;
  const ratio = fields.length ? present / fields.length : 0.5;

  let score = 35 + ratio * 55;

  if (n.totalCost12 > 0) score += 8;
  if (n.vehiclePrice > 0) score += 5;
  if (n.monthlyIncome > 0 && n.monthlyDebt >= 0) score += 4;

  return clamp(score);
}

/**
 * @param {object} input
 */
export function calculateRiskScore(input) {
  const n = normalizeDecisionInput(input);
  let risk = 35;

  const budget = Math.max(n.budget, 1);
  const cost = n.totalCost12 || n.vehiclePrice;
  if (cost > 0) {
    const pressure = cost / budget;
    if (pressure > 1.1) risk += 28;
    else if (pressure > 1.0) risk += 18;
    else if (pressure > 0.92) risk += 10;
    else risk -= 5;
  }

  if (n.monthlyIncome > 0) {
    const load = ((n.monthlyDebt + (cost ? cost / 12 / 3 : 0)) / n.monthlyIncome) * 100;
    if (load > 50) risk += 22;
    else if (load > 40) risk += 14;
    else if (load > 30) risk += 6;
  }

  if (n.termMonths > 60) risk += 8;
  if (n.riskTolerance === 'low') risk += 5;
  if (n.riskTolerance === 'high') risk -= 4;

  risk += Math.min(n.risks.length * 4, 16);

  return clamp(risk);
}

/**
 * @param {object} input
 */
export function calculateTotalCost(input) {
  const n = normalizeDecisionInput(input);
  const base12 = n.totalCost12 || (n.vehiclePrice > 0 ? n.vehiclePrice * 0.12 : 0);
  const base36 = n.totalCost36 || (base12 > 0 ? base12 * 2.6 : 0);
  const base60 = n.totalCost60 || (base12 > 0 ? base12 * 3.8 : 0);

  return {
    oneYear: Math.round(base12),
    threeYear: Math.round(base36),
    fiveYear: Math.round(base60),
    currency: 'TRY'
  };
}

/**
 * @param {object} input
 */
export function generateRiskRadar(input) {
  const n = normalizeDecisionInput(input);
  const budget = Math.max(n.budget, 1);
  const cost = n.totalCost12 || n.vehiclePrice;
  const pressure = cost > 0 ? cost / budget : 0.85;

  const financialRisk = clamp(pressure > 1 ? 55 + (pressure - 1) * 120 : 30 + pressure * 25);
  const liquidityRisk = clamp(
    n.vertical === 'housing' ? 45 + pressure * 20 : 35 + (n.termMonths > 48 ? 12 : 0)
  );
  const maintenanceRisk = clamp(
    n.vertical === 'auto'
      ? n.fuel === 'electric'
        ? 28
        : n.fuel === 'hybrid'
          ? 35
          : 48
      : 40
  );
  const depreciationRisk = clamp(
    n.vertical === 'auto' ? 42 + (n.vehiclePrice > 2_000_000 ? 12 : 0) : 38
  );
  const creditRisk = clamp(
    n.monthlyIncome > 0
      ? ((n.monthlyDebt + (cost ? cost / 36 : 0)) / n.monthlyIncome) * 100
      : 50
  );

  return {
    financialRisk,
    liquidityRisk,
    maintenanceRisk,
    depreciationRisk,
    creditRisk
  };
}

/**
 * @param {object} input
 */
export function generateExplainableReasons(input) {
  const n = normalizeDecisionInput(input);
  const reasons = [];

  if (n.budget > 0 && (n.vehiclePrice || n.totalCost12)) {
    const price = n.vehiclePrice || n.totalCost12;
    const ratio = price / n.budget;
    if (ratio <= 0.95) {
      reasons.push('Seçilen seçenek bütçenizin altında veya sınırında kalıyor.');
    } else if (ratio <= 1.05) {
      reasons.push('Toplam maliyet bütçe sınırına yakın; marj dar.');
    } else {
      reasons.push('Toplam maliyet bütçeyi aşıyor; finansman veya segment revizyonu gerekebilir.');
    }
  }

  if (n.monthlyIncome > 0) {
    const load = ((n.monthlyDebt + (n.totalCost12 ? n.totalCost12 / 12 / 3 : 0)) / n.monthlyIncome) * 100;
    if (load <= 35) {
      reasons.push('Gelir-borç dengesi bu karar için yönetilebilir görünüyor.');
    } else {
      reasons.push('Aylık yük gelirin önemli bir kısmını kaplıyor; risk artıyor.');
    }
  }

  if (n.vertical === 'auto' && n.usage) {
    const usageLabels = { city: 'şehir içi', family: 'aile', long: 'uzun yol', business: 'iş' };
    reasons.push(`Kullanım profili (${usageLabels[n.usage] || n.usage}) segment seçimini destekliyor.`);
  }

  for (const r of n.reasons.slice(0, 2)) {
    if (typeof r === 'string' && r.trim()) reasons.push(r.trim());
  }

  if (!reasons.length) {
    reasons.push('Mevcut verilerle kural tabanlı skor hesaplandı.');
  }

  return reasons.slice(0, 5);
}

/**
 * @param {object} input
 */
export function generateAlternativeReasons(input) {
  const n = normalizeDecisionInput(input);
  const alts = [];

  if (n.budget > 0) {
    alts.push('Bir alt fiyat bandındaki modeller aylık yükü %10–15 azaltabilir.');
  }

  if (n.termMonths >= 36) {
    alts.push('Daha kısa vade ile toplam faiz maliyeti düşürülebilir.');
  }

  if (n.vertical === 'auto' && n.fuel !== 'hybrid' && n.fuel !== 'electric') {
    alts.push('Hibrit veya elektrikli alternatifler işletme maliyetini düşürebilir.');
  }

  if (n.downPayment < n.budget * 0.2 && n.budget > 0) {
    alts.push('Peşinat artırılırsa kredi riski ve aylık taksit baskısı azalır.');
  }

  for (const a of n.alternatives.slice(0, 2)) {
    const label = a.title || a.name || a.vehicle?.name;
    if (label) alts.push(`${label} benzer kriterlerde alternatif olarak değerlendirilebilir.`);
  }

  if (!alts.length) {
    alts.push('Farklı vade ve peşinat kombinasyonları karar skorunu değiştirebilir.');
  }

  return alts.slice(0, 5);
}

function buildScenario(id, title, changedField, before, after, baseInput) {
  const modified = { ...baseInput, [changedField]: after };
  const beforeScore = calculateDecisionScore(baseInput);
  const afterScore = calculateDecisionScore(modified);
  const delta = afterScore - beforeScore;
  const impact =
    delta > 0 ? `Karar skoru +${delta}` : delta < 0 ? `Karar skoru ${delta}` : 'Karar skoru değişmedi';

  let explanation = '';
  if (changedField === 'budget') {
    explanation =
      delta > 0
        ? 'Bütçe artışı seçeneklere daha fazla marj sağlar.'
        : 'Bütçe daralması uygun segmenti sınırlayabilir.';
  } else if (changedField === 'termMonths') {
    explanation =
      delta >= 0
        ? 'Vade uzaması aylık yükü düşürür ancak toplam maliyeti artırabilir.'
        : 'Vade kısalması aylık baskıyı artırır.';
  } else if (changedField === 'downPayment') {
    explanation = 'Peşinat artışı kredi yükünü ve finansal riski azaltır.';
  } else if (changedField === 'riskTolerance') {
    explanation = 'Düşük risk toleransı daha muhafazakâr bir değerlendirme gerektirir.';
  } else {
    explanation = 'Bu değişiklik karar skorunu etkiler.';
  }

  return {
    id,
    title,
    changedField,
    before,
    after,
    impact,
    explanation
  };
}

/**
 * @param {object} input
 */
export function generateWhatIfScenarios(input) {
  const n = normalizeDecisionInput(input);
  const base = { ...input, ...n };
  const budget = Math.max(n.budget, 1);
  const downPayment = n.downPayment || Math.round(budget * 0.2);
  const termMonths = n.termMonths || 48;

  return [
    buildScenario(
      'budget-up-10',
      'Bütçe %10 artarsa',
      'budget',
      budget,
      Math.round(budget * 1.1),
      base
    ),
    buildScenario(
      'budget-down-10',
      'Bütçe %10 azalırsa',
      'budget',
      budget,
      Math.round(budget * 0.9),
      base
    ),
    buildScenario(
      'term-extended',
      'Kredi vadesi uzarsa',
      'termMonths',
      termMonths,
      Math.min(termMonths + 12, 84),
      base
    ),
    buildScenario(
      'downpayment-up',
      'Peşinat artarsa',
      'downPayment',
      downPayment,
      Math.round(downPayment + budget * 0.1),
      base
    ),
    buildScenario(
      'risk-tolerance-lower',
      'Risk toleransı düşerse',
      'riskTolerance',
      n.riskTolerance,
      'low',
      base
    )
  ];
}

const VERDICT_LABELS = {
  auto: { high: 'Alınabilir', mid: 'Dikkatli değerlendir', low: 'Ertelenmeli' },
  housing: { high: 'Uygun görünüyor', mid: 'Koşullu uygun', low: 'Revize edilmeli' },
  finance: { high: 'Onaylanabilir profil', mid: 'Sınırda profil', low: 'Riskli profil' },
  vacation: { high: 'Planlanabilir', mid: 'Bütçe ayarı gerekebilir', low: 'Ertelenmeli' },
  insurance: { high: 'Yeterli koruma', mid: 'Ek teminat değerlendirin', low: 'Yetersiz koruma' }
};

/**
 * @param {object} input
 * @param {object} scores
 */
export function buildDecisionSummary(input, scores = {}) {
  const n = normalizeDecisionInput(input);
  const decisionScore = scores.decisionScore ?? calculateDecisionScore(input);
  const riskScore = scores.riskScore ?? calculateRiskScore(input);
  const labels = VERDICT_LABELS[n.vertical] || VERDICT_LABELS.auto;

  let verdict = labels.mid;
  if (decisionScore >= 75 && riskScore <= 45) verdict = labels.high;
  else if (decisionScore < 50 || riskScore >= 65) verdict = labels.low;

  const verticalTitles = {
    auto: 'Araç Karar Özeti',
    housing: 'Konut Karar Özeti',
    finance: 'Finansman Karar Özeti',
    vacation: 'Tatil Karar Özeti',
    insurance: 'Sigorta Karar Özeti'
  };

  const shortExplanation =
    decisionScore >= 75
      ? 'Skor ve risk dengesi olumlu; bir sonraki adım doğrulama ve teklif karşılaştırması.'
      : decisionScore >= 55
        ? 'Karar sınırda; bütçe ve vade senaryolarını gözden geçirin.'
        : 'Mevcut profilde risk yüksek; alternatifleri veya segment revizyonunu değerlendirin.';

  let nextBestAction = 'Toplam maliyeti güncel tekliflerle doğrulayın.';
  if (n.vertical === 'auto') {
    nextBestAction =
      riskScore >= 55
        ? 'Bir alt segment veya daha düşük TCO alternatiflerini karşılaştırın.'
        : 'En güçlü 2–3 seçeneği ekspertiz ve finansman teklifi ile doğrulayın.';
  } else if (n.vertical === 'housing') {
    nextBestAction = 'Bölge fiyatları ve kredi ön onayını kontrol edin.';
  } else if (n.vertical === 'finance') {
    nextBestAction = 'Farklı vade senaryolarıyla aylık yükü test edin.';
  }

  return {
    title: verticalTitles[n.vertical] || 'Karar Özeti',
    verdict,
    shortExplanation,
    nextBestAction
  };
}

/**
 * Ana karar motoru — tüm dikeyler için ortak çıktı şeması.
 * @param {object} input
 */
export function buildDecisionEngineV3(input = {}) {
  const normalized = normalizeDecisionInput(input);
  const decisionScore = calculateDecisionScore(input);
  const confidenceScore = calculateConfidenceScore(input);
  const riskScore = calculateRiskScore(input);
  const totalCost = calculateTotalCost(input);
  const riskRadar = generateRiskRadar(input);
  const explainableReasons = generateExplainableReasons(input);
  const alternativeReasons = generateAlternativeReasons(input);
  const whatIfScenarios = generateWhatIfScenarios(input);
  const summary = buildDecisionSummary(input, { decisionScore, riskScore });

  return {
    version: 'v3',
    vertical: normalized.vertical,
    decisionScore,
    confidenceScore,
    riskScore,
    totalCost,
    riskRadar,
    explainableReasons,
    alternativeReasons,
    whatIfScenarios,
    summary
  };
}
