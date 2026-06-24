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
const FINANS_CAPACITY = {
  arac: ',15k,25k,40k,60k,',
  konut: ',25k,40k,60k,',
  tatil: ',15k,25k,40k,',
  ihtiyac: ',15k,25k,40k,60k,',
  isletme: ',25k,40k,60k,'
};
const FINANS_RATE_SENSITIVITY = {
  arac: ',dusuk,orta,yuksek,',
  konut: ',dusuk,orta,yuksek,',
  tatil: ',orta,yuksek,',
  ihtiyac: ',dusuk,orta,yuksek,',
  isletme: ',orta,yuksek,'
};

const KASKO_VEHICLES_CSV = ',otomobil,suv,motosiklet,ticari_arac,';
const KASKO_YEARS_CSV = ',0-3,4-10,11plus,';
const KASKO_USAGE_CSV = ',ozel,ticari,';
const KASKO_COVERAGE_CSV = ',mini,standard,full,';
const KASKO_TRI_LEVEL_CSV = ',dusuk,orta,yuksek,';
const KASKO_USAGE_BY_VEHICLE = Object.freeze({
  otomobil: ',ozel,ticari,',
  suv: ',ozel,',
  motosiklet: ',ozel,',
  ticari_arac: ',ticari,'
});
const KASKO_COVERAGE_BY_VEHICLE_USAGE = Object.freeze({
  otomobil: { ozel: ',mini,standard,full,', ticari: ',mini,standard,full,' },
  suv: { ozel: ',standard,full,' },
  motosiklet: { ozel: ',mini,standard,' },
  ticari_arac: { ticari: ',standard,full,' }
});
const KASKO_RISK_BY_VEHICLE = Object.freeze({
  otomobil: ',dusuk,orta,yuksek,',
  suv: ',orta,yuksek,',
  motosiklet: ',orta,yuksek,',
  ticari_arac: ',orta,yuksek,'
});
const KASKO_BUDGET_BY_VEHICLE = Object.freeze({
  otomobil: ',dusuk,orta,yuksek,',
  suv: ',orta,yuksek,',
  motosiklet: ',dusuk,orta,',
  ticari_arac: ',orta,yuksek,'
});

const SIGORTA_TYPES_CSV = ',arac,konut,saglik,seyahat,';
const SIGORTA_LICENSE_YEARS_CSV = ',0-2,3-10,11plus,';
const SIGORTA_USAGE_CSV = ',ozel,ticari,';
const SIGORTA_PROPERTY_ROLE_CSV = ',malik,kiraci,';
const SIGORTA_DESTINATION_CSV = ',yurtici,yurtdisi,schengen,';
const SIGORTA_TRIP_DURATION_CSV = ',1-7,8-15,16plus,';

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

function isValidKaskoUsageForVehicle(vehicle = '', usage = '') {
  const csv = KASKO_USAGE_BY_VEHICLE[String(vehicle ?? '').trim()];
  const value = String(usage ?? '').trim();
  return Boolean(csv && value && csv.includes(`,${value},`));
}

function isValidKaskoCoverageForVehicleUsage(vehicle = '', usage = '', coverage = '') {
  const byUsage = KASKO_COVERAGE_BY_VEHICLE_USAGE[String(vehicle ?? '').trim()];
  const csv = byUsage?.[String(usage ?? '').trim()];
  const value = String(coverage ?? '').trim();
  return Boolean(csv && value && csv.includes(`,${value},`));
}

function isValidKaskoRiskForVehicle(vehicle = '', risk = '') {
  const csv = KASKO_RISK_BY_VEHICLE[String(vehicle ?? '').trim()];
  const value = String(risk ?? '').trim();
  return Boolean(csv && value && csv.includes(`,${value},`));
}

