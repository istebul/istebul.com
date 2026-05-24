/**
 * isteBul Decision Consultant Engine
 * Transparent rule-based scoring, honest confidence, expert-style explanations.
 * LLM layers may only narrate — never override deterministic numbers.
 */

const PREMIUM_BRANDS = ['bmw', 'mercedes', 'tesla', 'audi', 'volvo', 'lexus'];

export const SCORE_FACTORS = Object.freeze({
  BUDGET_FIT: 'Bütçe uyumu',
  BODY_MATCH: 'Kasa tipi',
  FUEL_MATCH: 'Yakıt tercihi',
  USAGE_FIT: 'Kullanım profili',
  RESALE: 'İkinci el likiditesi',
  COST_EFFICIENCY: 'Maliyet verimliliği',
  FINANCE_LOAD: 'Finansman yükü',
  SEGMENT_FIT: 'Segment uyumu'
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pushFactor(breakdown, factor, status, delta, positive) {
  breakdown.push({
    factor,
    label: SCORE_FACTORS[factor] || factor,
    status,
    delta: Math.round(delta),
    positive: Boolean(positive)
  });
}

function isPremiumBrand(vehicle) {
  const name = String(vehicle.name || '').toLowerCase();
  return PREMIUM_BRANDS.some((brand) => name.includes(brand));
}

/**
 * Multi-signal confidence (not a disguised match score).
 */
export function computeConfidenceMeta({
  score,
  scoreBreakdown = [],
  catalogSize = 0,
  strictMatchCount = 0,
  costSource = 'estimate',
  budget = 0,
  vehiclePrice = 0
}) {
  const positiveFactors = scoreBreakdown.filter((f) => f.positive && f.delta > 0).length;
  const negativeFactors = scoreBreakdown.filter((f) => !f.positive || f.delta < 0).length;
  const matchStrength = clamp((positiveFactors * 14) - (negativeFactors * 6) + 40, 25, 95);

  let dataQuality = 52;
  if (costSource === 'truth') dataQuality += 28;
  else if (costSource === 'estimate') dataQuality += 12;
  if (catalogSize >= 20) dataQuality += 10;
  else if (catalogSize >= 8) dataQuality += 4;

  const catalogCoverage = catalogSize >= 5 ? 78 : catalogSize >= 1 ? 58 : 35;
  const budgetClarity = budget > 0 ? 85 : 45;
  const priceInBand = budget > 0 && vehiclePrice > 0
    ? (vehiclePrice <= budget ? 88 : vehiclePrice <= budget * 1.08 ? 62 : 38)
    : 50;

  const overall = Math.round(
    matchStrength * 0.42 +
    dataQuality * 0.28 +
    catalogCoverage * 0.15 +
    budgetClarity * 0.08 +
    priceInBand * 0.07
  );

  const tier =
    overall >= 78 ? 'high' :
      overall >= 62 ? 'medium' : 'review';

  const tierLabels = {
    high: 'Yüksek veri güven bandı',
    medium: 'Orta veri güven bandı — teklif doğrulaması önerilir',
    review: 'Sınırlı veri — manuel kontrol önerilir'
  };

  return {
    score: clamp(overall, 35, 92),
    tier,
    label: tierLabels[tier],
    signals: {
      matchStrength,
      dataQuality,
      catalogCoverage,
      budgetClarity,
      priceInBand
    },
    disclaimer:
      costSource === 'truth'
        ? 'Veri güven bandı, girdi kalitesini gösterir; satın alma garantisi veya kesin sonuç değildir. Maliyetler katalog katmanından; canlı ilan fiyatı değildir.'
        : 'Veri güven bandı, girdi kalitesini gösterir; kesin sonuç değildir. Model fiyatı ve maliyetler tahmini referans değerlerdir — canlı ilan değildir.'
  };
}

/**
 * Score a single vehicle against user criteria.
 */
export function scoreVehicleMatch(vehicle, form, options = {}) {
  const budget = Number(form.budget || 0);
  const requestedFuel = form.fuel || 'any';
  const requestedBody = form.body || '';
  const usage = form.usage || '';
  const isPremiumBudget = budget >= 2500000;
  const breakdown = [];
  let score = 42;

  const overBudgetRatio = budget > 0 ? (vehicle.price - budget) / budget : 0;
  const underBudgetRatio = budget > 0 ? (budget - vehicle.price) / budget : 0;

  if (budget > 0) {
    if (vehicle.price <= budget) {
      const delta = underBudgetRatio <= 0.18 ? 25 : 18;
      pushFactor(breakdown, 'BUDGET_FIT', 'Bütçe içinde', delta, true);
      score += delta;
      if (underBudgetRatio > 0.45 && isPremiumBudget) {
        pushFactor(breakdown, 'SEGMENT_FIT', 'Premium bütçede alt segment', -10, false);
        score -= 10;
      }
    } else {
      const delta = -Math.min(42, Math.round(overBudgetRatio * 100));
      pushFactor(breakdown, 'BUDGET_FIT', 'Bütçe üstü', delta, false);
      score += delta;
    }
  } else {
    pushFactor(breakdown, 'BUDGET_FIT', 'Bütçe belirtilmedi', 4, true);
    score += 4;
  }

  if (requestedBody) {
    if (requestedBody === vehicle.body) {
      pushFactor(breakdown, 'BODY_MATCH', 'Kasa eşleşmesi', 24, true);
      score += 24;
    } else {
      pushFactor(breakdown, 'BODY_MATCH', 'Kasa uyumsuzluğu', -18, false);
      score -= 18;
    }
  } else {
    pushFactor(breakdown, 'BODY_MATCH', 'Kasa tercihi açık', 6, true);
    score += 6;
  }

  if (requestedFuel === 'any') {
    pushFactor(breakdown, 'FUEL_MATCH', 'Yakıt esnek', 6, true);
    score += 6;
  } else if (requestedFuel === vehicle.fuel) {
    pushFactor(breakdown, 'FUEL_MATCH', 'Yakıt eşleşmesi', 24, true);
    score += 24;
  } else {
    const penalty = requestedFuel === 'electric' ? -34 : -18;
    pushFactor(breakdown, 'FUEL_MATCH', 'Yakıt uyumsuzluğu', penalty, false);
    score += penalty;
  }

  if (usage === 'family') {
    const delta = Math.round((vehicle.family || 0) * 1.7);
    pushFactor(breakdown, 'USAGE_FIT', 'Aile kullanımı', delta, delta > 8);
    score += delta;
  }
  if (usage === 'city') {
    const delta = Math.round((vehicle.city || 0) * 1.7);
    pushFactor(breakdown, 'USAGE_FIT', 'Şehir kullanımı', delta, delta > 8);
    score += delta;
  }
  if (usage === 'long') {
    const delta = Math.round((vehicle.long || 0) * 1.7);
    pushFactor(breakdown, 'USAGE_FIT', 'Uzun yol', delta, delta > 8);
    score += delta;
  }

  const resaleDelta = Math.round((vehicle.resale || 0) * 1.4);
  pushFactor(breakdown, 'RESALE', `Likidite ${vehicle.resale || 0}/10`, resaleDelta, resaleDelta > 6);
  score += resaleDelta;

  if (isPremiumBudget) {
    if (vehicle.price >= budget * 0.65) score += 10;
    if (vehicle.price < budget * 0.55) score -= 18;
    if (isPremiumBrand(vehicle)) {
      pushFactor(breakdown, 'SEGMENT_FIT', 'Premium segment', 20, true);
      score += 20;
    } else if (vehicle.price < budget * 0.6) {
      pushFactor(breakdown, 'SEGMENT_FIT', 'Alt segment', -15, false);
      score -= 15;
    }
  }

  if (form.loan === 'yes') {
    if (vehicle.price > budget * 0.9) {
      pushFactor(breakdown, 'FINANCE_LOAD', 'Yüksek finansman yükü', -14, false);
      score -= 14;
    } else if (vehicle.price <= budget * 0.75) {
      pushFactor(breakdown, 'FINANCE_LOAD', 'Finansmana uygun', 6, true);
      score += 6;
    }
  }

  const normalizedScore = Math.round(clamp(score, 35, 94));

  return {
    score: normalizedScore,
    scoreBreakdown: breakdown.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  };
}

export function buildExpertReasons(vehicle, form, budget, scoreBreakdown = []) {
  const fromBreakdown = scoreBreakdown
    .filter((f) => f.positive && f.delta >= 8)
    .slice(0, 3)
    .map((f) => `${f.label}: ${f.status}`);

  if (fromBreakdown.length >= 2) return fromBreakdown;

  const legacy = [];
  if (vehicle.price <= budget) legacy.push('bütçe disiplininize uyumlu');
  if (form.body === vehicle.body) legacy.push(`${vehicle.body} tercihinizle uyumlu`);
  if (form.usage === 'family' && vehicle.family >= 7) legacy.push('aile kullanımı için güçlü segment uyumu');
  if (vehicle.resale >= 8) legacy.push('güçlü ikinci el likiditesi');
  return legacy.slice(0, 3).length ? legacy.slice(0, 3) : ['profil dengesi uygun'];
}

export function buildExpertRisks(vehicle, form, budget, scoreBreakdown = []) {
  const fromBreakdown = scoreBreakdown
    .filter((f) => !f.positive || f.delta < 0)
    .slice(0, 2)
    .map((f) => `${f.label}: ${f.status}`);

  if (fromBreakdown.length) return fromBreakdown;

  const risks = [];
  if (vehicle.price > budget) risks.push('bütçe üstü fiyat riski');
  if (form.loan === 'yes' && vehicle.price > budget * 0.75) risks.push('finansman yükü dikkat gerektiriyor');
  if (vehicle.resale <= 6) risks.push('ikinci el likiditesi sınırlı');
  return risks.length ? risks : ['dengeli toplam sahip olma riski'];
}

export function explainRankGap(winner, runnerUp) {
  if (!winner || !runnerUp) return null;
  const gap = Number(winner.score || 0) - Number(runnerUp.score || 0);
  if (gap <= 0) return null;

  const winnerPos = (winner.scoreBreakdown || []).filter((f) => f.positive).map((f) => f.factor);
  const runnerPos = (runnerUp.scoreBreakdown || []).filter((f) => f.positive).map((f) => f.factor);
  const unique = winnerPos.filter((f) => !runnerPos.includes(f)).slice(0, 2);

  return {
    gap,
    summary: gap >= 12
      ? `${winner.name}, özellikle ${unique.join(' ve ') || 'genel profil uyumu'} ile ${gap} puan önde.`
      : `${winner.name} ile ${runnerUp.name} yakın — ${gap} puan fark; test sürüşü ve teklif karşılaştırması belirleyici olabilir.`
  };
}

export function buildMethodologyPanel() {
  return {
    title: 'Karar metodolojisi',
    steps: [
      'Kriterleriniz katalog referans modelleriyle eşleştirilir.',
      'Uyum skoru (0–100) şeffaf ağırlıklarla hesaplanır — nihai karar garantisi değildir.',
      '12 aylık toplam sahip olma maliyeti (TCO) ayrı hesaplanır.',
      'Yapay zeka yalnızca gerekçe metni üretir; skor ve maliyet kural tabanlıdır.'
    ],
    limits: [
      'Canlı ilan fiyatı değildir — piyasa teklifleri değişebilir.',
      'Finansman örnekleri simülasyondur; banka onayı ayrı değerlendirilir.',
      'Karar skoru ve veri güven bandı metodolojik destek sunar; yatırım veya kredi taahhüdü içermez.'
    ]
  };
}

export function sanitizeAiNarrative(text, maxLen = 600) {
  return String(text || '')
    .replace(/[#*_`|]/g, '')
    .replace(/\d+(?:[.,]\d+)?\s*%\s*(faiz|oran)/gi, 'örnek oran')
    .replace(/%\s*\d+(?:[.,]\d+)?/g, 'örnek oran')
    .replace(/₺\s*[\d.,]+/g, '')
    .replace(/^[-•]\s*/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLen);
}
