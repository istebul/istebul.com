import test from 'node:test';
import assert from 'node:assert/strict';

const {
  mapAutoToDecisionV3,
  mapHousingToDecisionV3,
  mapFinanceToDecisionV3
} = await import('../../js/decision/decision-v3-mappers.js');

const { buildDecisionEngineV3 } = await import('../../js/decision/ai-decision-engine-v3.js');

const AUTO_INPUT = {
  formData: {
    budget: 1_500_000,
    usage: 'family',
    fuel: 'hybrid',
    monthlyIncome: 80_000
  },
  topResult: {
    price: 1_350_000,
    fuel: 'hybrid',
    costs: { ownership: { totals: { months12: 420_000 } } }
  },
  intel: { decisionScore: 78, confidenceScore: 82 }
};

const HOUSING_INPUT = {
  state: {
    totalBudget: 5_000_000,
    city: 'İstanbul',
    district: 'Kadıköy',
    homeType: 'Daire',
    purchasePurpose: 'Satın almak istiyorum',
    useFinancing: 'evet',
    downPayment: 1_000_000,
    monthlyIncome: 90_000,
    riskPreferences: ['Deprem riski hassasiyeti', 'Kira getirisi beklentisi']
  },
  metrics: {
    earthquakeRiskScore: 42,
    liquidityRisk: 35,
    investmentPotential: 68,
    ownership: { homePrice: 4_800_000, downPayment: 1_000_000, monthlyPayment: 42_000 }
  },
  totalCost: { firstYearTotal: 1_200_000, yearlyLoad: 504_000, downPayment: 1_000_000 }
};

const FINANCE_INPUT = {
  state: {
    purpose: 'konut',
    amount_range: '1m',
    amount_manual: null,
    term_months: '36',
    monthly_income: 75_000,
    existing_debt: 8_000,
    early_payment: 'belki',
    risk_tolerance: 'dengeli',
    income_type: 'stabil',
    capacity_range: '25k'
  },
  totalCost: {
    principal: 750_000,
    monthlyPayment: 28_500,
    months: 36,
    effectiveAnnualRate: 42.5,
    yearlyLoad: 342_000
  }
};

test('mapAutoToDecisionV3 returns vertical auto', () => {
  const mapped = mapAutoToDecisionV3(AUTO_INPUT);
  assert.equal(mapped.vertical, 'auto');
  assert.equal(mapped.budget, 1_500_000);
  assert.equal(mapped.vehiclePrice, 1_350_000);
});

test('mapHousingToDecisionV3 returns vertical housing', () => {
  const mapped = mapHousingToDecisionV3(HOUSING_INPUT);
  assert.equal(mapped.vertical, 'housing');
  assert.equal(mapped.budget, 5_000_000);
  assert.equal(mapped.city, 'İstanbul');
  assert.equal(mapped.district, 'Kadıköy');
  assert.equal(mapped.propertyType, 'Daire');
  assert.equal(mapped.usagePurpose, 'Satın almak istiyorum');
  assert.equal(mapped.financingUsage, 'evet');
  assert.equal(mapped.downPayment, 1_000_000);
  assert.equal(mapped.monthlyIncome, 90_000);
  assert.equal(mapped.earthquakeRisk, 42);
});

test('mapFinanceToDecisionV3 returns vertical finance', () => {
  const mapped = mapFinanceToDecisionV3(FINANCE_INPUT);
  assert.equal(mapped.vertical, 'finance');
  assert.equal(mapped.requestedAmount, 750_000);
  assert.equal(mapped.monthlyIncome, 75_000);
  assert.equal(mapped.existingDebt, 8_000);
  assert.equal(mapped.loanTerm, 36);
  assert.equal(mapped.installment, 28_500);
  assert.equal(mapped.purpose, 'konut');
  assert.equal(mapped.incomeStability, 'stabil');
});

test('mappers do not throw on missing input', () => {
  assert.doesNotThrow(() => mapAutoToDecisionV3({}));
  assert.doesNotThrow(() => mapHousingToDecisionV3({}));
  assert.doesNotThrow(() => mapFinanceToDecisionV3({}));
});

test('mappers leave missing fields as null', () => {
  const housing = mapHousingToDecisionV3({ state: { city: 'Ankara' } });
  assert.equal(housing.budget, null);
  assert.equal(housing.district, null);
  assert.equal(housing.loanTerm, null);

  const finance = mapFinanceToDecisionV3({ state: { purpose: 'arac' } });
  assert.equal(finance.requestedAmount, null);
  assert.equal(finance.installment, null);
});

test('buildDecisionEngineV3 works with housing mapper output', () => {
  const mapped = mapHousingToDecisionV3(HOUSING_INPUT);
  const result = buildDecisionEngineV3(mapped);
  assert.equal(result.version, 'v3');
  assert.equal(result.vertical, 'housing');
  assert.ok(result.whatIfScenarios.length >= 5);
});

test('buildDecisionEngineV3 works with finance mapper output', () => {
  const mapped = mapFinanceToDecisionV3(FINANCE_INPUT);
  const result = buildDecisionEngineV3(mapped);
  assert.equal(result.version, 'v3');
  assert.equal(result.vertical, 'finance');
  assert.ok(Array.isArray(result.explainableReasons));
});

test('mapper + engine scores stay within 0-100', () => {
  for (const mapper of [
    () => mapAutoToDecisionV3(AUTO_INPUT),
    () => mapHousingToDecisionV3(HOUSING_INPUT),
    () => mapFinanceToDecisionV3(FINANCE_INPUT)
  ]) {
    const result = buildDecisionEngineV3(mapper());
    assert.ok(result.decisionScore >= 0 && result.decisionScore <= 100);
    assert.ok(result.confidenceScore >= 0 && result.confidenceScore <= 100);
    assert.ok(result.riskScore >= 0 && result.riskScore <= 100);
  }
});

test('partial housing input lowers confidence vs full input', () => {
  const full = buildDecisionEngineV3(mapHousingToDecisionV3(HOUSING_INPUT));
  const partial = buildDecisionEngineV3(
    mapHousingToDecisionV3({ state: { city: 'Ankara', totalBudget: 3_000_000 } })
  );
  assert.ok(full.confidenceScore > partial.confidenceScore);
});
