function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function formatTry(value) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export function calculateMonthlyPayment(principal, monthlyRate, months) {
  const p = Math.max(Number(principal) || 0, 0);
  const r = Math.max(Number(monthlyRate) || 0, 0);
  const n = Math.max(Number(months) || 0, 0);
  if (!p || !n) return 0;
  if (!r) return p / n;
  const factor = Math.pow(1 + r, n);
  return (p * r * factor) / (factor - 1);
}

export function calculateTotalRepayment(monthlyPayment, months) {
  return (Number(monthlyPayment) || 0) * Math.max(Number(months) || 0, 0);
}

export function calculateTotalInterest(totalRepayment, principal) {
  return Math.max((Number(totalRepayment) || 0) - (Number(principal) || 0), 0);
}

export function calculateDebtToIncome(monthlyPayment, income, existingDebt) {
  const numerator = (Number(monthlyPayment) || 0) + (Number(existingDebt) || 0);
  const denominator = Math.max(Number(income) || 0, 1);
  return (numerator / denominator) * 100;
}

export function calculateSafeInstallment(income, fixedExpenses, existingDebt) {
  const net = Math.max(Number(income) || 0, 0) - Math.max(Number(fixedExpenses) || 0, 0) - Math.max(Number(existingDebt) || 0, 0);
  return Math.max(Math.round(net * 0.55), 0);
}

export function calculatePaymentComfortScore({ monthlyPayment, safeInstallment, dti }) {
  const usage = safeInstallment > 0 ? (monthlyPayment / safeInstallment) * 100 : 100;
  const score = 100 - usage * 0.5 - dti * 0.35;
  return clamp(Math.round(score), 20, 99);
}

export function calculateCashFlowFitScore({ income, fixedExpenses, existingDebt, monthlyPayment }) {
  const remaining = Number(income || 0) - Number(fixedExpenses || 0) - Number(existingDebt || 0) - Number(monthlyPayment || 0);
  const ratio = Number(income || 0) > 0 ? (remaining / Number(income || 0)) * 100 : -100;
  return clamp(Math.round(50 + ratio), 10, 98);
}

export function calculateRiskLevel({ dti, cashFlowFit, paymentComfort, priorities = [] }) {
  const baseRisk = dti * 0.52 + (100 - cashFlowFit) * 0.25 + (100 - paymentComfort) * 0.23;
  const adjustment = priorities.includes('Düşük risk') ? -8 : 0;
  const score = clamp(Math.round(baseRisk + adjustment), 0, 100);
  if (score < 35) return { label: 'Düşük', score };
  if (score < 62) return { label: 'Orta', score };
  return { label: 'Yüksek', score };
}

export function calculateFinanceDecisionScore({ paymentComfort, cashFlowFit, totalCostEfficiency, riskScore }) {
  const score = paymentComfort * 0.3 + cashFlowFit * 0.27 + totalCostEfficiency * 0.23 + (100 - riskScore) * 0.2;
  return clamp(Math.round(score), 22, 99);
}

export function buildFinanceScenarios(base) {
  const scoreFor = (monthlyDelta, totalDelta, riskDelta) =>
    clamp(Math.round(base.score - riskDelta - monthlyDelta / 2400 - totalDelta / 120000), 20, 99);

  return [
    {
      title: 'Daha kısa vade',
      monthlyEffect: '+2.450 TL',
      totalEffect: '-%15 toplam faiz',
      riskEffect: 'Kısa vadede taksit yükü artar',
      score: scoreFor(2450, -160000, 4)
    },
    {
      title: 'Daha uzun vade',
      monthlyEffect: '-1.720 TL',
      totalEffect: '+%19 toplam faiz',
      riskEffect: 'Uzun vadeli maliyet riski artar',
      score: scoreFor(-1720, 210000, 6)
    },
    {
      title: 'Daha yüksek peşinat',
      monthlyEffect: '-2.980 TL',
      totalEffect: '-%12 toplam maliyet',
      riskEffect: 'Borç/gelir oranı düşer',
      score: scoreFor(-2980, -130000, -5)
    },
    {
      title: 'Daha düşük kredi tutarı',
      monthlyEffect: '-2.140 TL',
      totalEffect: '-%10 toplam geri ödeme',
      riskEffect: 'Nakit akışı uyumu artar',
      score: scoreFor(-2140, -118000, -4)
    },
    {
      title: 'Borç kapatma öncelikli yapı',
      monthlyEffect: '-1.250 TL',
      totalEffect: '+%3 masraf',
      riskEffect: 'Toplam borç riski azalır',
      score: scoreFor(-1250, 30000, -6)
    },
    {
      title: 'Bekleme / birikim artırma',
      monthlyEffect: '-4.100 TL',
      totalEffect: 'Kısa vadede maliyet ertelenir',
      riskEffect: 'Likidite tamponu artar',
      score: scoreFor(-4100, -50000, -3)
    }
  ];
}
