/**
 * Karar Asistanı ↔ dikey sayfa enum köprüsü ve AI insight girdisi.
 */

import { TURKEY_CITIES } from '../../real-estate/turkey-cities.js';

const AUTO_USAGE_TO_VERTICAL = Object.freeze({
  longRoad: 'long',
  prestige: 'business',
  city: 'city',
  family: 'family',
  long: 'long',
  business: 'business'
});

const TATIL_ASSISTANT_TO_VERTICAL = Object.freeze({
  familyResort: 'deniz',
  honeymoon: 'balayi',
  culture: 'kultur',
  nature: 'doga',
  luxury: 'luks-resort'
});

const ASSISTANT_TATIL_TRAVELERS_MAP = Object.freeze({
  solo: { people_type: 'tek', travelers_count: '1' },
  couple: { people_type: 'cift', travelers_count: '2' },
  family: { people_type: 'cocuklu-aile', travelers_count: '4' },
  group: { people_type: 'arkadas', travelers_count: '4' }
});

const ASSISTANT_TATIL_PRIORITY_TO_COMFORT = Object.freeze({
  premium: 'luks',
  quiet: 'premium',
  allInclusive: 'dengeli',
  experience: 'dengeli'
});

const VERTICAL_BY_ASSISTANT = Object.freeze({
  arac: 'auto',
  ev: 'konut',
  tatil: 'tatil',
  finansman: 'finansman',
  sigorta: 'sigorta',
  kasko: 'kasko'
});

const KONUT_ASSISTANT_PURPOSE_TO_LABEL = Object.freeze({
  live: 'Satın almak istiyorum',
  investment: 'Yatırım amaçlı düşünüyorum',
  seasonal: 'Satın almak istiyorum',
  premium: 'Satın almak istiyorum'
});

const KONUT_ASSISTANT_PROPERTY_TO_HOME_TYPE = Object.freeze({
  daire: 'Daire',
  mustakil: 'Müstakil',
  villa: 'Villa'
});

const KONUT_VALID_PURPOSE_KEYS = new Set(Object.keys(KONUT_ASSISTANT_PURPOSE_TO_LABEL));
const KONUT_VALID_PROPERTY_KEYS = new Set(Object.keys(KONUT_ASSISTANT_PROPERTY_TO_HOME_TYPE));
const KONUT_VALID_CITIES = new Set(TURKEY_CITIES);

const KONUT_PURCHASE_PURPOSE_LABELS = new Set(Object.values(KONUT_ASSISTANT_PURPOSE_TO_LABEL));
const KONUT_HOME_TYPE_LABELS = new Set(Object.values(KONUT_ASSISTANT_PROPERTY_TO_HOME_TYPE));

export function normalizeAutoUsage(usage = '') {
  const key = String(usage || '').trim();
  return AUTO_USAGE_TO_VERTICAL[key] || key || 'city';
}

export function normalizeTatilGoal(vacationType = '') {
  const key = String(vacationType || '').trim();
  return TATIL_ASSISTANT_TO_VERTICAL[key] || key;
}

export function assistantVerticalId(categoryId = '') {
  return VERTICAL_BY_ASSISTANT[categoryId] || 'auto';
}

export function mapAssistantKonutPurpose(purpose = '') {
  const key = String(purpose || '').trim();
  if (!KONUT_VALID_PURPOSE_KEYS.has(key)) return null;
  return KONUT_ASSISTANT_PURPOSE_TO_LABEL[key] || null;
}

export function mapAssistantKonutPropertyType(propertyType = '') {
  const key = String(propertyType || '').trim();
  if (!KONUT_VALID_PROPERTY_KEYS.has(key)) return null;
  return KONUT_ASSISTANT_PROPERTY_TO_HOME_TYPE[key] || null;
}

export function isValidKonutAssistantCity(city = '') {
  const name = String(city || '').trim();
  return Boolean(name) && KONUT_VALID_CITIES.has(name);
}

function normalizeKonutDistrict(district = '') {
  const value = String(district || '').trim().slice(0, 60);
  return value || null;
}

