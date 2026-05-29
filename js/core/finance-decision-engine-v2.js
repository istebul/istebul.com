/**
 * Finansman Karar Motoru V2 — kural tabanlı.
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function monthlyPayment(principal, annualRate, months) {
  const p = Math.max(Number(principal) || 0, 0);
  const n = Math.max(Number(months) || 0, 1);
  const r = Math.max(Number(annualRate) || 0, 0) / 12;
  if (!p) return 0;
  if (!r) return Math.round(p / n);
  const factor = (1 + r) ** n;
  return Math.round((p * r * factor) / (factor - 1));
}

/**
 * Finansman wizard (finance-app) girdileri.
 */
export function computeFinanceWizardV2(state = {}, metrics = {}) {
  const principal = Number(state.loanAmount || 0);
  const months = Number(state.manualTerm || state.termMonths || metrics.months || 0);
  const monthlyRatePct = Number(state.monthlyRate || 0);
  const income = Number(state.monthlyIncome || 0);

  const pay =
    metrics.monthlyPayment ??
    monthlyPayment(principal, monthlyRatePct, months);
  const totalRepay =
    metrics.totalRepayment ?? pay * Math.max(months, 1);
  const interestLoad = Math.max(
    metrics.totalInterest ?? totalRepay - principal,
    0
  );
  const dti =
    metrics.dti ??
    (income > 0
      ? (((pay + Number(state.existingDebt || 0)) / income) * 100)
      : 100);

  let confidence = 90;
  const gaps = [];
  if (!principal) {
    confidence -= 22;
    gaps.push('Kredi tutarı');
  }
  if (!months) {
    confidence -= 14;
    gaps.push('Vade');
  }
  if (!income) {
    confidence -= 18;
    gaps.push('Gelir');
  }
  if (!monthlyRatePct && !metrics.monthlyPayment) {
    confidence -= 10;
    gaps.push('Faiz oranı');
  }
  confidence = clamp(confidence, 28, 98);

  const incomeInstallmentRatio = income > 0 ? (pay / income) * 100 : 100;
  const budgetFit = clamp(
    Math.round(100 - Math.max(0, incomeInstallmentRatio - 28) * 1.4),
    20,
    96
  );
  const riskScore = metrics.risk?.score ?? clamp(Math.round(dti * 0.85), 15, 95);
  const financeDecisionScore =
    metrics.decisionScore ??
    clamp(
      Math.round(
        budgetFit * 0.28 +
          (metrics.paymentComfort || 70) * 0.22 +
          (metrics.cashFlowFit || 65) * 0.2 +
          (100 - riskScore) * 0.2 +
          (metrics.totalCostEfficiency || 60) * 0.1
      ),
      22,
      99
    );

  let riskLevel = metrics.risk?.label || 'Orta';
  if (riskScore < 35) riskLevel = 'Düşük';
  else if (riskScore >= 62) riskLevel = 'Yüksek';

  return {
    monthlyPayment: pay,
    totalRepayment: totalRepay,
    interestLoad,
    incomeInstallmentRatio,
    budgetFit,
    riskScore,
    riskLevel,
    financeDecisionScore,
    confidenceScore: confidence,
    dataGaps: gaps,
    gapMessage:
      gaps.length > 0
        ? 'Daha net analiz için gelir, vade, kredi tutarı bilgisi eklenmeli.'
        : ''
  };
}

/**
 * Finans dikey akışı (finans-app / chip wizard) girdileri.
 */
export function computeFinansVerticalV2(state = {}, primaryResult = {}) {
  const income = Number(state.monthly_income || 0);
  const expense = Number(state.monthly_expense || 0);
  const debt = Number(state.existing_debt || 0);
  const principal =
    state.amount_manual ||
    (state.amount_range === 'manuel' ? 0 : null) ||
    primaryResult?.metrics?.principal ||
    750_000;
  const amount = Number(principal) || 750_000;
  const months =
    primaryResult?.metrics?.months ||
    ({ '12': 12, '24': 24, '36': 36, '48': 48, '60': 60 }[state.term_months] || 36);
  const annualRate = 0.45;
  const pay = primaryResult?.metrics?.monthlyPayment ?? monthlyPayment(amount, annualRate, months);
  const totalRepay = pay * months;
  const interestLoad = Math.max(totalRepay - amount, 0);
  const dti = income > 0 ? ((pay + debt) / income) * 100 : 100;

  let confidence = 88;
  const gaps = [];
  if (!state.amount_range && !state.amount_manual) {
    confidence -= 16;
    gaps.push('Kredi tutarı');
  }
  if (!state.term_months) {
    confidence -= 12;
    gaps.push('Vade');
  }
  if (!income) {
    confidence -= 20;
    gaps.push('Gelir');
  }
  confidence = clamp(confidence, 30, 98);

  const budgetFit = clamp(Math.round(100 - Math.max(0, dti - 30) * 1.35), 22, 96);
  const riskScore = dti > 45 ? 68 : dti > 35 ? 48 : 32;
  const financeDecisionScore = clamp(
    Math.round(
      (primaryResult?.score || 70) * 0.45 + budgetFit * 0.35 + (100 - riskScore) * 0.2
    ),
    35,
    96
  );

  let riskLevel = 'Orta';
  if (riskScore < 38) riskLevel = 'Düşük';
  else if (riskScore >= 60) riskLevel = 'Yüksek';

  return {
    monthlyPayment: pay,
    totalRepayment: totalRepay,
    interestLoad,
    incomeInstallmentRatio: dti,
    budgetFit,
    riskScore,
    riskLevel,
    financeDecisionScore,
    confidenceScore: confidence,
    dataGaps: gaps,
    gapMessage:
      gaps.length > 0
        ? 'Daha net analiz için gelir, vade, kredi tutarı bilgisi eklenmeli.'
        : ''
  };
}
