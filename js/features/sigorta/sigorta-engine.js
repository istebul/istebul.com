/**
 * Sigorta V2 — deterministik karar motoru (skorlar LLM ile değiştirilmez).
 */
import { SIGORTA_OPTIONS } from '../../sigorta/sigorta-config.js';

function travelerCountNumeric(value) {
  if (value === '4plus') return 4;
  return safeNumber(value) || 1;
}

function residentsCountNumeric(value) {
  if (value === '4plus') return 4;
  return safeNumber(value) || 1;
}
import { buildRiskItem, clampScore } from '../results/results-engine.js';

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function optionLabel(mapKey, value) {
  return SIGORTA_OPTIONS[mapKey]?.find((o) => o.value === value)?.label || value || '';
}

export function childrenCountNumeric(value) {
  if (value === '3plus') return 3;
  return safeNumber(value);
}

/**
 * Koruma skoru — risk algısı, ürün tipi ve hane yapısı.
 */
export function computeProtectionScore(state = {}) {
  let score = 48;
  const risk = state.risk_perception;
  if (risk === 'yuksek') score += 28;
  else if (risk === 'orta') score += 14;
  else score += 6;

  const type = state.insurance_type;
  if (type === 'saglik') score += 12;
  else if (type === 'konut') score += 10;
  else if (type === 'arac') score += 8;
  else if (type === 'seyahat') score += 6;

  const kids = childrenCountNumeric(state.children_count);
  if (type === 'saglik' || type === 'konut') {
    score += Math.min(kids * 4, 12);
  }

  const age = safeNumber(state.age);
  if (age >= 55) score += 8;
  else if (age >= 40) score += 4;
  else if (age > 0 && age < 28) score += 3;

  if (type === 'konut' && residentsCountNumeric(state.residents_count) >= 2) score += 5;
  if (type === 'saglik' && childrenCountNumeric(state.children_count) > 0) score += 4;

  if (type === 'arac') {
    if (state.license_years === '0-2') score -= 4;
    if (state.license_years === '11plus') score += 4;
    if (state.usage_type === 'ticari') score += 6;
    if (state.vehicle_year_band === '11plus') score += 5;
  }

  if (type === 'seyahat') {
    const travelers = travelerCountNumeric(state.traveler_count);
    score += Math.min(travelers * 3, 9);
    if (state.destination_type === 'schengen') score += 4;
  }

  return clampScore(score);
}

/**
 * Teminat yeterliliği — profil ile ürün tipi uyumu.
 */
export function computeCoverageAdequacyScore(state = {}) {
  let score = 52;
  const type = state.insurance_type;
  const risk = state.risk_perception;
  const budget = state.budget_level;
  const kids = childrenCountNumeric(state.children_count);

  if (type === 'saglik' && kids > 0) score += 10;
  if (type === 'konut' && residentsCountNumeric(state.residents_count) >= 2) score += 8;
  if (type === 'arac') {
    if (risk === 'yuksek') score += 6;
    if (state.usage_type === 'ticari') score += 4;
    if (state.vehicle_year_band === '0-3' && budget === 'dusuk') score -= 6;
  }
  if (type === 'seyahat') {
    if (risk === 'dusuk') score += 4;
    if (state.destination_type === 'schengen' && budget === 'dusuk') score -= 8;
    if (travelerCountNumeric(state.traveler_count) >= 3) score += 5;
  }
  if (type === 'konut' && state.property_role === 'kiraci') score += 4;

  if (risk === 'yuksek' && budget === 'yuksek') score += 14;
  else if (risk === 'orta' && budget !== 'dusuk') score += 10;
  else if (risk === 'dusuk' && budget === 'dusuk') score += 8;
  else if (risk === 'yuksek' && budget === 'dusuk') score -= 18;
  else if (risk === 'yuksek' && budget === 'orta') score -= 8;

  if (kids >= 2 && type === 'saglik') score += 6;
  if (!state.age) score -= 12;
  if (!type) score -= 20;

  const age = safeNumber(state.age);
  if (age > 60 && type === 'saglik' && budget === 'dusuk') score -= 10;

  return clampScore(score);
}

