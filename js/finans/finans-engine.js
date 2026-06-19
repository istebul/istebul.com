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

export function baseScore(state) {
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
  const income = Number(state.monthly_income || 0);
  const expense = Number(state.monthly_expense || 0);
  const debt = Number(state.existing_debt || 0);
  if (income > 0) {
    const dti = ((pay + debt) / income) * 100;
    if (dti <= 35) score += 6;
    else if (dti <= 45) score += 2;
    else score -= 8;
    const freeCash = income - expense - debt - pay;
    if (freeCash > income * 0.15) score += 4;
    else if (freeCash < 0) score -= 5;
  }
  return Math.min(Math.max(score, 48), 94);
}

export function computeDebtScore(state) {
  const income = Number(state.monthly_income || 0);
  const expense = Number(state.monthly_expense || 0);
  const debt = Number(state.existing_debt || 0);
  const pay = estimatePayment(amountMid(state), termMonths(state));
  if (!income) return 62;
  const dti = ((pay + debt) / income) * 100;
  const buffer = income - expense - debt - pay;
  let score = 88 - Math.max(0, dti - 28) * 1.2;
  if (buffer < 0) score -= 12;
  else if (buffer > income * 0.2) score += 6;
  return Math.round(Math.min(Math.max(score, 35), 95));
}

function recommendedCreditRange(state) {
  const principal = amountMid(state);
  const low = Math.round(principal * 0.85);
  const high = Math.round(principal * 1.08);
  return `${formatTry(low)} – ${formatTry(high)}`;
}

function financialRiskLabel(state, pressure) {
  const debtScore = computeDebtScore(state);
  if (debtScore >= 78 && pressure !== 'Yüksek') return 'Düşük';
  if (debtScore >= 62) return 'Orta';
  return 'Yüksek';
}

function buildNextFinansStep(state, primary) {
  if (primary?.metrics?.cashPressure === 'Yüksek') {
    return 'Tutarı düşürün veya vadeyi uzatarak aylık yükü kapasite bandına çekin; ardından banka ön görüşmesi planlayın.';
  }
  if (state.risk_tolerance === 'muhafazakar') {
    return 'Muhafazakar profiliniz için kısa vade senaryosunu banka teklifiyle doğrulayın.';
  }
  return 'Önerilen kredi aralığında 2–3 kurumdan karşılaştırmalı teklif alın; erken ödeme koşullarını sorun.';
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
  const primary = results.find((r) => r.id === state.selected_option) || results[0];
  const debtScore = computeDebtScore(state);
  const finRisk = financialRiskLabel(state, primary?.metrics?.cashPressure);
  return {
    totalCostLabel: `Toplam ~${formatTry(primary?.metrics?.totalRepay)}`,
    totalCostHint: `Aylık ~${formatTry(primary?.metrics?.monthlyPayment)}`,
    fitScore: primary?.score ?? '—',
    seasonRisk: finRisk,
    riskDetail: primary?.metrics?.cashPressure || '—',
    familyFit: primary?.metrics?.financeFit || '—',
    topTitle: primary?.title || '—',
    monthlyLoad: primary?.metrics?.monthlyPayment,
    scoreBand: debtScore >= 75 ? 'Borçlanma profili güçlü' : debtScore >= 60 ? 'Dengeli borçlanma profili' : 'Revizyon önerilir',
    nextStep: buildNextFinansStep(state, primary),
    extraKpis: [
      { label: 'Borçlanma Skoru', value: `${debtScore}/100` },
      { label: 'Finansal Risk', value: finRisk },
      { label: 'Önerilen Kredi Aralığı', value: recommendedCreditRange(state) }
    ]
  };
}

export function buildFinansCommentary(state, results) {
  const p = results.find((r) => r.id === state.selected_option) || results[0];
  const debtScore = computeDebtScore(state);
  return {
    summary: `${label('purpose', state.purpose)} finansmanı için ön senaryo: aylık ödeme ${formatTry(p?.metrics?.monthlyPayment)}, borçlanma skoru ${debtScore}/100.`,
    bullets: [
      `Kredi amacı: ${label('purpose', state.purpose)} · Vade: ${label('term', state.term_months)}`,
      `Gelir: ${state.monthly_income ? formatTry(state.monthly_income) : '—'} · Gider: ${state.monthly_expense ? formatTry(state.monthly_expense) : '—'}`,
      `Mevcut borç: ${state.existing_debt ? formatTry(state.existing_debt) : '—'} · Risk: ${label('riskTolerance', state.risk_tolerance)}`
    ],
    caution:
      'Banka onayı, KKDF/BSMV ve sigorta kalemleri teklif ile netleşir. Bu çıktı finansal tavsiye değildir.',
    nextStep: buildNextFinansStep(state, p)
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
    { key: 'Gelir', value: state.monthly_income ? formatTry(state.monthly_income) : label('income', state.income_type) },
    { key: 'Gider', value: state.monthly_expense ? formatTry(state.monthly_expense) : '—' }
  ];
}

export { parseManualBudget };
