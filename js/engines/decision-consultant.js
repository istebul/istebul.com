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

/** Deterministic score floor before normalization (documented for transparency). */
export const SCORE_BASE = 42;
export const SCORE_MIN = 35;
export const SCORE_MAX = 94;

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

  const signalExplanations = [
    {
      key: 'matchStrength',
      label: 'Profil uyum gücü',
      value: matchStrength,
      hint: 'Pozitif/negatif kriter eşleşmelerinin yoğunluğu — uyum skorundan bağımsız.'
    },
    {
      key: 'dataQuality',
      label: 'Maliyet veri kalitesi',
      value: dataQuality,
      hint: costSource === 'truth' ? 'Katalog doğrulanmış maliyet katmanı.' : 'Tahmini maliyet — teklifte doğrulama önerilir.'
    },
    {
      key: 'catalogCoverage',
      label: 'Katalog kapsamı',
      value: catalogCoverage,
      hint: 'Referans model havuzu genişliği; dar havuzda güven bandı düşer.'
    },
    {
      key: 'budgetClarity',
      label: 'Bütçe netliği',
      value: budgetClarity,
      hint: budget > 0 ? 'Bütçe girdisi mevcut.' : 'Bütçe belirtilmedi — senaryo daha belirsiz.'
    },
    {
      key: 'priceInBand',
      label: 'Fiyat bandı uyumu',
      value: priceInBand,
      hint: 'Model fiyatının bütçe bandındaki konumu (satın alma önerisi değil).'
    }
  ];

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
    signalExplanations,
    isMatchScore: false,
    semanticVersion: 'p3.4',
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
  let score = SCORE_BASE;

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

  const normalizedScore = Math.round(clamp(score, SCORE_MIN, SCORE_MAX));

  return {
    score: normalizedScore,
    scoreBreakdown: breakdown.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    scoreRaw: score
  };
}

function factorMap(breakdown = []) {
  const map = {};
  for (const row of breakdown) {
    if (row?.factor) map[row.factor] = row;
  }
  return map;
}

function diffFactorAdvantages(leaderBd = [], runnerBd = []) {
  const leader = factorMap(leaderBd);
  const runner = factorMap(runnerBd);
  const advantages = [];

  for (const key of Object.keys(leader)) {
    const l = Number(leader[key]?.delta || 0);
    const r = Number(runner[key]?.delta || 0);
    if (l > r + 4) {
      advantages.push({
        factor: key,
        label: leader[key].label || SCORE_FACTORS[key] || key,
        deltaGap: l - r,
        status: leader[key].status
      });
    }
  }

  return advantages.sort((a, b) => b.deltaGap - a.deltaGap);
}

export function buildScoringTransparency(matchScore, scoreBreakdown = []) {
  const factors = Array.isArray(scoreBreakdown) ? scoreBreakdown : [];
  const totalImpact = factors.reduce((sum, f) => sum + Math.abs(Number(f.delta || 0)), 0) || 1;

  return {
    baseScore: SCORE_BASE,
    matchScore: Number(matchScore || 0),
    capNote: `${SCORE_MIN}–${SCORE_MAX} normalize`,
    methodology:
      'Uyum skoru deterministik kural motorundan gelir. Yapay zeka yalnızca açıklama metni üretir; skoru veya sırayı değiştiremez.',
    factors: factors.map((f) => ({
      ...f,
      sharePct: Math.round((Math.abs(f.delta) / totalImpact) * 100)
    }))
  };
}

export function buildWhyNumberOne(leader, runnerUp, form = {}) {
  if (!leader) return null;
  const gap = runnerUp ? Number(leader.score || 0) - Number(runnerUp.score || 0) : 0;
  const advantages = runnerUp
    ? diffFactorAdvantages(leader.scoreBreakdown, runnerUp.scoreBreakdown)
    : (leader.scoreBreakdown || []).filter((f) => f.positive && f.delta >= 8).slice(0, 3);

  const bullets = advantages.slice(0, 3).map((a) => `${a.label}: ${a.status} (+${a.deltaGap} puan avantaj)`);

  let headline = 'Genel uyum lideri';
  if (gap >= 15) headline = 'Belirgin profil uyumu — #1';
  else if (gap >= 6) headline = 'Dengeli lider — #1';
  else if (runnerUp) headline = 'Yakın skor — #1 (ince ayar gerekir)';

  const summary =
    gap > 0 && runnerUp
      ? `${leader.name}, ${runnerUp.name} karşısında ${gap} puan önde${bullets.length ? ` — özellikle ${advantages[0]?.label?.toLowerCase() || 'profil uyumu'}.` : '.'}`
      : `${leader.name} profilinize göre en yüksek uyum skoruna sahip referans model.`;

  return { headline, summary, advantages: bullets, gap };
}

