/**
 * Sanitize wizard/API values before showing in Turkish user-facing copy.
 */

const TECHNICAL_VALUES = new Set([
  'any',
  'all',
  'undefined',
  'null',
  'none',
  'n/a',
  'na'
]);

/**
 * @param {unknown} value
 */
export function isTechnicalPreferenceValue(value) {
  const s = String(value ?? '').trim().toLowerCase();
  return !s || TECHNICAL_VALUES.has(s);
}

const PREFERENCE_FALLBACKS = {
  fuel: 'Araç tercihiniz',
  body: 'Araç tercihiniz',
  usage: 'Kullanım profiliniz',
  profile: 'Profiliniz',
  generic: 'Seçimleriniz'
};

/**
 * @param {unknown} value
 * @param {'fuel'|'body'|'usage'|'profile'|'generic'} [kind]
 */
export function preferencePhrase(value, kind = 'generic') {
  if (isTechnicalPreferenceValue(value)) {
    return PREFERENCE_FALLBACKS[kind] || PREFERENCE_FALLBACKS.generic;
  }
  return '';
}

/**
 * Strip leaked technical tokens from finalized narrative text.
 * @param {string} text
 */
export function stripTechnicalTokensFromCopy(text) {
  let out = String(text || '');
  const replacements = [
    [/\bany tercihiniz\b/gi, 'Seçimleriniz'],
    [/\bundefined tercihiniz\b/gi, 'Seçimleriniz'],
    [/\bnull tercihiniz\b/gi, 'Seçimleriniz'],
    [/\bany,\s*/gi, 'Seçimleriniz, '],
    [/\bundefined,\s*/gi, ''],
    [/\bnull,\s*/gi, '']
  ];
  for (const [re, rep] of replacements) {
    out = out.replace(re, rep);
  }
  return out.replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').trim();
}