/**
 * Maliyet verimliliği — bütçe ile risk/teminat dengesi.
 */
export function computeCostEfficiencyScore(state = {}) {
  let score = 58;
  const budget = state.budget_level;
  const risk = state.risk_perception;
  const type = state.insurance_type;

  if (budget === 'orta') score += 12;
  if (budget === 'yuksek' && risk !== 'dusuk') score += 10;
  if (budget === 'dusuk' && risk === 'dusuk') score += 14;
  if (budget === 'dusuk' && risk === 'yuksek') score -= 22;
  if (budget === 'yuksek' && risk === 'dusuk') score -= 6;

  if (type === 'seyahat' && budget === 'dusuk') score += 6;
  if (type === 'konut' && budget === 'yuksek') score += 4;
  if (type === 'arac' && budget === 'orta') score += 5;

  return clampScore(score);
}

/**
 * Genel karar skoru — sabit ağırlıklar.
 */
export function computeOverallDecisionScore(state = {}) {
  const protection = computeProtectionScore(state);
  const coverage = computeCoverageAdequacyScore(state);
  const costEfficiency = computeCostEfficiencyScore(state);
  const overall = Math.round(
    protection * 0.35 + coverage * 0.35 + costEfficiency * 0.3
  );
  return {
    protection,
    coverage,
    costEfficiency,
    overall: clampScore(overall)
  };
}

export function computeConfidenceScore(state = {}) {
  let score = 32;
  const type = state.insurance_type;
  const checks = [{ ok: Boolean(type), weight: 18 }];

  if (type === 'arac') {
    checks.push(
      { ok: safeNumber(state.age) >= 18 && safeNumber(state.age) <= 99, weight: 14 },
      { ok: Boolean(state.license_years), weight: 10 },
      { ok: Boolean(state.usage_type), weight: 10 },
      { ok: Boolean(state.vehicle_category), weight: 8 },
      { ok: Boolean(state.vehicle_year_band), weight: 8 }
    );
  } else if (type === 'konut') {
    checks.push(
      { ok: Boolean(state.property_role), weight: 12 },
      { ok: Boolean(state.property_type), weight: 10 },
      { ok: safeNumber(state.age) >= 18 && safeNumber(state.age) <= 99, weight: 10 },
      { ok: Boolean(state.residents_count), weight: 10 },
      { ok: state.children_count !== undefined && state.children_count !== '', weight: 8 }
    );
  } else if (type === 'saglik') {
    checks.push(
      { ok: safeNumber(state.age) >= 18 && safeNumber(state.age) <= 99, weight: 18 },
      { ok: state.children_count !== undefined && state.children_count !== '', weight: 12 }
    );
  } else if (type === 'seyahat') {
    checks.push(
      { ok: Boolean(state.destination_type), weight: 12 },
      { ok: Boolean(state.trip_duration), weight: 10 },
      { ok: Boolean(state.traveler_count), weight: 10 }
    );
  }

  checks.push(
    { ok: Boolean(state.risk_perception), weight: 14 },
    { ok: Boolean(state.budget_level), weight: 14 }
  );

  checks.forEach(({ ok, weight }) => {
    if (ok) score += weight;
  });
  return clampScore(score);
}

function overallRiskFromAnalysis(riskAnalysis) {
  const highs = riskAnalysis.filter((r) => r.level === 'yüksek').length;
  if (highs >= 2) return 'Yüksek';
  if (highs >= 1 || riskAnalysis.some((r) => r.level === 'orta')) return 'Orta';
  return 'Düşük';
}

