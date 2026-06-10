/**
 * Dikey sihirbaz query bootstrap — budget dışı runtime import yolu.
 */
import { normalizeAutoBody, normalizeAutoUsage, normalizeTatilGoal } from './assistant-category-bridge.js';

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
const TRI_LEVEL = new Set(['dusuk', 'orta', 'yuksek']);
const KASKO_VEHICLES = new Set(['otomobil', 'suv', 'motosiklet', 'ticari_arac']);
const KASKO_YEARS = new Set(['0-3', '4-10', '11plus']);
const KASKO_COVERAGE = new Set(['mini', 'standard', 'full']);

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

  applyPrefillField(state, 'insurance_type', readAllowedParam(params, ['type', 'insurance_type'], SIGORTA_TYPES));
  applyPrefillField(state, 'risk_perception', readAllowedParam(params, ['risk', 'risk_perception'], TRI_LEVEL));
  applyPrefillField(state, 'budget_level', readAllowedParam(params, 'budget_level', TRI_LEVEL));

  return state;
}

export function bootstrapKaskoFromAssistantQuery(state, params = new URLSearchParams()) {
  if (!state || !params) return state;

  applyPrefillField(state, 'vehicle_category', readAllowedParam(params, ['vehicle', 'vehicle_category'], KASKO_VEHICLES));
  applyPrefillField(state, 'vehicle_year_band', readAllowedParam(params, ['year', 'vehicle_year_band'], KASKO_YEARS));
  applyPrefillField(state, 'coverage_level', readAllowedParam(params, ['coverage', 'coverage_level'], KASKO_COVERAGE));

  return state;
}
