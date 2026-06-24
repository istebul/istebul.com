/**
 * Dikey sihirbaz query bootstrap — budget dışı runtime import yolu.
 */
import { normalizeAutoBody, normalizeAutoUsage, normalizeTatilGoal } from './assistant-category-bridge.js';
import { normalizeIntentCity } from './assistant-intent-schema.js';

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

const TATIL_VALID_GOALS = new Set(['deniz', 'balayi', 'kultur', 'doga', 'luks-resort']);
const AUTO_WIZARD_BUDGET_PRESETS = Object.freeze(['500000', '900000', '1500000', '2500000']);
const AUTO_WIZARD_USAGE = new Set(['family', 'city', 'long', 'business']);
const AUTO_WIZARD_BODY = new Set(['suv', 'sedan', 'hatchback']);
const AUTO_WIZARD_FUEL = new Set(['any', 'hybrid', 'electric', 'gasoline', 'diesel']);
const AUTO_WIZARD_HOUSEHOLD_SIZE = new Set(['1', '2', '3-4', '5+']);
const AUTO_WIZARD_LOCATION_PRESETS = Object.freeze(['İzmir', 'İstanbul', 'Ankara', 'Antalya']);
const FINANS_TERM_BY_PURPOSE = Object.freeze({
  arac: '12,24,36,48,60',
  konut: '36,48,60',
  tatil: '12,24,36',
  ihtiyac: '12,24,36,48',
  isletme: '12,24,36,48,60'
});
const FINANS_CAPACITY_BY_PURPOSE = Object.freeze({
  arac: new Set(['15k', '25k', '40k', '60k']),
  konut: new Set(['25k', '40k', '60k']),
  tatil: new Set(['15k', '25k', '40k']),
  ihtiyac: new Set(['15k', '25k', '40k', '60k']),
  isletme: new Set(['25k', '40k', '60k'])
});
const FINANS_RATE_SENSITIVITY_BY_PURPOSE = Object.freeze({
  arac: new Set(['dusuk', 'orta', 'yuksek']),
  konut: new Set(['dusuk', 'orta', 'yuksek']),
  tatil: new Set(['orta', 'yuksek']),
  ihtiyac: new Set(['dusuk', 'orta', 'yuksek']),
  isletme: new Set(['orta', 'yuksek'])
});
const SIGORTA_TYPES = new Set(['arac', 'konut', 'saglik', 'seyahat']);
const SIGORTA_LICENSE_YEARS = new Set(['0-2', '3-10', '11plus']);
const SIGORTA_USAGE_TYPES = new Set(['ozel', 'ticari']);
const SIGORTA_PROPERTY_ROLES = new Set(['malik', 'kiraci']);
const SIGORTA_DESTINATION_TYPES = new Set(['yurtici', 'yurtdisi', 'schengen']);
const SIGORTA_TRIP_DURATIONS = new Set(['1-7', '8-15', '16plus']);
const TRI_LEVEL = new Set(['dusuk', 'orta', 'yuksek']);
const KASKO_VEHICLES = new Set(['otomobil', 'suv', 'motosiklet', 'ticari_arac']);
const KASKO_YEARS = new Set(['0-3', '4-10', '11plus']);
const KASKO_USAGE_TYPES = new Set(['ozel', 'ticari']);
const KASKO_COVERAGE = new Set(['mini', 'standard', 'full']);
const KASKO_USAGE_BY_VEHICLE = Object.freeze({
  otomobil: new Set(['ozel', 'ticari']),
  suv: new Set(['ozel']),
  motosiklet: new Set(['ozel']),
  ticari_arac: new Set(['ticari'])
});
const KASKO_COVERAGE_BY_VEHICLE_USAGE = Object.freeze({
  otomobil: { ozel: new Set(['mini', 'standard', 'full']), ticari: new Set(['mini', 'standard', 'full']) },
  suv: { ozel: new Set(['standard', 'full']) },
  motosiklet: { ozel: new Set(['mini', 'standard']) },
  ticari_arac: { ticari: new Set(['standard', 'full']) }
});
const KASKO_RISK_BY_VEHICLE = Object.freeze({
  otomobil: new Set(['dusuk', 'orta', 'yuksek']),
  suv: new Set(['orta', 'yuksek']),
  motosiklet: new Set(['orta', 'yuksek']),
  ticari_arac: new Set(['orta', 'yuksek'])
});
const KASKO_BUDGET_BY_VEHICLE = Object.freeze({
  otomobil: new Set(['dusuk', 'orta', 'yuksek']),
  suv: new Set(['orta', 'yuksek']),
  motosiklet: new Set(['dusuk', 'orta']),
  ticari_arac: new Set(['orta', 'yuksek'])
});

