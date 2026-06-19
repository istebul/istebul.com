import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CASH_BUFFER_OPTIONS,
  buildKonutCashBufferInsightClause,
  buildKonutCashBufferRiskClause,
  buildKonutEarthquakeInsightClause,
  buildKonutHouseholdInsightClause,
  buildKonutLocationPreferenceInsightClause
} from '../../js/konut/konut-wizard-profile.js';

import { buildDecisionInsight } from '../../js/features/ai/ai-insight-engine.js';
import { calculateDebtToIncome, calculateHousingDecisionScore, calculateOwnershipCost } from '../../js/real-estate/real-estate-calculator.js';

const baseState = {
  purchasePurpose: 'Satın almak istiyorum',
  totalBudget: 4_000_000,
  downPayment: 1_200_000,
  monthlyCapacity: 45_000,
  monthlyIncome: 80_000,
  currentDebt: 0,
  useFinancing: 'evet',
  loanAmount: 2_800_000,
  termMonths: '120',
  interestRate: '42',
  city: 'İstanbul',
  district: 'Kadıköy',
  homeType: 'Daire',
  locationPreferences: ['ulasim', 'okul'],
  riskPreferences: ['Deprem riski hassasiyeti'],
  householdSize: '4',
  roomCount: '3+1',
  squareMeters: '110',
  earthquakeRiskInput: '62',
  buildingAge: '12',
  duesExpectation: '3500'
};

function buildScore(state) {
  const ownership = calculateOwnershipCost(state);
  const monthlyDebt = ownership.monthlyPayment + Number(state.currentDebt || 0);
  const dti = calculateDebtToIncome(monthlyDebt, Number(state.monthlyIncome || 0));
  return calculateHousingDecisionScore({
    dti,
    locationFit: 78,
    investmentPotential: 70,
    risk: { score: 48 },
    lifeQuality: 72,
    costPressure: 30,
    budgetFit: 75,
    downPaymentStrength: 65,
    homeTypeFit: 82,
    financingClarity: 85,
    riskDensity: 40
  });
}

test('CASH_BUFFER_OPTIONS exposes four bands', () => {
  assert.equal(CASH_BUFFER_OPTIONS.length, 4);
  assert.deepEqual(CASH_BUFFER_OPTIONS.map(([key]) => key), ['0-1', '2-3', '4-6', '6+']);
});

test('cash_buffer_months narrative reflects tight and strong buffers', () => {
  assert.match(buildKonutCashBufferInsightClause({ cash_buffer_months: '0-1' }), /nakit sıkışması/i);
  assert.match(buildKonutCashBufferInsightClause({ cash_buffer_months: '6+' }), /güvenlik payı/i);
  assert.match(buildKonutCashBufferRiskClause({ cash_buffer_months: '0-1' }), /nakit tamponu/i);
});

test('locationPreferences produce priority-aware explanation', () => {
  const clause = buildKonutLocationPreferenceInsightClause({
    locationPreferences: ['ulasim', 'sessiz'],
    riskPreferences: ['Değer artış potansiyeli']
  });
  assert.match(clause, /ulaşım/i);
  assert.match(clause, /sessiz bölge/i);
  assert.match(clause, /yatırım potansiyeli/i);
});

test('householdSize produces room and family context without scoring', () => {
  const clause = buildKonutHouseholdInsightClause({
    householdSize: '4',
    roomCount: '3+1',
    squareMeters: '110'
  });
  assert.match(clause, /4 kişilik hane/i);
  assert.match(clause, /aile yaşam/i);
  assert.match(clause, /3\+1|metrekare/i);
});

test('earthquake explanation uses input and risk preference without new score', () => {
  const clause = buildKonutEarthquakeInsightClause({
    earthquakeRiskInput: '72',
    riskPreferences: ['Deprem riski hassasiyeti']
  });
  assert.match(clause, /yüksek profilde/i);
  assert.match(clause, /deprem riski hassasiyet/i);
  assert.match(clause, /raporu teyidi/i);
});

test('cash_buffer_months does not change housing decision score or DTI', () => {
  const withoutBuffer = buildScore(baseState);
  const dtiBefore = calculateDebtToIncome(
    calculateOwnershipCost(baseState).monthlyPayment,
    Number(baseState.monthlyIncome)
  );

  const withBuffer = buildScore({ ...baseState, cash_buffer_months: '0-1' });
  const dtiAfter = calculateDebtToIncome(
    calculateOwnershipCost({ ...baseState, cash_buffer_months: '0-1' }).monthlyPayment,
    Number(baseState.monthlyIncome)
  );

  assert.equal(withoutBuffer, withBuffer);
  assert.equal(dtiBefore, dtiAfter);
});

test('buildDecisionInsight uses cash buffer, household and location in konut why/risk', () => {
  const insight = buildDecisionInsight({
    vertical: 'konut',
    answers: {
      ...baseState,
      cash_buffer_months: '0-1'
    },
    scores: { decision: 72, overallRisk: 'Orta' },
    costs: {
      budget: 4_000_000,
      monthlyPayment: 42_000,
      duesMonthly: 3500,
      dti: 35
    }
  });

  assert.match(insight.why, /güvenlik payı|nakit sıkışması/i);
  assert.match(insight.why, /ulaşım|okul/i);
  assert.match(insight.why, /4 kişilik hane/i);
  assert.match(insight.risk, /nakit tamponu|Peşinat sonrası/i);
  assert.match(insight.nextStep, /tamponu|nakit akış/i);
  assert.match(insight.summary, /72/);
});