export function buildWhyNotRanked(vehicle, rank, leader, form = {}) {
  if (!vehicle || !leader || rank < 2) return null;

  const scoreGap = Number(leader.score || 0) - Number(vehicle.score || 0);
  const leaderWins = diffFactorAdvantages(leader.scoreBreakdown, vehicle.scoreBreakdown);
  const runnerWins = diffFactorAdvantages(vehicle.scoreBreakdown, leader.scoreBreakdown);

  const gaps = leaderWins.slice(0, 2).map((a) => `${a.label} liderde ${a.deltaGap} puan daha güçlü`);

  let summary = '';
  if (scoreGap >= 12) {
    summary = `#${rank} ${vehicle.name}, toplam uyumda ${scoreGap} puan geride — ${gaps[0] || 'birkaç kriterde fark'}.`;
  } else if (scoreGap >= 4) {
    summary = `#${rank} yakın alternatif (${scoreGap} puan fark) — test sürüşü ve TCO karşılaştırması belirleyici olabilir.`;
  } else {
    summary = `#${rank} neredeyse eşdeğer — sıralama küçük kriter farklarına dayanır.`;
  }

  const strengths = runnerWins.slice(0, 1).map((a) => `${a.label}: ${a.status}`);

  if (vehicle.costs?.total && leader.costs?.total && vehicle.costs.total < leader.costs.total) {
    strengths.push('12 aylık TCO liderden daha düşük — maliyet odaklı senaryo');
  }

  return {
    rank,
    summary,
    gaps,
    strengths,
    scoreGap
  };
}

export function buildTradeoffExplanations(results = []) {
  const top = results.slice(0, 3);
  if (top.length < 2) return [];

  const leader = top[0];
  const alt = top[1];
  const tradeoffs = [];

  const scoreGap = Number(leader.score || 0) - Number(alt.score || 0);
  tradeoffs.push({
    title: 'Uyum vs alternatif',
    summary:
      scoreGap >= 10
        ? `${leader.name} profil uyumunda önde; ${alt.name} farklı önceliklerde değerlendirilebilir.`
        : `${leader.name} ve ${alt.name} yakın — bütçe, TCO ve finansman yükü birlikte okunmalı.`
  });

  const leaderTco = Number(leader.costs?.total || 0);
  const altTco = Number(alt.costs?.total || 0);
  if (leaderTco > 0 && altTco > 0 && Math.abs(leaderTco - altTco) > leaderTco * 0.06) {
    const cheaper = altTco < leaderTco ? alt.name : leader.name;
    tradeoffs.push({
      title: 'TCO trade-off',
      summary: `${cheaper} 12 aylık toplam maliyette daha düşük senaryo sunar — uyum skoru tek başına yeterli değil.`
    });
  }

  if (top[2]) {
    const third = top[2];
    const tco3 = Number(third.costs?.total || 0);
    if (tco3 > 0 && tco3 < altTco * 0.92) {
      tradeoffs.push({
        title: 'Üçüncü seçenek',
        summary: `${third.name} maliyet odaklı üçüncü senaryo — #1/#2 arasında denge arayanlar için.`
      });
    }
  }

  return tradeoffs.slice(0, 3);
}

export function buildRankIntelligence(results = [], form = {}) {
  const list = Array.isArray(results) ? results : [];
  if (!list.length) return null;

  const leader = list[0];
  const runnerUp = list[1] || null;

  return {
    leader: buildWhyNumberOne(leader, runnerUp, form),
    runners: list.slice(1).map((v, idx) => buildWhyNotRanked(v, idx + 2, leader, form)),
    tradeoffs: buildTradeoffExplanations(list),
    transparency: buildScoringTransparency(leader.score, leader.scoreBreakdown)
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
  const why = buildWhyNumberOne(winner, runnerUp);
  if (!why) return null;

  const advantages = diffFactorAdvantages(winner.scoreBreakdown, runnerUp.scoreBreakdown);
  const factorLabels = advantages.slice(0, 2).map((a) => a.label);

  return {
    gap: why.gap,
    summary: why.summary,
    factorLabels,
    advantages: why.advantages
  };
}

export function buildMethodologyPanel() {
  return {
    title: 'Karar altyapısı metodolojisi',
    steps: [
      'İlan bulmak başka, doğru karar vermek başka — kriterleriniz referans modellerle eşleştirilir.',
      'Uyum skoru (0–100) şeffaf ağırlıklarla hesaplanır; generic AI skoru üretmez.',
      '12 aylık toplam sahip olma maliyeti (TCO) ayrı hesaplanır — yalnızca oran tablosu değil.',
      'Yapay zeka yalnızca gerekçe metni üretir; skor ve maliyet kural tabanlıdır.'
    ],
    limits: [
      'isteBul ilan sitesi veya sohbet botu değildir — karar altyapısıdır.',
      'Canlı ilan fiyatı değildir — piyasa teklifleri değişebilir.',
      'Finansman örnekleri simülasyondur; banka onayı ayrı değerlendirilir.',
      'Karar skoru ve veri güven bandı metodolojik destek sunar; yatırım veya kredi taahhüdü içermez.'
    ]
  };
}

export function sanitizeAiNarrative(text, maxLen = 600) {
  return String(text || '')
    .replace(/[#*_`|]/g, '')
    .replace(/\b(kesinlikle|mutlaka|garanti(ediyor|dir)?|tahmin(ediyor| eder)?|kesin sonuç|yatırım tavsiyesi)\b/gi, '')
    .replace(/\d+(?:[.,]\d+)?\s*%\s*(faiz|oran)/gi, 'örnek oran')
    .replace(/%\s*\d+(?:[.,]\d+)?/g, 'örnek oran')
    .replace(/₺\s*[\d.,]+/g, '')
    .replace(/^[-•]\s*/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLen);
}
