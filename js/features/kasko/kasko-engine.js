/**
 * Kasko V2 — deterministik karar motoru.
 */
import { KASKO_OPTIONS, optionLabel } from '../../kasko/kasko-config.js';
import { buildRiskItem, clampScore } from '../results/results-engine.js';

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export { optionLabel };

export function computeCoverageScore(state = {}) {
  let score = 50;
  const level = state.coverage_level;
  if (level === 'full') score += 22;
  else if (level === 'standard') score += 14;
  else if (level === 'mini') score += 4;

  if (state.risk_perception === 'yuksek' && level === 'mini') score -= 18;
  if (state.risk_perception === 'dusuk' && level === 'full') score -= 6;

  if (state.vehicle_year_band === '0-3') score += 6;
  if (state.vehicle_year_band === '11plus' && level === 'mini') score -= 8;

  return clampScore(score);
}

export function computeRepairRiskScore(state = {}) {
  let score = 55;
  if (state.vehicle_year_band === '11plus') score -= 12;
  if (state.vehicle_year_band === '0-3') score += 8;
  if (state.usage_type === 'ticari') score -= 10;
  if (state.license_years === '0-2') score -= 8;
  if (state.license_years === '11plus') score += 5;
  if (state.vehicle_category === 'ticari_arac' || state.vehicle_category === 'ticari') score -= 6;
  return clampScore(score);
}

export function computePremiumEfficiencyScore(state = {}) {
  let score = 58;
  const budget = state.budget_level;
  const risk = state.risk_perception;
  const level = state.coverage_level;

  if (budget === 'orta') score += 10;
  if (budget === 'dusuk' && level === 'mini') score += 12;
  if (budget === 'yuksek' && level === 'full' && risk !== 'dusuk') score += 8;
  if (budget === 'dusuk' && level === 'full') score -= 20;
  if (budget === 'yuksek' && level === 'mini') score -= 8;
  return clampScore(score);
}

export function computeOverallDecisionScore(state = {}) {
  const coverage = computeCoverageScore(state);
  const repair = computeRepairRiskScore(state);
  const efficiency = computePremiumEfficiencyScore(state);
  const overall = Math.round(coverage * 0.38 + repair * 0.32 + efficiency * 0.3);
  return { coverage, repair, efficiency, overall: clampScore(overall) };
}

export function resolveScoreLabel(score) {
  if (score >= 82) return 'Güçlü uyum';
  if (score >= 68) return 'Dengeli profil';
  if (score >= 52) return 'Dikkatli seçim';
  return 'Revize önerilir';
}

function buildRiskAnalysis(state, scores) {
  const items = [];
  if (state.coverage_level === 'mini' && state.risk_perception === 'yuksek') {
    items.push(
      buildRiskItem({
        title: 'Teminat darlığı',
        description: 'Yüksek risk algısı mini kasko ile uyumsuz olabilir.',
        level: 'yüksek',
        recommendation: 'Standart veya geniş paketi karşılaştırın.'
      })
    );
  }
  if (state.vehicle_year_band === '11plus') {
    items.push(
      buildRiskItem({
        title: 'Araç yaşı',
        description: 'Eski modelde parça ve onarım maliyeti primi artırabilir.',
        level: 'orta',
        recommendation: 'Muafiyet ve ikame araç teminatını kontrol edin.'
      })
    );
  }
  if (scores.efficiency < 55) {
    items.push(
      buildRiskItem({
        title: 'Prim baskısı',
        description: 'Bütçe ve teminat seviyesi dengesiz modelleniyor.',
        level: 'orta',
        recommendation: 'En az iki teklifte limit/muafiyet tablosunu isteyin.'
      })
    );
  }
  if (!items.length) {
    items.push(
      buildRiskItem({
        title: 'Genel risk',
        description: 'Profil orta risk bandında; poliçe şartları teklif aşamasında netleşmeli.',
        level: 'düşük',
        recommendation: 'Hasarsızlık indirimi ve ödeme planını sorun.'
      })
    );
  }
  return items;
}

export function buildEngineResult(state = {}) {
  const scores = computeOverallDecisionScore(state);
  const riskAnalysis = buildRiskAnalysis(state, scores);
  const high = riskAnalysis.filter((r) => r.level === 'yüksek').length;
  const overallRisk = high >= 1 ? 'Yüksek' : riskAnalysis.some((r) => r.level === 'orta') ? 'Orta' : 'Düşük';

  const strengths = [];
  const weaknesses = [];
  if (scores.coverage >= 72) strengths.push('Teminat seviyesi profille uyumlu');
  else weaknesses.push('Teminat seviyesi gözden geçirilmeli');
  if (scores.efficiency >= 68) strengths.push('Prim verimliliği kabul edilebilir bandda');
  else weaknesses.push('Prim–teminat dengesi sıkışık olabilir');
  if (scores.repair >= 65) strengths.push('Onarım riski yönetilebilir');
  else weaknesses.push('Araç yaşı / kullanım onarım maliyetini artırabilir');

  const nextSteps = [
    'En az iki sigortacıdan EYM dahil kasko teklifi alın.',
    'Cam, mini onarım, ikame araç ve muafiyet maddelerini karşılaştırın.',
    'Hasarsızlık indirimi ve taksit planını yazılı teyit edin.'
  ];

  return {
    decisionScore: scores.overall,
    coverageScore: scores.coverage,
    repairRiskScore: scores.repair,
    premiumEfficiencyScore: scores.efficiency,
    scoreLabel: resolveScoreLabel(scores.overall),
    confidenceScore: clampScore(
      40 +
        (state.age ? 12 : 0) +
        (state.vehicle_category ? 10 : 0) +
        (state.coverage_level ? 15 : 0) +
        (state.budget_level ? 10 : 0)
    ),
    overallRisk,
    riskAnalysis,
    strengths,
    weaknesses,
    alternatives: buildAlternatives(state, scores),
    nextSteps
  };
}