export function buildRiskAnalysis(state = {}) {
  const protection = computeProtectionScore(state);
  const coverage = computeCoverageAdequacyScore(state);
  const costEff = computeCostEfficiencyScore(state);
  const kids = childrenCountNumeric(state.children_count);
  const age = safeNumber(state.age);

  const protectionLevel =
    protection < 55 ? 'yüksek' : protection < 72 ? 'orta' : 'düşük';
  const coverageLevel =
    coverage < 52 ? 'yüksek' : coverage < 70 ? 'orta' : 'düşük';
  const costLevel =
    costEff < 50 ? 'yüksek' : costEff < 68 ? 'orta' : 'düşük';

  const familyLevel =
    state.insurance_type === 'saglik' &&
    kids >= 2 &&
    state.budget_level === 'dusuk'
      ? 'yüksek'
      : (state.insurance_type === 'saglik' || state.insurance_type === 'konut') &&
          kids > 0 &&
          state.budget_level === 'dusuk'
        ? 'orta'
        : 'düşük';

  const ageLevel =
    age >= 60 && state.insurance_type === 'saglik' ? 'orta' : age > 0 && age < 25 ? 'orta' : 'düşük';

  const productLevel =
    state.insurance_type === 'seyahat' && state.risk_perception === 'yuksek' ? 'orta' : 'düşük';

  return [
    buildRiskItem(
      'protection',
      'Koruma yeterliliği',
      protectionLevel,
      protectionLevel === 'yüksek'
        ? 'Risk algınıza göre mevcut teminat bandı yetersiz kalabilir.'
        : 'Koruma skoru profilinizle uyumlu görünüyor.',
      'Teminat limitlerini poliçe özetinde madde madde doğrulayın.'
    ),
    buildRiskItem(
      'coverage',
      'Teminat kapsam riski',
      coverageLevel,
      coverageLevel === 'yüksek'
        ? 'Ürün tipi ve bütçe seviyesi arasında teminat açığı olabilir.'
        : 'Teminat yeterliliği kabul edilebilir bantta modelleniyor.',
      'Muafiyet, limit ve istisna maddelerini karşılaştırmalı okuyun.'
    ),
    buildRiskItem(
      'cost',
      'Prim / verimlilik riski',
      costLevel,
      costLevel === 'yüksek'
        ? 'Düşük bütçe ile yüksek risk algısı prim baskısı yaratabilir.'
        : 'Maliyet verimliliği dengeli görünüyor.',
      'En az iki teklifte prim ve teminat tablosunu yan yana kıyaslayın.'
    ),
    buildRiskItem(
      'family',
      'Aile koruması riski',
      familyLevel,
      familyLevel === 'yüksek'
        ? 'Çocuklu hane için sağlık/konut teminatı dar kalabilir.'
        : 'Hane yapısı ile teminat profili uyumlu.',
      kids > 0 ? 'Çocuk teminatlarını ayrı satırda kontrol edin.' : 'Bakmakla yükümlü olunanları listeleyin.'
    ),
    buildRiskItem(
      'age',
      'Yaş bandı riski',
      ageLevel,
      ageLevel === 'orta'
        ? 'Yaş bandınız ek muafiyet veya prim artışı getirebilir.'
        : 'Yaş profili standart underwriting bandında.',
      'Yaş indirimi / ek prim maddelerini teklif notlarında arayın.'
    ),
    buildRiskItem(
      'product',
      'Ürün özel risk',
      productLevel,
      productLevel === 'orta'
        ? 'Seyahat ürününde geniş kapsam için ek teminat gerekebilir.'
        : 'Seçilen ürün tipi için tipik riskler kontrol altında.',
      'Ürün tipine özel istisnaları (ferdi kaza, iptal vb.) doğrulayın.'
    )
  ];
}

export function buildStrengths(state = {}) {
  const scores = computeOverallDecisionScore(state);
  const items = [];
  if (scores.protection >= 72) items.push('Koruma skoru güçlü — risk algınızla uyumlu teminat bandı.');
  if (scores.coverage >= 70) items.push('Teminat yeterliliği iyi — profil ve ürün tipi dengeli.');
  if (scores.costEfficiency >= 68) items.push('Maliyet verimliliği olumlu — prim/teminat dengesi makul.');
  if (state.budget_level === 'orta') items.push('Dengeli bütçe seviyesi çoğu senaryo için esneklik sağlar.');
  if (
    state.insurance_type === 'konut' &&
    residentsCountNumeric(state.residents_count) >= 2
  ) {
    items.push('Çok kişili hane — konut ve eşya teminatı birlikte planlanmalı.');
  }
  if (items.length < 3) {
    items.push(`${optionLabel('insurance_type', state.insurance_type)} için yapılandırılmış analiz tamamlandı.`);
    items.push('Alternatif teminat senaryoları karşılaştırmaya hazır.');
  }
  return items.slice(0, 5);
}

