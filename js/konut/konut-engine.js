/**
 * @deprecated Canlı /konut/ sonuçları `konut-results-v2.js` + `decision-intelligence-engine.js` kullanır.
 */
import { KONUT_OPTIONS } from './konut-config.js';
import { formatTry, parseManualBudget } from '../tatil/tatil-utils.js';

const BUDGET_MID = {
  giris: 3_000_000,
  orta: 6_000_000,
  ust: 11_000_000,
  premium: 18_000_000
};

const BADGES = {
  logical: { label: 'En Mantıklı Seçenek', className: 'is-logical' },
  economic: { label: 'En Ekonomik Seçenek', className: 'is-economic' },
  comfort: { label: 'En Konforlu Seçenek', className: 'is-comfort' }
};

function label(mapKey, value) {
  return KONUT_OPTIONS[mapKey]?.find((o) => o.value === value)?.label || value || '';
}

function budgetTarget(state) {
  if (state.budget_range === 'manuel' && state.budget_manual) {
    return Number(state.budget_manual);
  }
  return BUDGET_MID[state.budget_range] || 6_000_000;
}

function monthlyMortgage(total, downPct = 0.25, years = 15, annualRate = 0.42) {
  const principal = total * (1 - downPct);
  const months = years * 12;
  const r = annualRate / 12;
  if (r <= 0) return Math.round(principal / months);
  const pay = (principal * r * (1 + r) ** months) / ((1 + r) ** months - 1);
  return Math.round(pay);
}

function baseScore(state) {
  let score = 62;
  if (state.profile_goal === 'satin-alma') score += 4;
  if (state.profile_goal === 'yatirim') score += 2;
  if (state.financing_mode === 'dengeli' || state.financing_mode === 'nakit-agir') score += 6;
  if (state.property_type === 'daire') score += 3;
  if (state.location_pref === 'esnek') score += 2;
  score += Math.min((state.risk_factors?.length || 0) * 2, 10);
  if ((state.cost_factors?.length || 0) >= 2) score += 3;
  return Math.min(score, 92);
}

function buildScenario(state, badgeKey, multiplier, title, desc) {
  const target = Math.round(budgetTarget(state) * multiplier);
  const monthly = monthlyMortgage(target);
  const aidat = state.property_type === 'mustakil' ? 0 : Math.round(target * 0.0012);
  const taxMaint = Math.round(target * 0.0008);
  const tco12 = monthly * 12 + (aidat + taxMaint) * 12;
  const score = Math.min(
    98,
    Math.max(
      52,
      baseScore(state) + (badgeKey === 'comfort' ? 6 : badgeKey === 'economic' ? -4 : 2)
    )
  );
  const riskCount = state.risk_factors?.length || 0;
  const risk =
    riskCount >= 4 ? 'Orta-Yüksek' : riskCount >= 2 ? 'Orta' : 'Düşük-Orta';

  return {
    id: badgeKey,
    badge: BADGES[badgeKey],
    title,
    description: desc,
    score,
    estimatedCost: `${formatTry(target)} (tahmini liste bandı)`,
    suitability: `${score}/100 uyum`,
    audience: label('profile', state.profile_goal),
    why: `${label('location', state.location_pref)} bölgesinde ${label('property', state.property_type)} tipi; ${label('financing', state.financing_mode)} profiline göre dengelenmiş senaryo.`,
    pros: [
      `Tahmini aylık ipotek yükü: ${formatTry(monthly)}`,
      `12 ay toplam nakit yükü (taksit + sabit): ~${formatTry(tco12)}`,
      state.profile_goal === 'yatirim' ? 'Kira getirisi senaryosu ayrıca değerlendirilebilir' : 'Yaşam tarzı uyumu önceliklendirildi'
    ],
    cautions: [
      'Faiz ve kampanya koşulları bankaya göre değişir',
      riskCount ? `İşaretlenen riskler: ${state.risk_factors.map((r) => label('risks', r)).join(', ')}` : 'Risk profili sınırlı veriyle hesaplandı',
      'Kesin tapu, vergi ve ekspertiz maliyetleri dahil değildir'
    ],
    metrics: {
      totalCost: target,
      monthlyLoad: monthly,
      riskLevel: risk,
      financeFit: state.financing_mode === 'belirsiz' ? 'Senaryo karşılaştırması önerilir' : label('financing', state.financing_mode)
    }
  };
}

export function buildKonutResults(state) {
  const loc = label('location', state.location_pref);
  return [
    buildScenario(
      state,
      'logical',
      1,
      `${loc} — Dengeli konut`,
      'Toplam sahip olma maliyeti ve aylık yük dengesi optimize edilmiş profil.'
    ),
    buildScenario(
      state,
      'economic',
      0.88,
      `${loc} — Ekonomik segment`,
      'Daha düşük liste bandı; nakit akışı baskısını azaltmaya odaklı.'
    ),
    buildScenario(
      state,
      'comfort',
      1.12,
      `${loc} — Konfor / üst segment`,
      'Lokasyon ve konfor öncelikli; yüksek aidat ve premium site riski dahil.'
    )
  ];
}

export function buildKonutSummary(state, results) {
  const primary = results[0];
  return {
    totalCostLabel: primary?.estimatedCost || '—',
    fitScore: primary?.score ?? '—',
    seasonRisk: primary?.metrics?.riskLevel || '—',
    familyFit: label('profile', state.profile_goal),
    topTitle: primary?.title || '—',
    monthlyLoad: primary?.metrics?.monthlyLoad,
    financeFit: primary?.metrics?.financeFit
  };
}

export function buildKonutCommentary(state, results) {
  const p = results[0];
  return {
    summary: `${p?.title || 'Konut'} profiliniz için kural tabanlı ön değerlendirme: tahmini aylık yük ${formatTry(p?.metrics?.monthlyLoad)} bandında, genel uyum skoru ${p?.score}/100.`,
    bullets: [
      `Amaç: ${label('profile', state.profile_goal)} · Tip: ${label('property', state.property_type)}`,
      `Finansman: ${label('financing', state.financing_mode)}`,
      `Risk seviyesi: ${p?.metrics?.riskLevel} — skor finansal tavsiye değildir`
    ],
    caution:
      'Deprem, imar, tapu ve banka koşulları için yerinde uzman görüşü alınmalıdır. Bu çıktı karar destek amaçlıdır.'
  };
}

export function getKonutProgress(state) {
  return [
    { key: 'Amaç', value: label('profile', state.profile_goal) },
    {
      key: 'Bütçe',
      value: state.budget_manual
        ? formatTry(state.budget_manual)
        : KONUT_OPTIONS.budget.find((o) => o.value === state.budget_range)?.label || ''
    },
    { key: 'Konut tipi', value: label('property', state.property_type) },
    { key: 'Lokasyon', value: label('location', state.location_pref) },
    { key: 'Finansman', value: label('financing', state.financing_mode) }
  ];
}

export { parseManualBudget };
