/**
 * AI Listings Search — query intelligence layer (Sprint-16 v2, client).
 * Synonym expansion, typo correction, and multi-token analysis.
 */

import { tokenize } from './tokenizer.js';
import { resolveSynonym, resolvePhraseSynonym } from './synonym-engine.js';
import { correctQueryTypos } from './typo-engine.js';
import { parseSearchQuery } from './query-parser.js';
import { normalizeText } from './normalizer.js';

/**
 * @param {string[]} tokens
 * @returns {{ expanded: string[], phrases: string[] }}
 */
export function expandQueryTokens(tokens) {
  /** @type {string[]} */
  const expanded = [];
  /** @type {string[]} */
  const phrases = [];
  const consumed = new Set();

  for (let i = 0; i < tokens.length; i++) {
    if (consumed.has(i)) continue;

    const phrase = `${tokens[i]} ${tokens[i + 1] ?? ''}`.trim();
    const phraseSyn = resolvePhraseSynonym(phrase);
    if (phraseSyn && tokens[i + 1]) {
      phrases.push(phraseSyn);
      expanded.push(phraseSyn);
      consumed.add(i);
      consumed.add(i + 1);
      i += 1;
      continue;
    }

    const syn = resolveSynonym(tokens[i]);
    expanded.push(syn);
    if (syn !== tokens[i]) {
      phrases.push(syn);
    }
  }

  return { expanded, phrases };
}

/**
 * @param {string} query
 * @param {{ knownBrands?: Set<string>, knownModels?: Set<string>, vocabulary?: Iterable<string> }} [options]
 * @returns {{
 *   raw: string,
 *   corrected_query: string,
 *   expanded_tokens: string[],
 *   corrections: Array<{ from: string, to: string }>,
 *   parsed: ReturnType<typeof parseSearchQuery>
 * }}
 */
export function analyzeQuery(query, options = {}) {
  const raw = String(query ?? '').trim();
  const tokens = tokenize(raw);

  const vocabulary = options.vocabulary ?? new Set([...(options.knownBrands ?? []), ...(options.knownModels ?? [])]);
  const { tokens: typoCorrected, corrections } = correctQueryTypos(tokens, vocabulary);
  const corrected_query = typoCorrected.join(' ');

  const { expanded } = expandQueryTokens(typoCorrected);
  const parsed = parseSearchQuery(corrected_query || raw, {
    knownBrands: options.knownBrands,
    knownModels: options.knownModels
  });

  return {
    raw,
    corrected_query: corrected_query || raw,
    expanded_tokens: expanded,
    corrections,
    parsed
  };
}

/**
 * @param {import('./query-parser.js').ParsedSearchQuery} parsed
 * @returns {string[]}
 */
export function extractQueryIntents(parsed) {
  /** @type {string[]} */
  const intents = [];

  if (parsed.brand) intents.push(`brand:${normalizeText(parsed.brand)}`);
  if (parsed.model) intents.push(`model:${normalizeText(parsed.model)}`);
  if (parsed.year) intents.push(`year:${parsed.year}`);
  if (parsed.fuel) intents.push(`fuel:${parsed.fuel}`);
  if (parsed.transmission) intents.push(`transmission:${parsed.transmission}`);
  for (const attr of parsed.attributes) intents.push(`attr:${attr}`);

  return intents;
}