export function buildWeaknesses(state = {}) {
  const scores = computeOverallDecisionScore(state);
  const items = [];
  if (scores.coverage < 55) items.push('Teminat yeterliliği zayıf — limit veya muafiyet revizyonu gerekebilir.');
  if (scores.costEfficiency < 52) items.push('Maliyet verimliliği düşük — bütçe ile risk algısı uyumsuz.');
  if (!state.age) items.push('Yaş girilmediği için yaş bandı riskleri sınırlı modellendi.');
  if (state.risk_perception === 'yuksek' && state.budget_level === 'dusuk') {
    items.push('Yüksek risk algısı ile ekonomik bütçe arasında teminat açığı riski.');
  }
  if (!items.length) items.push('Kampanya primleri şirket ve hasar geçmişine göre değişir.');
  return items.slice(0, 5);
}

export function buildAlternatives(state = {}) {
  const type = state.insurance_type;
  const budget = state.budget_level;
  const alts = [
    {
      title: 'Temel koruma senaryosu',
      description: 'Zorunlu / asgari teminat — düşük prim, dar kapsam.',
      meta: budget === 'dusuk' ? 'Mevcut bütçe ile uyumlu' : 'Maliyet tasarrufu'
    },
    {
      title: 'Dengeli paket senaryosu',
      description: 'Standart limitler — muafiyet ve istisna dengesi.',
      meta: 'Önerilen orta yol'
    },
    {
      title: 'Geniş teminat senaryosu',
      description: 'Üst limitler, ek teminatlar ve düşük muafiyet hedefi.',
      meta: state.risk_perception === 'yuksek' ? 'Risk algınıza uygun' : 'İsteğe bağlı yükseltme'
    }
  ];
  if (type === 'arac') {
    alts[0].description = 'Zorunlu trafik + isteğe bağlı mini kasko.';
    alts[2].description = 'Tam kasko + ikame araç / cam teminatı.';
  } else if (type === 'konut') {
    alts[0].description = 'DASK + temel yangın paketi.';
    alts[2].description = 'Eşya, cam, su baskını ve sorumluluk ekleri.';
  } else if (type === 'saglik') {
    alts[0].description = 'Ayakta + yatarak temel paket.';
    alts[2].description = 'Geniş network, doğum ve diş ek teminatları.';
  } else if (type === 'seyahat') {
    alts[0].description = 'Schengen asgari seyahat sağlık limiti.';
    alts[2].description = 'İptal, bagaj ve yüksek tıbbi limit paketi.';
  }
  return alts;
}

export function buildNextSteps(state = {}, riskAnalysis = []) {
  const high = riskAnalysis.filter((r) => r.level === 'yüksek');
  const steps = [
    'En az iki sigorta şirketinden yazılı teklif alın.',
    'Teminat tablosunda limit, muafiyet ve istisnaları karşılaştırın.',
    'Hasarsızlık indirimi ve yenileme koşullarını sorun.',
    'Ödeme planı (peşin / taksit) toplam primi nasıl etkiler kontrol edin.',
    'Poliçe başlangıç tarihi ile mevcut poliçe bitişini hizalayın.',
    'Dijital poliçe özetini PDF olarak arşivleyin.'
  ];
  if (high.some((r) => r.key === 'coverage')) {
    steps.unshift('Teminat açığı görünen kalemler için limit artırımı teklifi isteyin.');
  }
  if (state.insurance_type === 'saglik') {
    steps.push('Anlaşmalı kurum listesini (network) şehir bazında doğrulayın.');
  }
  return steps.slice(0, 6);
}

