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
import { logBuilderStage, logBuilderError } from './debug-log.js';

/**
 * @param {unknown} rawInput
 */
export function runAiListingBuilder(rawInput) {
  const input = String(rawInput ?? '').trim();
  logBuilderStage('runAiListingBuilder:start', { input_length: input.length });

  if (!input) {
    logBuilderStage('runAiListingBuilder:empty-input');
    return { ok: false, input_type: 'text', message: 'İlan içeriği boş. Lütfen metin yapıştırın.' };
  }

  try {
    const input_type = detectInputType(input);

    /** @type {string[]} */
    const warnings = [];
    /** @type {Record<string, { value: unknown, confidence: number }>} */
    let fields = {};

    if (input_type === 'url') {
      const parsed = parseUrlInput(input);
      if (!parsed.ok) {
        logBuilderStage('runAiListingBuilder:parse-failed', { input_type, message: parsed.message });
        return { ok: false, input_type, message: parsed.message };
      }
      fields = recordToFieldMap(parsed.record);
      fields.source_url = { value: parsed.record.source_url, confidence: parsed.confidence };
    } else if (input_type === 'json') {
      const parsed = parseJsonInput(input);
      if (!parsed.ok) {
        logBuilderStage('runAiListingBuilder:parse-failed', { input_type, message: parsed.message });
        return { ok: false, input_type, message: parsed.message };
      }
      fields = recordToFieldMap(parsed.record);
    } else if (input_type === 'csv') {
      const parsed = parseCsvInput(input);
      if (!parsed.ok) {
        logBuilderStage('runAiListingBuilder:parse-failed', { input_type, message: parsed.message });
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

    const preview_html = buildPreviewHtml(canonical);
    const result = {
      ok: true,
      input_type,
      canonical,
      preview_html,
      preview_json: buildPreviewJson(canonical),
      create_payload: toCreateListingPayload(canonical)
    };

    logBuilderStage('runAiListingBuilder:resolved', {
      input_type,
      title: canonical.title,
      preview_html_length: preview_html.length,
      missing_fields: canonical.missing_fields
    });

    return result;
  } catch (error) {
    logBuilderError('runAiListingBuilder:exception', error);
    return {
      ok: false,
      input_type: 'text',
      message: 'Önizleme oluşturulamadı. Girdi formatını kontrol edin.'
    };
  }
}

export { detectInputType } from './input-detector.js';
export { parseTextInput, parsePriceValue, parseKmValue, parseYearValue, parseFuelValue, parseTransmissionValue } from './text-parser.js';
export { parseJsonInput } from './json-parser.js';
export { parseCsvInput } from './csv-parser.js';
export { parseUrlInput, isSafeBuilderUrl } from './url-parser.js';
export { buildCanonicalListing, toCreateListingPayload } from './canonical-builder.js';
export { enrichListing } from './enrichment-engine.js';
export { buildPreviewHtml, buildPreviewJson } from './preview-builder.js';
export { logBuilderStage, logBuilderError } from './debug-log.js';
