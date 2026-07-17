/**
 * Built-in schema shape detectors — tabular dilim üretir (PR-101D).
 */

import { isPlainObject } from '../helpers';
import type { SchemaContext } from '../SchemaContext';
import type { SchemaDetector, TabularSlice } from './types';

function freezeSlice(slice: TabularSlice): TabularSlice {
  return {
    columnNames: Object.freeze([...slice.columnNames]),
    columnValues: Object.freeze(
      slice.columnValues.map((col) => Object.freeze([...col]))
    ),
    rowCount: slice.rowCount,
    sourceShape: slice.sourceShape
  };
}

function fromObjectRows(rows: readonly Record<string, unknown>[]): TabularSlice {
  const keySet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      keySet.add(key);
    }
  }
  const columnNames = [...keySet];
  const columnValues = columnNames.map((name) =>
    rows.map((row) => row[name])
  );
  return freezeSlice({
    columnNames,
    columnValues,
    rowCount: rows.length,
    sourceShape: 'object-rows'
  });
}

export const objectRowsSchemaDetector: SchemaDetector = {
  id: 'object-rows-schema-detector',
  name: 'Nesne satırları',
  description: 'Düz nesne dizisinden kolonları çıkarır.',
  detect(context: SchemaContext): TabularSlice | null {
    const input = context.input;
    if (!Array.isArray(input) || input.length === 0) {
      return null;
    }
    if (!input.every((row) => isPlainObject(row))) {
      return null;
    }
    return fromObjectRows(input as Record<string, unknown>[]);
  }
};

export const columnsRowsSchemaDetector: SchemaDetector = {
  id: 'columns-rows-schema-detector',
  name: 'columns/rows şekli',
  description: '{ columns, rows } yapısını dilimler.',
  detect(context: SchemaContext): TabularSlice | null {
    if (!isPlainObject(context.input)) {
      return null;
    }
    const columns = context.input.columns;
    const rows = context.input.rows;
    if (!Array.isArray(columns) || !Array.isArray(rows)) {
      return null;
    }
    if (!columns.every((c) => typeof c === 'string')) {
      return null;
    }
    const columnNames = columns as string[];
    const columnValues = columnNames.map((name, index) =>
      rows.map((row) => {
        if (Array.isArray(row)) {
          return row[index];
        }
        if (isPlainObject(row)) {
          return row[name];
        }
        return undefined;
      })
    );
    return freezeSlice({
      columnNames,
      columnValues,
      rowCount: rows.length,
      sourceShape: 'columns-rows'
    });
  }
};

export const headerMatrixSchemaDetector: SchemaDetector = {
  id: 'header-matrix-schema-detector',
  name: 'headers/records matrisi',
  description: '{ headers, records|rows } matrisini dilimler.',
  detect(context: SchemaContext): TabularSlice | null {
    if (!isPlainObject(context.input)) {
      return null;
    }
    const headers = context.input.headers;
    const records = context.input.records ?? context.input.rows;
    if (!Array.isArray(headers) || !Array.isArray(records)) {
      return null;
    }
    if (!headers.every((h) => typeof h === 'string')) {
      return null;
    }
    if (!records.every((r) => Array.isArray(r))) {
      return null;
    }
    const columnNames = headers as string[];
    const matrix = records as unknown[][];
    const columnValues = columnNames.map((_, index) =>
      matrix.map((row) => row[index])
    );
    return freezeSlice({
      columnNames,
      columnValues,
      rowCount: matrix.length,
      sourceShape: 'header-matrix'
    });
  }
};

export const BUILTIN_SCHEMA_DETECTORS: readonly SchemaDetector[] = Object.freeze([
  objectRowsSchemaDetector,
  columnsRowsSchemaDetector,
  headerMatrixSchemaDetector
]);
