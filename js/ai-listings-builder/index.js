/**
 * AI Auto Listing Builder — orchestrator.
 */

import { detectInputType } from './input-detector.js';
import { parseTextInput } from './text-parser.js';
import { parseJsonInput } from './json-parser.js';
import { parseCsvInput } from './csv-parser.js';
import { parseUrlInput } from './url-parser.js';
import {
  buildCanonicalListing,
  recordToFieldMap,
  toCreateListingPayload
} from './canonical-builder.js';
import { enrichListing } from './enrichment-engine.js';
import { buildPreviewHtml, buildPreviewJson } from './preview-builder.js';

/**
 * @param {unknown} rawInput
 */
export function runAiListingBuilder(rawInput) {
  const input = String(rawInput ?? '').trim();
  const input_type = detectInputType(input);

  /** @type {string[]} */
  const warnings = [];
  /** @type {Record<string, { value: unknown, confidence: number }>} */
  let fields = {};

  if (input_type === 'url') {
    const parsed = parseUrlInput(input);
    if (!parsed.ok) {
      return { ok: false, input_type, message: parsed.message };
    }
    fields = recordToFieldMap(parsed.record);
    fields.source_url = { value: parsed.record.source_url, confidence: parsed.confidence };
  } else if (input_type === 'json') {
    const parsed = parseJsonInput(input);
    if (!parsed.ok) {
      return { ok: false, input_type, message: parsed.message };
    }
    fields = recordToFieldMap(parsed.record);
  } else if (input_type === 'csv') {
    const parsed = parseCsvInput(input);
    if (!parsed.ok) {
      return { ok: false, input_type, message: parsed.message };
    }
    fields = recordToFieldMap(parsed.record);
  } else {
    const parsed = parseTextInput(input);
    fields = parsed.fields;
  }

  if (!fields.title?.value && input_type === 'url') {
    warnings.push('URL girişinde başlık bulunamadı; kaydetmeden önce kontrol edin.');
  }

  const canonical = enrichListing(
    buildCanonicalListing({
      fields,
      input_type,
      warnings
    })
  );

  return {
    ok: true,
    input_type,
    canonical,
    preview_html: buildPreviewHtml(canonical),
    preview_json: buildPreviewJson(canonical),
    create_payload: toCreateListingPayload(canonical)
  };
}

export { detectInputType } from './input-detector.js';
export { parseTextInput, parsePriceValue, parseKmValue, parseYearValue, parseFuelValue, parseTransmissionValue } from './text-parser.js';
export { parseJsonInput } from './json-parser.js';
export { parseCsvInput } from './csv-parser.js';
export { parseUrlInput, isSafeBuilderUrl } from './url-parser.js';
export { buildCanonicalListing, toCreateListingPayload } from './canonical-builder.js';
export { enrichListing } from './enrichment-engine.js';
export { buildPreviewHtml, buildPreviewJson } from './preview-builder.js';