function normalizeKonutBudget(budget) {
  const n = Number(String(budget ?? '').replace(/\D/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(Math.round(n));
}

/** @param {URLSearchParams} params @param {Record<string, unknown>} answers */
export function appendKonutAssistantQueryParams(params, answers = {}) {
  if (!params || !answers) return params;

  const budget = normalizeKonutBudget(answers.budget);
  if (budget) params.set('budget', budget);

  const province = String(answers.province || '').trim();
  if (isValidKonutAssistantCity(province)) params.set('province', province);

  const district = normalizeKonutDistrict(answers.district);
  if (district) params.set('district', district);

  const purposeKey = String(answers.purpose || '').trim();
  if (KONUT_VALID_PURPOSE_KEYS.has(purposeKey)) params.set('purpose', purposeKey);

  const propertyKey = String(answers.propertyType || '').trim();
  if (KONUT_VALID_PROPERTY_KEYS.has(propertyKey)) params.set('propertyType', propertyKey);

  return params;
}

/**
 * Ana sayfa asistan sonucu için ai-insight-engine girdisi.
 */
export function buildAssistantInsightInput(categoryId, categoryConfig, primary, answers = {}, recommendations = []) {
  const vertical = assistantVerticalId(categoryId);
  const normalizedAnswers = { ...answers };

  if (categoryId === 'arac') {
    normalizedAnswers.usage = normalizeAutoUsage(answers.usage);
  }
  if (categoryId === 'tatil' && answers.vacationType) {
    normalizedAnswers.vacation_goal = normalizeTatilGoal(answers.vacationType);
  }
  if (categoryId === 'finansman') {
    if (answers.purpose) normalizedAnswers.purpose = answers.purpose;
    if (answers.term) normalizedAnswers.term_months = answers.term;
    if (answers.capacity) normalizedAnswers.capacity = answers.capacity;
    if (answers.rateSensitivity) normalizedAnswers.rate_sensitivity = answers.rateSensitivity;
  }
  if (categoryId === 'sigorta') {
    if (answers.insuranceType) normalizedAnswers.insurance_type = answers.insuranceType;
    if (answers.risk_perception) normalizedAnswers.risk_perception = answers.risk_perception;
    if (answers.budget_level) normalizedAnswers.budget_level = answers.budget_level;
  }
  if (categoryId === 'kasko') {
    if (answers.vehicle_category) normalizedAnswers.vehicle_category = answers.vehicle_category;
    if (answers.coverage_level) normalizedAnswers.coverage_level = answers.coverage_level;
  }

  const alt = recommendations.find((item) => item.name !== primary?.name);
  const bestFinance = primary?.financeComparisons?.[0];

  return {
    vertical,
    planTier: 'guest',
    decisionScore: primary?.score,
    overallRisk: primary?.riskLevel || 'Orta',
    answers: normalizedAnswers,
    recommendation: {
      name: primary?.name,
      label: primary?.name,
      score: primary?.score
    },
    strengths: [primary?.scoreNote, primary?.realisticComment].filter(Boolean),
    weaknesses: [],
    costs: {
      budget: Number(answers.budget) || null,
      total: primary?.yearlyCost || primary?.price || null,
      monthlyPayment: bestFinance?.monthlyPayment || null,
      termMonths: bestFinance?.term || Number(answers.term) || null,
      principal: primary?.price || Number(answers.budget) || null
    },
    alternatives: alt ?
      [{ title: alt.name, description: alt.scoreNote || '', meta: `${alt.score}/100` }]
    : []
  };
}

/** Dikey sayfaya devam linki (query ile profil taşıma). */
export function buildVerticalContinueHref(categoryId, answers = {}) {
  const params = new URLSearchParams();
  if (categoryId === 'arac') {
    if (answers.budget) params.set('budget', answers.budget);
    if (answers.usage) params.set('usage', normalizeAutoUsage(answers.usage));
    if (answers.fuel) params.set('fuel', answers.fuel);
    if (answers.body) params.set('body', answers.body);
    return `/auto/${params.toString() ? `?${params}` : ''}`;
  }
  if (categoryId === 'ev') {
    appendKonutAssistantQueryParams(params, answers);
    return `/konut/${params.toString() ? `?${params}` : ''}`;
  }
  if (categoryId === 'tatil') {
    if (answers.vacationType) params.set('goal', normalizeTatilGoal(answers.vacationType));
    if (answers.budget) params.set('budget', answers.budget);
    if (answers.travelers) params.set('travelers', answers.travelers);
    if (answers.priority) params.set('priority', answers.priority);
    return `/tatil/${params.toString() ? `?${params}` : ''}`;
  }
  if (categoryId === 'finansman') {
    if (answers.purpose) params.set('purpose', answers.purpose);
    if (answers.budget) params.set('amount', answers.budget);
    if (answers.term) params.set('term', answers.term);
    return `/finans/${params.toString() ? `?${params}` : ''}`;
  }
  if (categoryId === 'sigorta') {
    if (answers.insuranceType) params.set('type', answers.insuranceType);
    if (answers.risk_perception) params.set('risk', answers.risk_perception);
    if (answers.budget_level) params.set('budget_level', answers.budget_level);
    return `/sigorta/${params.toString() ? `?${params}` : ''}`;
  }
  if (categoryId === 'kasko') {
    if (answers.vehicle_category) params.set('vehicle', answers.vehicle_category);
    if (answers.vehicle_year_band) params.set('year', answers.vehicle_year_band);
    if (answers.coverage_level) params.set('coverage', answers.coverage_level);
    return `/kasko/${params.toString() ? `?${params}` : ''}`;
  }
  return '/';
}

/** Tatil dikey sihirbaz — ana sayfa asistan query profili. */
const AUTO_WIZARD_BUDGET_PRESETS = Object.freeze(['500000', '900000', '1500000', '2500000']);

const AUTO_WIZARD_USAGE = new Set(['family', 'city', 'long', 'business']);
const AUTO_WIZARD_BODY = new Set(['suv', 'sedan', 'hatchback']);
const AUTO_WIZARD_FUEL = new Set(['any', 'hybrid', 'electric', 'gasoline', 'diesel']);

/** Auto dikey sihirbaz — ana sayfa asistan query profili. */
export function bootstrapAutoFromAssistantQuery(state, params = new URLSearchParams()) {
  if (!state || !params) return state;

  const usage = params.get('usage');
  const budget = params.get('budget');
  const fuel = params.get('fuel');
  const body = params.get('body');

  if (usage) {
    const normalized = normalizeAutoUsage(usage);
    if (AUTO_WIZARD_USAGE.has(normalized)) state.usage = normalized;
  }
  if (budget) {
    const n = Number(String(budget).replace(/\D/g, ''));
    if (Number.isFinite(n) && n > 0) {
      const preset = AUTO_WIZARD_BUDGET_PRESETS.find((value) => Number(value) === n);
      if (preset) {
        state.budget = preset;
      } else {
        state.budget = 'custom';
        state.budget_custom = String(Math.round(n));
      }
    }
  }
  if (fuel && AUTO_WIZARD_FUEL.has(fuel)) state.fuel = fuel;
  if (body && AUTO_WIZARD_BODY.has(body)) state.body = body;

  return state;
}

export function bootstrapTatilFromAssistantQuery(state, params = new URLSearchParams()) {
  if (!state || !params) return state;
  const goal = params.get('goal');
  const budget = params.get('budget');
  const travelers = params.get('travelers');
  const priority = params.get('priority');

  if (goal) state.vacation_goal = normalizeTatilGoal(goal) || goal;
  if (budget) {
    const n = Number(String(budget).replace(/\D/g, ''));
    if (Number.isFinite(n) && n > 0) {
      state.budget_range = 'manuel';
      state.budget_manual = n;
      state.budget_total = n;
    }
  }
  const travelerProfile = ASSISTANT_TATIL_TRAVELERS_MAP[travelers];
  if (travelerProfile) {
    state.people_type = travelerProfile.people_type;
    state.travelers_count = travelerProfile.travelers_count;
  }
  if (priority && ASSISTANT_TATIL_PRIORITY_TO_COMFORT[priority]) {
    state.comfort_expectation = ASSISTANT_TATIL_PRIORITY_TO_COMFORT[priority];
  }
  return state;
}

export function bootstrapFinansFromAssistantQuery(state, params = new URLSearchParams()) {
  if (!state || !params) return state;
  const purpose = params.get('purpose');
  const amount = params.get('amount');
  const term = params.get('term');
  if (purpose) state.purpose = purpose;
  if (term) state.term_months = term;
  if (amount) {
    const n = Number(String(amount).replace(/\D/g, ''));
    if (Number.isFinite(n) && n > 0) {
      state.amount_range = 'manuel';
      state.amount_manual = n;
    }
  }
  return state;
}

export function bootstrapSigortaFromAssistantQuery(state, params = new URLSearchParams()) {
  if (!state || !params) return state;
  const type = params.get('type') || params.get('insurance_type');
  const risk = params.get('risk') || params.get('risk_perception');
  const budgetLevel = params.get('budget_level');
  if (type) state.insurance_type = type;
  if (risk) state.risk_perception = risk;
  if (budgetLevel) state.budget_level = budgetLevel;
  return state;
}

export function bootstrapKaskoFromAssistantQuery(state, params = new URLSearchParams()) {
  if (!state || !params) return state;
  const vehicle = params.get('vehicle') || params.get('vehicle_category');
  const year = params.get('year') || params.get('vehicle_year_band');
  const coverage = params.get('coverage') || params.get('coverage_level');
  if (vehicle) state.vehicle_category = vehicle;
  if (year) state.vehicle_year_band = year;
  if (coverage) state.coverage_level = coverage;
  return state;
}

function applyKonutPrefillField(state, field, value, allowedValues = null) {
  if (!state || value == null || value === '') return false;
  if (state[field]) return false;
  if (allowedValues && !allowedValues.has(value)) return false;
  state[field] = value;
  return true;
}

/** Konut dikey sihirbaz — karar asistanı query profili. */
export function bootstrapKonutFromAssistantQuery(state, params = new URLSearchParams()) {
  if (!state || !params) return state;

  let applied = false;

  const budget = normalizeKonutBudget(params.get('budget'));
  if (applyKonutPrefillField(state, 'totalBudget', budget)) applied = true;

  const province = params.get('province') || params.get('city');
  if (isValidKonutAssistantCity(province) && applyKonutPrefillField(state, 'city', String(province).trim(), KONUT_VALID_CITIES)) {
    applied = true;
  }

  const district = normalizeKonutDistrict(params.get('district'));
  if (applyKonutPrefillField(state, 'district', district)) applied = true;

  const purchasePurpose = mapAssistantKonutPurpose(params.get('purpose'));
  if (applyKonutPrefillField(state, 'purchasePurpose', purchasePurpose, KONUT_PURCHASE_PURPOSE_LABELS)) {
    applied = true;
  }

  const homeType = mapAssistantKonutPropertyType(params.get('propertyType'));
  if (applyKonutPrefillField(state, 'homeType', homeType, KONUT_HOME_TYPE_LABELS)) {
    applied = true;
  }

  if (applied) state.assistantPrefillHint = true;
  return state;
}
