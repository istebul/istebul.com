import type {
  ParsedDocument,
  ParsedDocumentTable
} from '../models/ParsedDocument';
import type {
  NormalizedCellValue,
  NormalizedDocument,
  NormalizedDocumentColumn,
  NormalizedDocumentTable
} from '../models/NormalizedDocument';

const TURKISH_CURRENCY_PATTERN =
  /^\s*(?:₺|TL|TRY)?\s*-?\d{1,3}(?:\.\d{3})*(?:,\d+)?\s*(?:₺|TL|TRY)?\s*$/i;

const INTERNATIONAL_NUMBER_PATTERN =
  /^\s*-?\d+(?:[.,]\d+)?\s*$/;

const PERCENTAGE_PATTERN =
  /^\s*-?\d+(?:[.,]\d+)?\s*%\s*$/;

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}(?:T.*)?$/,
  /^\d{2}[./-]\d{2}[./-]\d{4}$/
];

function normalizeKey(label: string, index: number): string {
  const normalized = label
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || `kolon_${index + 1}`;
}

function parseNumericText(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) return null;

  if (PERCENTAGE_PATTERN.test(trimmed)) {
    const numeric = trimmed
      .replace('%', '')
      .replace(/\./g, '')
      .replace(',', '.');

    const parsed = Number(numeric);

    return Number.isFinite(parsed) ? parsed : null;
  }

  if (TURKISH_CURRENCY_PATTERN.test(trimmed)) {
    const numeric = trimmed
      .replace(/₺|TL|TRY/gi, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim();

    const parsed = Number(numeric);

    return Number.isFinite(parsed) ? parsed : null;
  }

  if (INTERNATIONAL_NUMBER_PATTERN.test(trimmed)) {
    const normalized =
      trimmed.includes(',') && !trimmed.includes('.')
        ? trimmed.replace(',', '.')
        : trimmed.replace(/,/g, '');

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeValue(
  value: string | number | boolean | null
): NormalizedCellValue {
  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) return null;

  const lowered = trimmed.toLocaleLowerCase('tr-TR');

  if (['evet', 'true', 'doğru'].includes(lowered)) return true;
  if (['hayır', 'false', 'yanlış'].includes(lowered)) return false;

  const numeric = parseNumericText(trimmed);

  return numeric ?? trimmed;
}

function detectColumnType(
  originalValues: Array<string | number | boolean | null>,
  normalizedValues: NormalizedCellValue[]
): NormalizedDocumentColumn['detectedType'] {
  const nonNullOriginals = originalValues.filter(
    (value): value is string | number | boolean => value !== null
  );

  if (nonNullOriginals.length === 0) return 'unknown';

  if (
    nonNullOriginals.every((value) => typeof value === 'boolean')
  ) {
    return 'boolean';
  }

  const stringValues = nonNullOriginals.map(String);

  if (
    stringValues.every((value) =>
      PERCENTAGE_PATTERN.test(value.trim())
    )
  ) {
    return 'percentage';
  }

  if (
    stringValues.every((value) =>
      TURKISH_CURRENCY_PATTERN.test(value.trim())
    )
  ) {
    return 'currency';
  }

  if (
    stringValues.every((value) =>
      DATE_PATTERNS.some((pattern) => pattern.test(value.trim()))
    )
  ) {
    return 'date';
  }

  const nonNullNormalized = normalizedValues.filter(
    (value): value is Exclude<NormalizedCellValue, null> =>
      value !== null
  );

  if (
    nonNullNormalized.length > 0 &&
    nonNullNormalized.every((value) => typeof value === 'number')
  ) {
    return 'number';
  }

  if (
    nonNullNormalized.length > 0 &&
    nonNullNormalized.every((value) => typeof value === 'boolean')
  ) {
    return 'boolean';
  }

  return 'text';
}

function normalizeTable(
  table: ParsedDocumentTable
): NormalizedDocumentTable {
  const usedKeys = new Map<string, number>();

  const columnMappings = table.columns.map((label, index) => {
    const baseKey = normalizeKey(label, index);
    const occurrence = usedKeys.get(baseKey) ?? 0;

    usedKeys.set(baseKey, occurrence + 1);

    return {
      sourceLabel: label,
      key:
        occurrence === 0
          ? baseKey
          : `${baseKey}_${occurrence + 1}`
    };
  });

  const rows = table.rows.map((row) =>
    Object.fromEntries(
      columnMappings.map(({ sourceLabel, key }) => [
        key,
        normalizeValue(row[sourceLabel] ?? null)
      ])
    )
  );

  const columns: NormalizedDocumentColumn[] =
    columnMappings.map(({ sourceLabel, key }) => {
      const originalValues = table.rows.map(
        (row) => row[sourceLabel] ?? null
      );

      const normalizedValues = rows.map(
        (row) => row[key] ?? null
      );

      return {
        key,
        label: sourceLabel,
        detectedType: detectColumnType(
          originalValues,
          normalizedValues
        ),
        nullCount: normalizedValues.filter(
          (value) => value === null
        ).length,
        sampleValues: normalizedValues
          .filter((value) => value !== null)
          .slice(0, 5)
      };
    });

  return {
    name: table.name,
    columns,
    rows,
    rowCount: rows.length
  };
}

export class DatasetNormalizer {
  normalize(parsedDocument: ParsedDocument): NormalizedDocument {
    return {
      documentId: parsedDocument.documentId,
      title: parsedDocument.title.trim(),
      plainText: parsedDocument.plainText.trim(),
      tables: parsedDocument.tables.map(normalizeTable),
      warnings: [...parsedDocument.warnings],
      normalizedAt: new Date().toISOString()
    };
  }
}