export function resolveScoreLabel(score) {
  const s = clampScore(score);
  if (s >= 85) return 'Çok uygun';
  if (s >= 70) return 'Uygun';
  if (s >= 55) return 'Dikkatli değerlendir';
  return 'Riskli koruma profili';
}

export function buildEngineResult(state = {}) {
  const scores = computeOverallDecisionScore(state);
  const riskAnalysis = buildRiskAnalysis(state);
  const confidenceScore = computeConfidenceScore(state);
  const overallRisk = overallRiskFromAnalysis(riskAnalysis);

  return {
    scores,
    decisionScore: scores.overall,
    protectionScore: scores.protection,
    coverageScore: scores.coverage,
    costEfficiencyScore: scores.costEfficiency,
    confidenceScore,
    scoreLabel: resolveScoreLabel(scores.overall),
    overallRisk,
    riskAnalysis,
    strengths: buildStrengths(state),
    weaknesses: buildWeaknesses(state),
    alternatives: buildAlternatives(state),
    nextSteps: buildNextSteps(state, riskAnalysis)
  };
}

const BADGES = {
  balanced: { label: 'Dengeli Koruma', className: 'is-logical' },
  economic: { label: 'Ekonomik Paket', className: 'is-economic' },
  premium: { label: 'Geniş Teminat', className: 'is-comfort' }
};

export function estimatePremiumBand(state) {
  const type = state.insurance_type;
  let base = { arac: 18_000, konut: 9_500, saglik: 28_000, seyahat: 1_200 }[type] || 12_000;
  const budgetMul = { dusuk: 0.75, orta: 1, yuksek: 1.35 }[state.budget_level] || 1;
  const riskMul = { dusuk: 0.9, orta: 1, yuksek: 1.15 }[state.risk_perception] || 1;

  if (type === 'arac') {
    if (state.usage_type === 'ticari') base *= 1.2;
    if (state.vehicle_year_band === '11plus') base *= 1.08;
    if (state.license_years === '0-2') base *= 1.12;
  } else if (type === 'seyahat') {
    const travelers = travelerCountNumeric(state.traveler_count);
    base *= 0.85 + travelers * 0.35;
    if (state.destination_type === 'schengen') base *= 1.15;
    if (state.trip_duration === '16plus') base *= 1.25;
  } else {
    const kids = childrenCountNumeric(state.children_count);
    base *= 1 + kids * 0.06;
  }

  return Math.round(base * budgetMul * riskMul);
}

/**
 * Seçili veya birincil senaryoyu çözümler.
 */
export function resolvePrimarySigortaResult(results = [], selectedId = '') {
  if (!results.length) return null;
  if (selectedId) {
    const picked = results.find((r) => r.id === selectedId);
    if (picked) return picked;
  }
  return results[0] || null;
}

/**
 * Tüm senaryo skorlarını engine.decisionScore ile senkronize eder (canonical kaynak).
 */
export function syncCanonicalSigortaScores(state, results = [], selectedId = '') {
  const engine = buildEngineResult(state);
  const canonical = engine.decisionScore;
  (results || []).forEach((r) => {
    r.score = canonical;
  });
  return resolvePrimarySigortaResult(results, selectedId);
}

