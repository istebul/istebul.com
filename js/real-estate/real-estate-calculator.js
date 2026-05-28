function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function formatTry(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
}

export function calculateMortgagePayment(principal, monthlyRate, months) {
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

export function calculateDebtToIncome(monthlyDebt, monthlyIncome) {
  const debt = Math.max(Number(monthlyDebt) || 0, 0);
  const income = Math.max(Number(monthlyIncome) || 0, 0);
  if (!income) return 100;
  return (debt / income) * 100;
}

export function calculateLocationFitScore(state) {
  const weights = {
    iseYakinlik: 9,
    okulaYakinlik: 7,
    hastane: 6,
    topluTasima: 8,
    otopark: 5,
    guvenlik: 9,
    sosyalAlan: 6,
    sessizlik: 6,
    merkeziLokasyon: 7,
    dogayaYakinlik: 5
  };
  const chips = state.locationPreferences || [];
  const score = chips.reduce((sum, key) => sum + (weights[key] || 3), 0);
  const normalization = Math.max(Object.keys(weights).length * 9, 1);
  return clamp(Math.round((score / normalization) * 100 * 2.3), 48, 99);
}

export function calculateRiskLevel(metrics) {
  const riskScore = clamp(Math.round(
    metrics.dti * 0.35 +
    metrics.earthquakeRiskScore * 0.2 +
    metrics.maintenanceRisk * 0.15 +
    metrics.locationRisk * 0.15 +
    metrics.liquidityRisk * 0.15
  ), 0, 100);

  if (riskScore < 35) return { label: 'Düşük', score: riskScore };
  if (riskScore < 62) return { label: 'Orta', score: riskScore };
  return { label: 'Yüksek', score: riskScore };
}

export function calculateInvestmentPotential(metrics) {
  const raw = 100 - metrics.locationRisk * 0.45 - metrics.maintenanceRisk * 0.15 + metrics.locationFit * 0.35 + (metrics.rentYield || 0) * 0.05;
  return clamp(Math.round(raw), 35, 98);
}

export function calculateOwnershipCost(input) {
  const homePrice = Number(input.totalBudget) || 0;
  const downPayment = Number(input.downPayment) || 0;
  const principal = Math.max(Number(input.loanAmount) || (homePrice - downPayment), 0);
  const months = Math.max(Number(input.termMonths) || 120, 1);
  const monthlyRate = (Number(input.interestRate) || 0) / 100 / 12;
  const monthlyPayment = calculateMortgagePayment(principal, monthlyRate, months);
  const totalRepayment = calculateTotalRepayment(monthlyPayment, months);
  const totalInterest = Math.max(totalRepayment - principal, 0);
  const titleFees = Math.round(homePrice * 0.045);
  const annualDues = (Number(input.dues) || 0) * 12;
  const renovation = Number(input.renovationCost) || 0;
  const transportation = (Number(input.transportCost) || 0) * 12 * 10;
  const realTotal = homePrice + totalInterest + titleFees + annualDues * 10 + renovation + transportation;

  return {
    homePrice,
    downPayment,
    principal,
    monthlyPayment,
    totalRepayment,
    totalInterest,
    titleFees,
    annualDues,
    renovation,
    transportation,
    realTotal
  };
}

export function calculateHousingDecisionScore(metrics) {
  const score = 100
    - metrics.dti * 0.23
    + metrics.locationFit * 0.22
    + metrics.investmentPotential * 0.18
    - metrics.risk.score * 0.2
    + metrics.lifeQuality * 0.15
    - metrics.costPressure * 0.12;
  return clamp(Math.round(score), 30, 99);
}

export function buildHousingScenarios(base) {
  const makeScore = (monthlyImpact, riskImpact, lifeImpact) =>
    clamp(Math.round(base.score + lifeImpact - riskImpact - monthlyImpact / 2200), 25, 98);

  return [
    {
      title: 'Daha düşük bütçeli konut',
      monthlyEffect: '-2.100 TL',
      totalEffect: '-%11 toplam maliyet',
      riskEffect: 'Likidite riski azalır',
      lifeEffect: 'Yaşam kalitesi bir miktar düşebilir',
      score: makeScore(-2100, -4, -2)
    },
    {
      title: 'Daha yüksek peşinat',
      monthlyEffect: '-3.450 TL',
      totalEffect: '-%8 faiz yükü',
      riskEffect: 'Kredi yükü riski düşer',
      lifeEffect: 'Likidite rezervi azalabilir',
      score: makeScore(-3450, -9, -1)
    },
    {
      title: 'Daha kısa vade',
      monthlyEffect: '+2.950 TL',
      totalEffect: '-%17 toplam faiz',
      riskEffect: 'Kısa vadede gelir baskısı artar',
      lifeEffect: 'Uzun vadeli finansal özgürlük artar',
      score: makeScore(2950, 6, 3)
    },
    {
      title: 'Daha düşük aidatlı alternatif',
      monthlyEffect: '-950 TL',
      totalEffect: '-%4 yıllık sahip olma maliyeti',
      riskEffect: 'Aidat riski düşer',
      lifeEffect: 'Sosyal olanaklar azalabilir',
      score: makeScore(-950, -6, -1)
    },
    {
      title: 'Daha yeni bina',
      monthlyEffect: '+1.380 TL',
      totalEffect: '+%6 satın alma maliyeti',
      riskEffect: 'Deprem ve bakım riski düşer',
      lifeEffect: 'Yaşam konforu artar',
      score: makeScore(1380, -8, 5)
    },
    {
      title: 'Daha merkezi ama küçük metrekare',
      monthlyEffect: '+640 TL',
      totalEffect: '+%5 satın alma maliyeti',
      riskEffect: 'Likidite/ulaşım riski düşer',
      lifeEffect: 'Alan konforu azalabilir',
      score: makeScore(640, -4, 0)
    },
    {
      title: 'Daha uzak ama geniş metrekare',
      monthlyEffect: '-760 TL',
      totalEffect: '-%4 satın alma maliyeti',
      riskEffect: 'Lokasyon riski artabilir',
      lifeEffect: 'Yaşam alanı artar',
      score: makeScore(-760, 5, 4)
    },
    {
      title: 'Kirada kal, birikim artır',
      monthlyEffect: '-4.900 TL',
      totalEffect: 'Kısa vadede nakit rezerv +',
      riskEffect: 'Piyasa riski ertelenir',
      lifeEffect: 'Sahiplik avantajı ertelenir',
      score: makeScore(-4900, -3, -4)
    }
  ];
}