function isValidPositiveInteger(value) {
  const raw = String(value ?? '').trim();
  if (!raw || /-/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(Math.round(n));
}

function pickEnum(value, allowedSet) {
  const v = String(value ?? '').trim();
  return v && allowedSet.has(v) ? v : null;
}

function applyPrefillField(state, field, value, allowedValues = null) {
  if (!state || value == null || value === '') return false;
  if (state[field]) return false;
  if (allowedValues && !allowedValues.has(value)) return false;
  state[field] = value;
  return true;
}

function applyAutoCityFromQuery(state, rawCity = '') {
  if (!state || state.location) return false;

  const city = normalizeIntentCity(rawCity);
  if (!city) return false;

  const matchedPreset = AUTO_WIZARD_LOCATION_PRESETS.find(
    (preset) => preset.toLocaleLowerCase('tr-TR') === city.toLocaleLowerCase('tr-TR')
  );

  if (matchedPreset) {
    state.location = matchedPreset;
    return true;
  }

  state.location = 'custom';
  state.location_custom = city;
  return true;
}

function readAllowedParam(params, keys, allowedSet) {
  for (const key of [].concat(keys)) {
    const v = pickEnum(params.get(key), allowedSet);
    if (v) return v;
  }
  return null;
}

function resolveTatilGoal(raw = '') {
  const normalized = normalizeTatilGoal(raw);
  return TATIL_VALID_GOALS.has(normalized) ? normalized : null;
}

function isValidFinansPurpose(purpose = '') {
  return Object.prototype.hasOwnProperty.call(FINANS_TERM_BY_PURPOSE, String(purpose ?? '').trim());
}

function isValidFinansTermForPurpose(purpose = '', term = '') {
  const terms = FINANS_TERM_BY_PURPOSE[String(purpose ?? '').trim()];
  const t = String(term ?? '').trim();
  return Boolean(terms && t && terms.split(',').includes(t));
}

function isValidFinansCapacityForPurpose(purpose = '', capacity = '') {
  const allowed = FINANS_CAPACITY_BY_PURPOSE[String(purpose ?? '').trim()];
  const value = String(capacity ?? '').trim();
  return Boolean(allowed && value && allowed.has(value));
}

function isValidFinansRateSensitivityForPurpose(purpose = '', rate = '') {
  const allowed = FINANS_RATE_SENSITIVITY_BY_PURPOSE[String(purpose ?? '').trim()];
  const value = String(rate ?? '').trim();
  return Boolean(allowed && value && allowed.has(value));
}

function readFinansCapacityParam(params, purpose = '') {
  for (const key of ['capacity', 'capacity_range']) {
    const raw = String(params.get(key) ?? '').trim();
    if (raw && isValidFinansCapacityForPurpose(purpose, raw)) return raw;
  }
  return null;
}

function readFinansRateSensitivityParam(params, purpose = '') {
  for (const key of ['rate_sensitivity', 'rateSensitivity']) {
    const raw = String(params.get(key) ?? '').trim();
    if (raw && isValidFinansRateSensitivityForPurpose(purpose, raw)) return raw;
  }
  return null;
}

function isValidKaskoUsageForVehicle(vehicle = '', usage = '') {
  const allowed = KASKO_USAGE_BY_VEHICLE[String(vehicle ?? '').trim()];
  const value = String(usage ?? '').trim();
  return Boolean(allowed && value && allowed.has(value));
}

function isValidKaskoCoverageForVehicleUsage(vehicle = '', usage = '', coverage = '') {
  const byUsage = KASKO_COVERAGE_BY_VEHICLE_USAGE[String(vehicle ?? '').trim()];
  const allowed = byUsage?.[String(usage ?? '').trim()];
  const value = String(coverage ?? '').trim();
  return Boolean(allowed && value && allowed.has(value));
}

function isValidKaskoRiskForVehicle(vehicle = '', risk = '') {
  const allowed = KASKO_RISK_BY_VEHICLE[String(vehicle ?? '').trim()];
  const value = String(risk ?? '').trim();
  return Boolean(allowed && value && allowed.has(value));
}

function isValidKaskoBudgetForVehicle(vehicle = '', budgetLevel = '') {
  const allowed = KASKO_BUDGET_BY_VEHICLE[String(vehicle ?? '').trim()];
  const value = String(budgetLevel ?? '').trim();
  return Boolean(allowed && value && allowed.has(value));
}

export function bootstrapAutoFromAssistantQuery(state, params = new URLSearchParams()) {
  if (!state || !params) return state;

  const usageRaw = String(params.get('usage') ?? '').trim();
  if (usageRaw) {
    const normalized = normalizeAutoUsage(usageRaw);
    if (AUTO_WIZARD_USAGE.has(normalized)) applyPrefillField(state, 'usage', normalized);
  }

  const budget = isValidPositiveInteger(params.get('budget'));
  if (budget) {
    const preset = AUTO_WIZARD_BUDGET_PRESETS.find((value) => Number(value) === Number(budget));
    if (preset) {
      applyPrefillField(state, 'budget', preset);
    } else if (!state.budget) {
      state.budget = 'custom';
      state.budget_custom = budget;
    }
  }

  applyPrefillField(state, 'fuel', readAllowedParam(params, 'fuel', AUTO_WIZARD_FUEL));
  const bodyRaw = String(params.get('body') ?? '').trim();
  if (bodyRaw) {
    const body = normalizeAutoBody(bodyRaw);
    if (AUTO_WIZARD_BODY.has(body)) applyPrefillField(state, 'body', body);
  }

  applyPrefillField(
    state,
    'household_size',
    pickEnum(params.get('household_size'), AUTO_WIZARD_HOUSEHOLD_SIZE)
  );
  applyAutoCityFromQuery(state, params.get('city'));

  return state;
}

export function bootstrapTatilFromAssistantQuery(state, params = new URLSearchParams()) {
  if (!state || !params) return state;

  const goal = resolveTatilGoal(params.get('goal'));
  applyPrefillField(state, 'vacation_goal', goal);

  const budget = isValidPositiveInteger(params.get('budget'));
  if (budget && !state.budget_range) {
    state.budget_range = 'manuel';
    state.budget_manual = Number(budget);
    state.budget_total = Number(budget);
  }

  const travelers = String(params.get('travelers') ?? '').trim();
  const travelerProfile =
    travelers && travelers in ASSISTANT_TATIL_TRAVELERS_MAP ?
      ASSISTANT_TATIL_TRAVELERS_MAP[travelers]
    : null;
  if (travelerProfile) {
    applyPrefillField(state, 'people_type', travelerProfile.people_type);
    applyPrefillField(state, 'travelers_count', travelerProfile.travelers_count);
  }

  const priorityKey = String(params.get('priority') ?? '').trim();
  const comfort =
    priorityKey && priorityKey in ASSISTANT_TATIL_PRIORITY_TO_COMFORT ?
      ASSISTANT_TATIL_PRIORITY_TO_COMFORT[priorityKey]
    : null;
  applyPrefillField(state, 'comfort_expectation', comfort);

  return state;
}

export function bootstrapFinansFromAssistantQuery(state, params = new URLSearchParams()) {
  if (!state || !params) return state;

  const purposeKey = String(params.get('purpose') ?? '').trim();
  const purpose = isValidFinansPurpose(purposeKey) ? purposeKey : null;
  applyPrefillField(state, 'purpose', purpose);

  const purposeForTerm = purpose || state.purpose;
  const termRaw = String(params.get('term') ?? '').trim();
  if (purposeForTerm && isValidFinansTermForPurpose(purposeForTerm, termRaw)) {
    applyPrefillField(state, 'term_months', termRaw);
  }

  const amount = isValidPositiveInteger(params.get('amount'));
  if (amount && !state.amount_range) {
    state.amount_range = 'manuel';
    state.amount_manual = Number(amount);
  }

  const purposeForPrefill = purpose || state.purpose;
  const capacityValue = readFinansCapacityParam(params, purposeForPrefill);
  if (capacityValue) applyPrefillField(state, 'capacity_range', capacityValue);

  const rateValue = readFinansRateSensitivityParam(params, purposeForPrefill);
  if (rateValue) applyPrefillField(state, 'rate_sensitivity', rateValue);

  return state;
}

export function bootstrapSigortaFromAssistantQuery(state, params = new URLSearchParams()) {
  if (!state || !params) return state;

  const insuranceTypeFromQuery = readAllowedParam(params, ['type', 'insurance_type'], SIGORTA_TYPES);
  applyPrefillField(state, 'insurance_type', insuranceTypeFromQuery);
  const insuranceTypeFork = state.insurance_type || insuranceTypeFromQuery;

  if (insuranceTypeFork === 'arac') {
    applyPrefillField(state, 'license_years', readAllowedParam(params, 'license_years', SIGORTA_LICENSE_YEARS));
    applyPrefillField(state, 'usage_type', readAllowedParam(params, 'usage_type', SIGORTA_USAGE_TYPES));
  }
  if (insuranceTypeFork === 'konut') {
    applyPrefillField(state, 'property_role', readAllowedParam(params, 'property_role', SIGORTA_PROPERTY_ROLES));
  }
  if (insuranceTypeFork === 'seyahat') {
    applyPrefillField(
      state,
      'destination_type',
      readAllowedParam(params, 'destination_type', SIGORTA_DESTINATION_TYPES)
    );
    applyPrefillField(state, 'trip_duration', readAllowedParam(params, 'trip_duration', SIGORTA_TRIP_DURATIONS));
  }

  applyPrefillField(state, 'risk_perception', readAllowedParam(params, ['risk', 'risk_perception'], TRI_LEVEL));
  applyPrefillField(state, 'budget_level', readAllowedParam(params, 'budget_level', TRI_LEVEL));

  return state;
}

export function bootstrapKaskoFromAssistantQuery(state, params = new URLSearchParams()) {
  if (!state || !params) return state;

  const vehicle = readAllowedParam(params, ['vehicle', 'vehicle_category'], KASKO_VEHICLES);
  applyPrefillField(state, 'vehicle_category', vehicle);
  const vehicleFork = state.vehicle_category || vehicle;

  applyPrefillField(state, 'vehicle_year_band', readAllowedParam(params, ['year', 'vehicle_year_band'], KASKO_YEARS));

  const usageFromQuery = pickEnum(params.get('usage_type'), KASKO_USAGE_TYPES);
  if (usageFromQuery && vehicleFork && isValidKaskoUsageForVehicle(vehicleFork, usageFromQuery)) {
    applyPrefillField(state, 'usage_type', usageFromQuery);
  }
  const usageFork = state.usage_type ||
    (usageFromQuery && vehicleFork && isValidKaskoUsageForVehicle(vehicleFork, usageFromQuery) ? usageFromQuery : null);

  const coverageFromQuery = readAllowedParam(params, ['coverage', 'coverage_level'], KASKO_COVERAGE);
  if (coverageFromQuery && vehicleFork && usageFork &&
    isValidKaskoCoverageForVehicleUsage(vehicleFork, usageFork, coverageFromQuery)) {
    applyPrefillField(state, 'coverage_level', coverageFromQuery);
  }

  const riskFromQuery = readAllowedParam(params, ['risk', 'risk_perception'], TRI_LEVEL);
  if (riskFromQuery && vehicleFork && isValidKaskoRiskForVehicle(vehicleFork, riskFromQuery)) {
    applyPrefillField(state, 'risk_perception', riskFromQuery);
  }

  const budgetFromQuery = readAllowedParam(params, 'budget_level', TRI_LEVEL);
  if (budgetFromQuery && vehicleFork && isValidKaskoBudgetForVehicle(vehicleFork, budgetFromQuery)) {
    applyPrefillField(state, 'budget_level', budgetFromQuery);
  }

  return state;
}