export function buildSigortaResults(state = {}) {
  const engine = buildEngineResult(state);
  const premium = estimatePremiumBand(state);

  const scenarios = [
    {
      id: 'balanced',
      badge: BADGES.balanced,
      title: 'Dengeli koruma paketi',
      description: 'Standart limitler ve makul muafiyet dengesi.',
      score: engine.decisionScore,
      estimatedCost: `Yıllık ~₺${premium.toLocaleString('tr-TR')}`,
      suitability: engine.scoreLabel,
      why: 'Koruma, teminat ve maliyet skorlarının harmanlanmış dengesi.',
      pros: engine.strengths.slice(0, 3),
      cautions: engine.weaknesses.slice(0, 2),
      metrics: { premiumBand: premium, package: 'balanced' }
    },
    {
      id: 'economic',
      badge: BADGES.economic,
      title: 'Ekonomik temel paket',
      description: 'Daha dar teminat — prim baskısını azaltır.',
      score: Math.max(48, engine.decisionScore - 6),
      estimatedCost: `Yıllık ~₺${Math.round(premium * 0.82).toLocaleString('tr-TR')}`,
      suitability: 'Maliyet odaklı',
      why: 'Maliyet verimliliği öncelikli profil.',
      pros: ['Daha düşük prim bandı', 'Zorunlu teminatları karşılar'],
      cautions: ['Teminat limitleri dar olabilir', 'Hasar anında ek ödeme riski'],
      metrics: { premiumBand: Math.round(premium * 0.82), package: 'economic' }
    },
    {
      id: 'premium',
      badge: BADGES.premium,
      title: 'Geniş teminat paketi',
      description: 'Üst limitler ve ek teminatlar.',
      score: Math.min(96, engine.decisionScore + 4),
      estimatedCost: `Yıllık ~₺${Math.round(premium * 1.28).toLocaleString('tr-TR')}`,
      suitability: engine.overallRisk === 'Yüksek' ? 'Risk azaltıcı' : 'Üst segment',
      why: 'Yüksek risk algısı veya geniş bütçe için uygun.',
      pros: ['Geniş limit ve ek teminatlar', 'Muafiyetler düşük olabilir'],
      cautions: ['Prim yükü artar', 'Kullanılmayan teminatlar maliyet yaratır'],
      metrics: { premiumBand: Math.round(premium * 1.28), package: 'premium' }
    }
  ];

  return scenarios.sort((a, b) => b.score - a.score);
}

export function buildSigortaSummary(state = {}, results = []) {
  const engine = buildEngineResult(state);
  const primary = results[0];
  return {
    fitScore: engine.decisionScore,
    scoreBand: engine.scoreLabel,
    totalCostLabel: primary?.estimatedCost || '—',
    totalCostHint: 'Tahmini yıllık prim bandı',
    seasonRisk: engine.overallRisk,
    riskDetail: engine.riskAnalysis.find((r) => r.level === 'yüksek')?.title || 'Kontrollü risk profili',
    advantages: engine.strengths,
    cautions: engine.weaknesses,
    nextStep: engine.nextSteps[0] || 'Teklif karşılaştırmasına geçin.',
    topTitle: primary?.title || 'Dengeli koruma paketi',
    extraKpis: [
      { label: 'Koruma', value: `${engine.protectionScore}/100` },
      { label: 'Teminat', value: `${engine.coverageScore}/100` },
      { label: 'Verimlilik', value: `${engine.costEfficiencyScore}/100` }
    ]
  };
}

export function getSigortaProgress(state = {}) {
  const rows = [
    { key: 'Sigorta türü', value: optionLabel('insurance_type', state.insurance_type) }
  ];
  const type = state.insurance_type;

  if (type === 'arac') {
    rows.push(
      { key: 'Sürücü yaşı', value: state.age ? String(state.age) : '' },
      { key: 'Ehliyet', value: optionLabel('license_years', state.license_years) },
      { key: 'Kullanım', value: optionLabel('usage_type', state.usage_type) },
      { key: 'Araç tipi', value: optionLabel('vehicle_category', state.vehicle_category) },
      { key: 'Araç yaşı', value: optionLabel('vehicle_year_band', state.vehicle_year_band) }
    );
  } else if (type === 'konut') {
    rows.push(
      { key: 'Konut durumu', value: optionLabel('property_role', state.property_role) },
      { key: 'Konut tipi', value: optionLabel('property_type', state.property_type) },
      { key: 'Yaş', value: state.age ? String(state.age) : '' },
      { key: 'Konutta yaşayan', value: optionLabel('residents_count', state.residents_count) },
      { key: 'Çocuk (18 altı)', value: optionLabel('children_count', state.children_count) }
    );
  } else if (type === 'saglik') {
    rows.push(
      { key: 'Yaş', value: state.age ? String(state.age) : '' },
      { key: 'Bağımlı çocuk', value: optionLabel('children_count', state.children_count) }
    );
  } else if (type === 'seyahat') {
    rows.push(
      { key: 'Destinasyon', value: optionLabel('destination_type', state.destination_type) },
      { key: 'Süre', value: optionLabel('trip_duration', state.trip_duration) },
      { key: 'Yolcu', value: optionLabel('traveler_count', state.traveler_count) }
    );
  }

  rows.push(
    { key: 'Risk algısı', value: optionLabel('risk_perception', state.risk_perception) },
    { key: 'Bütçe', value: optionLabel('budget_level', state.budget_level) }
  );

  return rows;
}