function isValidKaskoBudgetForVehicle(vehicle = '', budgetLevel = '') {
  const csv = KASKO_BUDGET_BY_VEHICLE[String(vehicle ?? '').trim()];
  const value = String(budgetLevel ?? '').trim();
  return Boolean(csv && value && csv.includes(`,${value},`));
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
    const cityRaw = String(answers.province || answers.city || '').trim();
    if (isValidKonutAssistantProvinceQuery(cityRaw)) params.set('city', cityRaw);
    const householdSize = pickCsv(
      answers.household_size || answers.householdSize,
      ',1,2,3-4,5+,'
    );
    if (householdSize) params.set('household_size', householdSize);
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
    const capacity = pickCsv(answers.capacity, FINANS_CAPACITY[purpose] || '');
    if (purpose && capacity) params.set('capacity', capacity);
    const rateSensitivity = pickCsv(answers.rateSensitivity, FINANS_RATE_SENSITIVITY[purpose] || '');
    if (purpose && rateSensitivity) params.set('rate_sensitivity', rateSensitivity);
    return `/finans/${params.toString() ? `?${params}` : ''}`;
  }
  if (categoryId === 'sigorta') {
    const insuranceType = pickCsv(answers.insuranceType, SIGORTA_TYPES_CSV);
    if (insuranceType) params.set('type', insuranceType);
    if (answers.risk_perception) params.set('risk', answers.risk_perception);
    if (answers.budget_level) params.set('budget_level', answers.budget_level);
    if (insuranceType === 'arac') {
      const licenseYears = pickCsv(answers.license_years, SIGORTA_LICENSE_YEARS_CSV);
      if (licenseYears) params.set('license_years', licenseYears);
      const usageType = pickCsv(answers.usage_type, SIGORTA_USAGE_CSV);
      if (usageType) params.set('usage_type', usageType);
    }
    if (insuranceType === 'konut') {
      const propertyRole = pickCsv(answers.property_role, SIGORTA_PROPERTY_ROLE_CSV);
      if (propertyRole) params.set('property_role', propertyRole);
    }
    if (insuranceType === 'seyahat') {
      const destinationType = pickCsv(answers.destination_type, SIGORTA_DESTINATION_CSV);
      if (destinationType) params.set('destination_type', destinationType);
      const tripDuration = pickCsv(answers.trip_duration, SIGORTA_TRIP_DURATION_CSV);
      if (tripDuration) params.set('trip_duration', tripDuration);
    }
    return `/sigorta/${params.toString() ? `?${params}` : ''}`;
  }
  if (categoryId === 'kasko') {
    const vehicle = pickCsv(answers.vehicle_category, KASKO_VEHICLES_CSV);
    if (vehicle) params.set('vehicle', vehicle);
    const year = pickCsv(answers.vehicle_year_band, KASKO_YEARS_CSV);
    if (year) params.set('year', year);
    const usage = pickCsv(answers.usage_type, KASKO_USAGE_CSV);
    if (vehicle && usage && isValidKaskoUsageForVehicle(vehicle, usage)) {
      params.set('usage_type', usage);
    }
    const coverage = pickCsv(answers.coverage_level, KASKO_COVERAGE_CSV);
    const usageForCoverage = usage && isValidKaskoUsageForVehicle(vehicle, usage) ? usage : null;
    if (vehicle && usageForCoverage && coverage &&
      isValidKaskoCoverageForVehicleUsage(vehicle, usageForCoverage, coverage)) {
      params.set('coverage', coverage);
    }
    const risk = pickCsv(answers.risk_perception, KASKO_TRI_LEVEL_CSV);
    if (vehicle && risk && isValidKaskoRiskForVehicle(vehicle, risk)) {
      params.set('risk', risk);
    }
    const budgetLevel = pickCsv(answers.budget_level, KASKO_TRI_LEVEL_CSV);
    if (vehicle && budgetLevel && isValidKaskoBudgetForVehicle(vehicle, budgetLevel)) {
      params.set('budget_level', budgetLevel);
    }
    return `/kasko/${params.toString() ? `?${params}` : ''}`;
  }
  return '/';
}