const BADGES = {
  balanced: { label: 'Dengeli Paket', className: 'is-logical' },
  economic: { label: 'Ekonomik', className: 'is-economic' },
  premium: { label: 'Geniş Teminat', className: 'is-comfort' }
};

export function estimatePremiumBand(state) {
  let base = 14_000;
  if (state.vehicle_category === 'suv') base *= 1.08;
  if (state.vehicle_category === 'ticari_arac' || state.vehicle_category === 'ticari') base *= 1.25;
  if (state.vehicle_year_band === '0-3') base *= 1.15;
  if (state.vehicle_year_band === '11plus') base *= 0.92;
  const covMul = { mini: 0.72, standard: 1, full: 1.38 }[state.coverage_level] || 1;
  const budgetMul = { dusuk: 0.8, orta: 1, yuksek: 1.22 }[state.budget_level] || 1;
  return Math.round(base * covMul * budgetMul);
}

function buildAlternatives(state, scores) {
  const premium = estimatePremiumBand(state);
  return [
    {
      title: 'Standart paket',
      description: 'Dengeli teminat ve muafiyet.',
      meta: `~₺${premium.toLocaleString('tr-TR')}/yıl`
    },
    {
      title: state.coverage_level === 'mini' ? 'Standart’a yükselt' : 'Geniş paket',
      description: 'Limit artışı ve ek teminatlar.',
      meta: `~₺${Math.round(premium * 1.2).toLocaleString('tr-TR')}/yıl`
    }
  ];
}

export function resolvePrimaryKaskoResult(results = [], selectedId = '') {
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
export function syncCanonicalKaskoScores(state, results = [], selectedId = '') {
  const engine = buildEngineResult(state);
  const canonical = engine.decisionScore;
  (results || []).forEach((r) => {
    r.score = canonical;
  });
  return resolvePrimaryKaskoResult(results, selectedId);
}

export function buildKaskoResults(state = {}) {
  const engine = buildEngineResult(state);
  const premium = estimatePremiumBand(state);
  const coverageLabel = optionLabel('coverage_level', state.coverage_level) || 'Standart';

  return [
    {
      id: 'balanced',
      badge: BADGES.balanced,
      title: 'Önerilen kasko paketi',
      description: coverageLabel,
      score: engine.decisionScore,
      estimatedCost: `Yıllık ~₺${premium.toLocaleString('tr-TR')}`,
      suitability: engine.scoreLabel,
      why: 'Teminat, onarım riski ve prim verimliliği skorlarının birleşimi.',
      pros: engine.strengths.slice(0, 3),
      cautions: engine.weaknesses.slice(0, 2),
      metrics: { premiumBand: premium, package: 'balanced' }
    },
    {
      id: 'economic',
      badge: BADGES.economic,
      title: 'Ekonomik kasko senaryosu',
      description: 'Daha dar teminat — prim baskısını azaltır.',
      score: Math.max(48, engine.decisionScore - 6),
      estimatedCost: `Yıllık ~₺${Math.round(premium * 0.82).toLocaleString('tr-TR')}`,
      suitability: 'Maliyet odaklı',
      why: 'Prim verimliliği ve bütçe bandı öncelikli profil.',
      pros: ['Daha düşük prim bandı', 'Zorunlu teminatları karşılar'],
      cautions: ['Teminat limitleri dar olabilir', 'Hasar anında ek ödeme riski'],
      metrics: { premiumBand: Math.round(premium * 0.82), package: 'economic' }
    },
    {
      id: 'premium',
      badge: BADGES.premium,
      title: 'Geniş kasko senaryosu',
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
}

export function buildKaskoSummary(state = {}, results = []) {
  const engine = buildEngineResult(state);
  const primary = results[0];
  return {
    fitScore: engine.decisionScore,
    scoreBand: engine.scoreLabel,
    totalCostLabel: primary?.estimatedCost || '—',
    totalCostHint: 'Tahmini yıllık prim',
    seasonRisk: engine.overallRisk,
    riskDetail: engine.riskAnalysis[0]?.title || '—',
    advantages: engine.strengths,
    cautions: engine.weaknesses,
    nextStep: engine.nextSteps[0],
    topTitle: primary?.title || 'Kasko senaryosu',
    extraKpis: [
      { label: 'Teminat', value: `${engine.coverageScore}/100` },
      { label: 'Onarım riski', value: `${engine.repairRiskScore}/100` },
      { label: 'Verimlilik', value: `${engine.premiumEfficiencyScore}/100` }
    ]
  };
}

export function getKaskoProgress(state = {}) {
  return [
    { key: 'Araç tipi', value: optionLabel('vehicle_category', state.vehicle_category) },
    { key: 'Araç yaşı', value: optionLabel('vehicle_year_band', state.vehicle_year_band) },
    { key: 'Ehliyet', value: optionLabel('license_years', state.license_years) },
    { key: 'Kullanım', value: optionLabel('usage_type', state.usage_type) },
    { key: 'Teminat', value: optionLabel('coverage_level', state.coverage_level) },
    { key: 'Risk', value: optionLabel('risk_perception', state.risk_perception) },
    { key: 'Bütçe', value: optionLabel('budget_level', state.budget_level) }
  ];
}