const COVERAGE_ROWS_BY_TYPE = Object.freeze({
  arac: [
    { key: 'trafik', label: 'Zorunlu trafik', economic: 'Standart', balanced: 'Standart', premium: 'Standart' },
    { key: 'kasko', label: 'Kasko ana teminat', economic: 'Dar', balanced: 'Geniş', premium: 'Geniş+' },
    { key: 'cam', label: 'Cam / mini onarım', economic: 'Opsiyonel', balanced: 'Dahil', premium: 'Dahil' },
    { key: 'ikame', label: 'İkame araç', economic: 'Yok', balanced: 'Sınırlı', premium: 'Geniş' },
    { key: 'muafiyet', label: 'Muafiyet bandı', economic: 'Yüksek', balanced: 'Orta', premium: 'Düşük' }
  ],
  konut: [
    { key: 'dask', label: 'DASK (zorunlu)', economic: 'Standart', balanced: 'Standart', premium: 'Standart' },
    { key: 'yangin', label: 'Yangın / deprem', economic: 'Temel', balanced: 'Geniş', premium: 'Geniş+' },
    { key: 'esya', label: 'Eşya teminatı', economic: 'Düşük limit', balanced: 'Orta limit', premium: 'Yüksek limit' },
    { key: 'sorumluluk', label: 'Komşu sorumluluğu', economic: 'Opsiyonel', balanced: 'Dahil', premium: 'Dahil' }
  ],
  saglik: [
    { key: 'yatarak', label: 'Yatarak tedavi', economic: 'Temel', balanced: 'Geniş', premium: 'Geniş+' },
    { key: 'ayakta', label: 'Ayakta tedavi', economic: 'Sınırlı', balanced: 'Orta', premium: 'Geniş' },
    { key: 'dogum', label: 'Doğum / check-up', economic: 'Hariç', balanced: 'Opsiyonel', premium: 'Dahil' },
    { key: 'ag', label: 'Anlaşmalı kurum ağı', economic: 'Dar', balanced: 'Orta', premium: 'Geniş' }
  ],
  seyahat: [
    { key: 'iptal', label: 'Seyahat iptali', economic: 'Hariç', balanced: 'Opsiyonel', premium: 'Dahil' },
    { key: 'saglik', label: 'Yurt dışı sağlık', economic: 'Temel', balanced: 'Geniş', premium: 'Geniş+' },
    { key: 'bagaj', label: 'Bagaj / gecikme', economic: 'Sınırlı', balanced: 'Dahil', premium: 'Dahil' },
    { key: 'schengen', label: 'Schengen minimum', economic: 'Kontrol gerekir', balanced: 'Uyumlu', premium: 'Uyumlu+' }
  ]
});

export function buildCoverageComparisonMatrix(state = {}) {
  const type = state.insurance_type || 'arac';
  const rows = COVERAGE_ROWS_BY_TYPE[type] || COVERAGE_ROWS_BY_TYPE.arac;
  return {
    insuranceType: type,
    typeLabel: optionLabel('insurance_type', type),
    packages: [
      { id: 'economic', label: 'Ekonomik temel' },
      { id: 'balanced', label: 'Dengeli koruma' },
      { id: 'premium', label: 'Geniş teminat' }
    ],
    rows: rows.map((row) => ({
      label: row.label,
      economic: row.economic,
      balanced: row.balanced,
      premium: row.premium
    })),
    disclaimer:
      'Teminat tablosu bilgilendirme amaçlıdır; poliçe şartnamesi nihai kaynaktır. Prim teklifi partner kurum onayına tabidir.'
  };
}
