/**
 * Konut dikey sihirbaz — karar asistanı query ön doldurma (konut runtime; SPA budget dışı).
 */
import { TURKEY_CITIES } from './turkey-cities.js';
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

const KONUT_VALID_CITIES = new Set(TURKEY_CITIES);
const KONUT_VALID_PURPOSE_KEYS = new Set(Object.keys(KONUT_ASSISTANT_PURPOSE_TO_LABEL));
const KONUT_VALID_PROPERTY_KEYS = new Set(Object.keys(KONUT_ASSISTANT_PROPERTY_TO_HOME_TYPE));
const KONUT_PURCHASE_PURPOSE_LABELS = new Set(Object.values(KONUT_ASSISTANT_PURPOSE_TO_LABEL));
const KONUT_HOME_TYPE_LABELS = new Set(Object.values(KONUT_ASSISTANT_PROPERTY_TO_HOME_TYPE));

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

function normalizeKonutDistrict(district = '') {
  const value = String(district || '').trim().slice(0, 60);
  return value || null;
}

function normalizeKonutBudget(budget) {
  const n = Number(String(budget ?? '').replace(/\D/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return String(Math.round(n));
}

function applyKonutPrefillField(state, field, value, allowedValues = null) {
  if (!state || value == null || value === '') return false;
  if (state[field]) return false;
  if (allowedValues && !allowedValues.has(value)) return false;
  state[field] = value;
  return true;
}

function isValidKonutCity(city = '') {
  const name = String(city || '').trim();
  return Boolean(name) && KONUT_VALID_CITIES.has(name);
}

/** Konut dikey sihirbaz — karar asistanı query profili. */
export function bootstrapKonutFromAssistantQuery(state, params = new URLSearchParams()) {
  if (!state || !params) return state;

  let applied = false;

  const budget = normalizeKonutBudget(params.get('budget'));
  if (applyKonutPrefillField(state, 'totalBudget', budget)) applied = true;

  const province = params.get('province') || params.get('city');
  if (isValidKonutCity(province) && applyKonutPrefillField(state, 'city', String(province).trim(), KONUT_VALID_CITIES)) {
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
