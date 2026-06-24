/**
 * Karar Asistanı — doğal dil intent çıkarımı (MVP: arac).
 * AI başarısız olursa deterministik fallback; ham metin kalıcı storage'a yazılmaz.
 */

import API from '../../core/api.js';
import {
  ASSISTANT_INTENT_MVP_CATEGORY,
  normalizeAssistantIntent,
  normalizeIntentCity,
  parseBudgetMax,
  deriveAssistantPriorityFromIntent
} from './assistant-intent-schema.js';

export const MIN_INTENT_TEXT_LENGTH = 12;

const AUTO_BODY_PATTERN = /\bsuv\b/i;
const SEDAN_PATTERN = /\bsedan\b/i;
const HATCHBACK_PATTERN = /\bhatchback\b/i;
const FAMILY_PATTERN = /(çocuk|aile|geniş)/i;
const FUEL_ECONOMY_PATTERN = /(az\s*yak|yakıt|hibrit|ekonomik)/i;
const USAGE_CITY_PROFILE_PATTERN =
  /şehir\s+içi|sehir\s+ici|kısa\s+mesafe|kisa\s+mesafe/i;
const CITY_IN_NARRATIVE_PATTERN =
  /\b(İstanbul|Istanbul|Ankara|İzmir|Izmir|Antalya|Konya|Bursa|Adana|Gaziantep|Mersin|Kayseri|Eskişehir|Eskisehir)['']?(?:da|de|ta)\b/i;
const HOUSEHOLD_FIVE_PLUS_PATTERN =
  /(5|altı|6|yedi|8|9|10)\s*kişilik|kalabalık\s+aile|3\s*çocuk|üç\s*çocuk|4\s*çocuk|dört\s*çocuk/i;
const HOUSEHOLD_THREE_FOUR_PATTERN =
  /2\s*çocuk|iki\s*çocuk|4\s*kişilik\s*aile|aile\s*4\s*kişi|3-4\s*kişi/i;
const HOUSEHOLD_ONE_PATTERN = /tek\s*kişi|yalnız\s*yaşıyorum|yalniz\s*yasiyorum/i;
const HOUSEHOLD_TWO_PATTERN = /\bçift\b|2\s*kişi|iki\s*kişi/i;
const MILLION_BUDGET_PATTERN = /(\d+(?:[.,]\d+)?)\s*milyon/i;
const DIGIT_BUDGET_PATTERN = /(\d{1,3}(?:[.\s]\d{3})+|\d{6,})/;

const NON_AUTO_SIGNAL_PATTERNS = [
  /\bkonut\b/i,
  /\bdaire\b/i,
  /\bvilla\b/i,
  /\barsa\b/i,
  /\bkiralık\b/i,
  /\bkira\b/i,
  /satılık\s+ev/i,
  /\btatil\b/i,
  /\botel\b/i,
  /\bresort\b/i,
  /\buçak\b/i,
  /\btur\b/i,
  /\bfinans\b/i,
  /\bkredi\b/i,
  /\bsigorta\b/i,
  /\bkasko\b/i,
  /\bev\b/i
];

const AUTO_SIGNAL_PATTERNS = [
  /\baraba(?:lar|ları|ya)?\b/i,
  /\baraç(?:ları|lar|ı)?\b/i,
  /\botomobil\b/i,
  /\bsuv\b/i,
  /\bsedan\b/i,
  /\bhatchback\b/i,
  /\bhibrit\b/i,
  /\belektrikli\b/i,
  /\bdizel\b/i,
  /\bbenzinli\b/i,
  /\byakıt\b/i,
  /az\s*yaksın/i,
  /\bbakım\b/i,
  /geniş\s+araç/i,
  /araç\s+arıyorum/i,
  /çocuk.*araç/i,
  /araç.*çocuk/i
];

/**
 * @param {string} rawText
 * @returns {boolean}
 */
