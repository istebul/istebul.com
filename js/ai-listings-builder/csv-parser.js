/**
 * AI Auto Listing Builder — CSV parser.
 */

import { parseCsvLine } from '../../supabase/functions/_shared/ai-listings/import-parser.js';

/**
 * @param {unknown} rawInput
 * @returns {{ ok: true, record: Record<string, unknown>, confidence: number } | { ok: false, message: string }}
 */
export function parseCsvInput(rawInput) {
  const raw = String(rawInput ?? '').trim();
  if (!raw) {
    return { ok: false, message: 'CSV içeriği boş.' };
  }

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { ok: false, message: 'CSV en az bir başlık ve bir veri satırı içermelidir.' };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const values = parseCsvLine(lines[1]);

  /** @type {Record<string, unknown>} */
  const record = {};
  headers.forEach((header, index) => {
    const value = values[index] ?? '';
    if (value !== '') record[header] = value;
  });

  if (!Object.keys(record).length) {
    return { ok: false, message: 'CSV satırından alan çıkarılamadı.' };
  }

  return { ok: true, record, confidence: 0.9 };
}
