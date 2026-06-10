/**
 * Karar Asistanı ↔ dikey sayfa enum köprüsü ve AI insight girdisi.
 */

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

const VERTICAL_BY_ASSISTANT = Object.freeze({
  arac: 'auto',
  ev: 'konut',
  tatil: 'tatil',
  finansman: 'finansman',
  sigorta: 'sigorta',
  kasko: 'kasko'
});

const KONUT_PURPOSES = ',live,investment,seasonal,premium,';
const KONUT_PROPERTIES = ',daire,mustakil,villa,';
const FINANS_TERMS = { arac: ',12,24,36,48,60,', konut: ',36,48,60,', tatil: ',12,24,36,', ihtiyac: ',12,24,36,48,', isletme: ',12,24,36,48,60,' };

/** İl query değeri — hafif format doğrulaması (tam il listesi konut runtime'da). */
const KONUT_PROVINCE_QUERY_PATTERN = /^[\p{L}\s'-]+$/u;

function isValidPositiveInteger(value) {
  const raw = String(value ?? '').trim();
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? String(n) : null;
}

function pickCsv(value, csv) {
  const v = String(value ?? '').trim();
  return v && csv.includes(`,${v},`) ? v : null;
}

export function normalizeAutoUsage(usage = '') {
  const key = String(usage || '').trim();
  return AUTO_USAGE_TO_VERTICAL[key] || key || 'city';
}

/** MPV kasa tercihi vertical sihirbazda SUV ile modellenir. */
export function normalizeAutoBody(body = '') {
  const key = String(body || '').trim();
  if (key === 'mpv') return 'suv';
  return key;
}

export function normalizeTatilGoal(vacationType = '') {
  const key = String(vacationType || '').trim();
  return TATIL_ASSISTANT_TO_VERTICAL[key] || key;
}

export function assistantVerticalId(categoryId = '') {
  return VERTICAL_BY_ASSISTANT[categoryId] || 'auto';
}

export function isValidKonutAssistantProvinceQuery(province = '') {
  const name = String(province || '').trim();
  if (name.length < 2 || name.length > 40) return false;
  return KONUT_PROVINCE_QUERY_PATTERN.test(name);
}

function normalizeKonutDistrict(district = '') {
  const value = String(district || '').trim().slice(0, 60);
  return value || null;
}

function normalizeKonutBudget(budget) {
  return isValidPositiveInteger(budget);
}

/** @param {URLSearchParams} params @param {Record<string, unknown>} answers */
export function appendKonutAssistantQueryParams(params, answers = {}) {
  if (!params || !answers) return params;

  const budget = normalizeKonutBudget(answers.budget);
  if (budget) params.set('budget', budget);

  const province = String(answers.province || '').trim();
  if (isValidKonutAssistantProvinceQuery(province)) params.set('province', province);

  const district = normalizeKonutDistrict(answers.district);
  if (district) params.set('district', district);

  const purposeKey = String(answers.purpose || '').trim();
  if (pickCsv(purposeKey, KONUT_PURPOSES)) params.set('purpose', purposeKey);

  const propertyKey = String(answers.propertyType || '').trim();
  if (pickCsv(propertyKey, KONUT_PROPERTIES)) params.set('propertyType', propertyKey);

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
    const budget = isValidPositiveInteger(answers.budget);
    if (budget) params.set('budget', budget);
    const usage = normalizeAutoUsage(answers.usage);
    if (pickCsv(usage, ',family,city,long,business,')) params.set('usage', usage);
    const fuel = pickCsv(answers.fuel, ',any,hybrid,electric,gasoline,diesel,');
    if (fuel) params.set('fuel', fuel);
    const body = pickCsv(normalizeAutoBody(answers.body), ',suv,sedan,hatchback,');
    if (body) params.set('body', body);
    return `/auto/${params.toString() ? `?${params}` : ''}`;
  }
  if (categoryId === 'ev') {
    appendKonutAssistantQueryParams(params, answers);
    return `/konut/${params.toString() ? `?${params}` : ''}`;
  }
  if (categoryId === 'tatil') {
    if (answers.vacationType) params.set('goal', normalizeTatilGoal(answers.vacationType));
    const budget = isValidPositiveInteger(answers.budget);
    if (budget) params.set('budget', budget);
    if (answers.travelers) params.set('travelers', answers.travelers);
    if (answers.priority) params.set('priority', answers.priority);
    return `/tatil/${params.toString() ? `?${params}` : ''}`;
  }
  if (categoryId === 'finansman') {
    const purpose = String(answers.purpose ?? '').trim();
    if (FINANS_TERMS[purpose]) params.set('purpose', purpose);
    const amount = isValidPositiveInteger(answers.budget);
    if (amount) params.set('amount', amount);
    const term = String(answers.term ?? '').trim();
    if (purpose && term && FINANS_TERMS[purpose]?.includes(`,${term},`)) params.set('term', term);
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
