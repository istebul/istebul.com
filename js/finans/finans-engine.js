import { FINANS_OPTIONS } from './finans-config.js';
import { formatTry, parseManualBudget } from '../tatil/tatil-utils.js';

const BADGES = {
  logical: { label: 'En Dengeli Senaryo', className: 'is-logical' },
  economic: { label: 'En Düşük Aylık Yük', className: 'is-economic' },
  comfort: { label: 'Esnek Nakit Akışı', className: 'is-comfort' }
};

function label(mapKey, value) {
  return FINANS_OPTIONS[mapKey]?.find((o) => o.value === value)?.label || value || '';
}

function amountMid(state) {
  if (state.amount_range === 'manuel' && state.amount_manual) {
    return Number(state.amount_manual);
  }
  return FINANS_OPTIONS.amount.find((o) => o.value === state.amount_range)?.mid || 750_000;
}

function capacityMid(state) {
  if (state.capacity_range === 'manuel' && state.capacity_manual) {
    return Number(state.capacity_manual);
  }
  return FINANS_OPTIONS.capacity.find((o) => o.value === state.capacity_range)?.cap || 25_000;
}

function termMonths(state) {
  return FINANS_OPTIONS.term.find((o) => o.value === state.term_months)?.months || 36;
}

function estimatePayment(principal, months, annualRate = 0.45) {
  const r = annualRate / 12;
  if (r <= 0) return Math.round(principal / months);
  return Math.round((principal * r * (1 + r) ** months) / ((1 + r) ** months - 1));
}

function baseScore(state) {
  let score = 60;
  if (state.risk_tolerance === 'dengeli') score += 5;
  if (state.income_type === 'stabil') score += 6;
  if (state.early_payment === 'yuksek') score += 4;
  if (state.rate_sensitivity === 'orta') score += 3;
  const cap = capacityMid(state);
  const pay = estimatePayment(amountMid(state), termMonths(state));
  if (pay <= cap * 0.85) score += 8;
  else if (pay <= cap) score += 4;
  else score -= 6;
  return Math.min(Math.max(score, 48), 94);
}

function buildScenario(state, badgeKey, rateAdj, termAdj, title, desc) {
  const principal = amountMid(state);
  const months = Math.max(12, termMonths(state) + termAdj);
  const monthly = estimatePayment(principal, months, 0.42 + rateAdj);
  const totalRepay = monthly * months;
  const cap = capacityMid(state);
  const pressure = monthly > cap ? 'Yüksek' : monthly > cap * 0.85 ? 'Orta' : 'Düşük';
  const score = Math.min(
    98,
    Math.max(50, baseScore(state) + (badgeKey === 'economic' ? 4 : badgeKey === 'comfort' ? 2 : 0))
  );

  return {
    id: badgeKey,
    badge: BADGES[badgeKey],
    title,
    description: desc,
    score,
    estimatedCost: `Aylık ~${formatTry(monthly)}`,
    suitability: `${score}/100 uyum`,
    audience: label('purpose', state.purpose),
    why: `${label('purpose', state.purpose)} amacı için ${months} ay vadeli senaryo; gelir profili ${label('income', state.income_type)}.`,
    pros: [
      `Tahmini aylık ödeme: ${formatTry(monthly)}`,
      `Toplam geri ödeme yaklaşımı: ~${formatTry(totalRepay)} (tahmini)`,
      `Nakit akışı baskısı: ${pressure}`
    ],
    cautions: [
      'Faiz oranı kampanya ve müşteri profiline göre değişir',
      `Faiz hassasiyeti: ${label('rateSensitivity', state.rate_sensitivity)}`,
      'Erken ödeme koşulları kuruma göre farklılaşır'
    ],
    metrics: {
      monthlyPayment: monthly,
      totalRepay,
      cashPressure: pressure,
      riskLevel: pressure === 'Yüksek' ? 'Orta-Yüksek' : pressure === 'Orta' ? 'Orta' : 'Düşük-Orta',
      financeFit: monthly <= cap ? 'Kapasite ile uyumlu' : 'Kapasite üzerinde — vade/tutar revizyonu önerilir'
    }
  };
}

export function buildFinansResults(state) {
  const purpose = label('purpose', state.purpose);
  return [
    buildScenario(
      state,
      'logical',
      0,
      0,
      `${purpose} — Dengeli vade`,
      'Aylık ödeme ve toplam maliyet dengesi optimize edilmiş senaryo.'
    ),
    buildScenario(
      state,
      'economic',
      -0.03,
      6,
      `${purpose} — Uzun vade / düşük taksit`,
      'Daha uzun vade ile aylık yükü düşürmeye odaklı (toplam maliyet artabilir).'
    ),
    buildScenario(
      state,
      'comfort',
      0.02,
      -6,
      `${purpose} — Kısa vade`,
      'Daha kısa vade; toplam faiz yükü düşebilir, aylık taksit artabilir.'
    )
  ];
}

export function buildFinansSummary(state, results) {
  const primary = results[0];
  return {
    totalCostLabel: `Toplam ~${formatTry(primary?.metrics?.totalRepay)}`,
    fitScore: primary?.score ?? '—',
    seasonRisk: primary?.metrics?.riskLevel || '—',
    familyFit: primary?.metrics?.financeFit || '—',
    topTitle: primary?.title || '—',
    monthlyLoad: primary?.metrics?.monthlyPayment
  };
}

export function buildFinansCommentary(state, results) {
  const p = results[0];
  return {
    summary: `${label('purpose', state.purpose)} finansmanı için ön senaryo: aylık ödeme bandı ${formatTry(p?.metrics?.monthlyPayment)}, uyum skoru ${p?.score}/100.`,
    bullets: [
      `Tutar bandı: ${state.amount_manual ? formatTry(state.amount_manual) : label('amount', state.amount_range)}`,
      `Vade: ${label('term', state.term_months)} · Kapasite: ${state.capacity_manual ? formatTry(state.capacity_manual) : label('capacity', state.capacity_range)}`,
      `Risk toleransı: ${label('riskTolerance', state.risk_tolerance)}`
    ],
    caution:
      'Banka onayı, KKDF/BSMV ve sigorta kalemleri teklif ile netleşir. Bu çıktı finansal tavsiye değildir.'
  };
}

export function getFinansProgress(state) {
  return [
    { key: 'Amaç', value: label('purpose', state.purpose) },
    {
      key: 'Tutar',
      value: state.amount_manual ? formatTry(state.amount_manual) : label('amount', state.amount_range)
    },
    { key: 'Vade', value: label('term', state.term_months) },
    {
      key: 'Kapasite',
      value: state.capacity_manual ? formatTry(state.capacity_manual) : label('capacity', state.capacity_range)
    },
    { key: 'Gelir', value: label('income', state.income_type) }
  ];
}

export { parseManualBudget };