export function hasNonAutoCategorySignals(rawText = '') {
  const text = String(rawText ?? '');
  return NON_AUTO_SIGNAL_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * @param {string} rawText
 * @returns {boolean}
 */
export function hasAutoCategorySignalsInText(rawText = '') {
  const text = String(rawText ?? '');
  return AUTO_SIGNAL_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * @param {string} rawText
 * @returns {boolean}
 */
export function shouldRejectNonAutoNarrative(rawText = '') {
  const text = String(rawText ?? '');
  return hasNonAutoCategorySignals(text) && !hasAutoCategorySignalsInText(text);
}

/**
 * @param {string} rawText
 * @returns {string|null}
 */
export function deriveCityFromNarrative(rawText = '') {
  const text = String(rawText ?? '');
  if (USAGE_CITY_PROFILE_PATTERN.test(text)) return null;

  const match = text.match(CITY_IN_NARRATIVE_PATTERN);
  if (!match) return null;

  const rawCity = match[1]
    .replace(/Istanbul/i, 'İstanbul')
    .replace(/Izmir/i, 'İzmir')
    .replace(/Eskisehir/i, 'Eskişehir');

  return normalizeIntentCity(rawCity);
}

/**
 * @param {string} rawText
 * @returns {string|null}
 */
export function deriveHouseholdSizeFromNarrative(rawText = '') {
  const text = String(rawText ?? '');
  if (HOUSEHOLD_FIVE_PLUS_PATTERN.test(text)) return '5+';
  if (HOUSEHOLD_THREE_FOUR_PATTERN.test(text)) return '3-4';
  if (HOUSEHOLD_ONE_PATTERN.test(text)) return '1';
  if (HOUSEHOLD_TWO_PATTERN.test(text)) return '2';
  return null;
}

/**
 * @param {string} rawText
 * @returns {number|null}
 */
export function parseBudgetFromNarrative(rawText = '') {
  const text = String(rawText ?? '');
  const million = text.match(MILLION_BUDGET_PATTERN);
  if (million) {
    const base = Number(String(million[1]).replace(',', '.'));
    if (Number.isFinite(base) && base > 0) {
      return Math.round(base * 1_000_000);
    }
  }

  const digits = text.match(DIGIT_BUDGET_PATTERN);
  if (digits) {
    return parseBudgetMax(digits[1]);
  }

  return parseBudgetMax(text);
}

/**
 * @param {string} rawText
 * @returns {Record<string, unknown>|null}
 */
export function buildDeterministicAutoIntentFromText(rawText = '') {
  const text = String(rawText ?? '').trim();
  if (text.length < MIN_INTENT_TEXT_LENGTH) return null;
  if (shouldRejectNonAutoNarrative(text)) return null;

  /** @type {Record<string, unknown>} */
  const raw = {
    categoryId: ASSISTANT_INTENT_MVP_CATEGORY
  };

  const budgetMax = parseBudgetFromNarrative(text);
  if (budgetMax) raw.budgetMax = budgetMax;

  if (AUTO_BODY_PATTERN.test(text)) raw.body = 'suv';
  else if (SEDAN_PATTERN.test(text)) raw.body = 'sedan';
  else if (HATCHBACK_PATTERN.test(text)) raw.body = 'hatchback';

  if (USAGE_CITY_PROFILE_PATTERN.test(text)) raw.usagePurpose = 'city';
  else if (FAMILY_PATTERN.test(text)) raw.usagePurpose = 'family';

  if (FUEL_ECONOMY_PATTERN.test(text)) raw.fuel = 'hybrid';

  const city = deriveCityFromNarrative(text);
  if (city) raw.city = city;

  const householdSize = deriveHouseholdSizeFromNarrative(text);
  if (householdSize) raw.householdSize = householdSize;

  const priority = deriveAssistantPriorityFromIntent([text], null);
  if (priority) raw.priority = priority;

  const normalized = normalizeAssistantIntent(raw);
  if (!normalized) return null;
  if (!hasMeaningfulAutoSignals(normalized)) return null;

  return normalized;
}

/**
 * @param {import('./assistant-intent-schema.js').NormalizedAssistantIntent} intent
 * @returns {boolean}
 */
export function hasMeaningfulAutoSignals(intent) {
  if (!intent) return false;
  return Boolean(
    intent.usage ||
      intent.fuel ||
      intent.body ||
      intent.priority ||
      intent.householdSize ||
      intent.mustHaves.length ||
      intent.dealBreakers.length
  );
}

/**
 * @param {unknown} rawText
 * @returns {string|null}
 */
function parseAiJsonObject(rawText = '') {
  try {
    const cleaned = String(rawText || '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;

    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function buildIntentExtractionPrompt(text) {
  return `Türkiye'de araç satın alma kararı için kullanıcı niyetini JSON olarak çıkar.
Yalnızca geçerli JSON döndür; açıklama ekleme.

Kurallar:
- categoryId her zaman "arac" olmalı (bu MVP yalnızca araç).
- budgetMax: pozitif tam sayı TL (ör. 3000000).
- usagePurpose: family | city | long | business
- fuel: hybrid | electric | gasoline | diesel | any
- body: suv | sedan | hatchback
- city veya province: Türkiye il/şehir adı (ör. Konya) — "şehir içi" kullanım profili değil
- householdSize: "1" | "2" | "3-4" | "5+"
- priorities: string dizisi (maliyet/bakım/yakıt ifadeleri lowCost sinyali taşır)
- mustHaves, dealBreakers, missingQuestions: string dizileri
- Bilinmeyen alanları null veya boş dizi olarak bırak.

Kullanıcı metni:
"""
${text}
"""`;
}

/**
 * @param {string} text
 * @param {{ askAI?: (prompt: string, context?: Record<string, unknown>) => Promise<{ result?: string }> }} [options]
 * @returns {Promise<import('./assistant-intent-schema.js').NormalizedAssistantIntent|null>}
 */
export async function extractAssistantIntentFromText(text, options = {}) {
  const narrative = String(text ?? '').trim();
  if (narrative.length < MIN_INTENT_TEXT_LENGTH) return null;
  if (shouldRejectNonAutoNarrative(narrative)) return null;

  const askAI = options.askAI ?? ((prompt, context) => API.askAI(prompt, context));

  try {
    const aiResponse = await askAI(buildIntentExtractionPrompt(narrative), {
      type: 'assistant_intent_extract',
      category: ASSISTANT_INTENT_MVP_CATEGORY
    });

    const rawAiText = aiResponse?.result ?? aiResponse?.response ?? '';
    const parsed = parseAiJsonObject(rawAiText);
    const normalized = normalizeAssistantIntent(parsed);
    if (normalized && hasMeaningfulAutoSignals(normalized) && !shouldRejectNonAutoNarrative(narrative)) {
      return normalized;
    }
  } catch {
    // deterministic fallback below
  }

  return buildDeterministicAutoIntentFromText(narrative);
}
