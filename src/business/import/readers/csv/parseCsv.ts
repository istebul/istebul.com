/**
 * Bağımsız CSV satır ayrıştırıcı — yeni dependency yok (PR-101E).
 *
 * RFC 4180 benzeri: çift tırnak, "" kaçışı, , / ; ayırıcı.
 */

import type { CsvDelimiter } from './CsvReaderContext';

/**
 * Tek satırı alanlara böler (quoted value desteği).
 */
export function splitCsvLine(
  line: string,
  delimiter: CsvDelimiter
): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      current += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      fields.push(current);
      current = '';
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  fields.push(current);
  return fields;
}

/**
 * İlk anlamlı satırda `,` vs `;` sayarak ayırıcı seçer (tırnak dışı).
 */
export function detectDelimiter(content: string): CsvDelimiter {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }
    let commas = 0;
    let semis = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]!;
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          i += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (inQuotes) {
        continue;
      }
      if (ch === ',') {
        commas += 1;
      } else if (ch === ';') {
        semis += 1;
      }
    }
    if (semis > commas) {
      return ';';
    }
    return ',';
  }
  return ',';
}

/**
 * UTF-8 byte uzunluğu (Buffer varsa onu kullanır).
 */
export function utf8ByteLength(text: string): number {
  if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') {
    return Buffer.byteLength(text, 'utf8');
  }
  return new TextEncoder().encode(text).length;
}

/**
 * BOM temizliği.
 */
export function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

/**
 * Fiziksel satırlara böler — quoted alan içindeki satır sonlarını birleştirir.
 */
export function splitPhysicalRecords(content: string): string[] {
  const records: string[] = [];
  let current = '';
  let inQuotes = false;
  const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (ch === '"') {
      current += ch;
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === '\n' && !inQuotes) {
      records.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.length > 0 || text.endsWith('\n')) {
    // trailing newline → empty record already pushed; leftover content
    if (current.length > 0) {
      records.push(current);
    }
  }
  return records;
}
