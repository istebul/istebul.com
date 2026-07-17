/**
 * Column / Entity / Schema detector contracts — PR-101D.
 */

import type { DetectedColumn, CandidateField } from '../DetectedColumn';
import type { DetectedEntity } from '../DetectedEntity';
import type { SchemaCandidate } from '../SchemaCandidate';
import type { SchemaContext } from '../SchemaContext';

/**
 * Ham tablo dilimi — kolon adları + satır değerleri.
 */
export interface TabularSlice {
  columnNames: readonly string[];
  /** Her kolon için değer dizisi (satır sırası korunur) */
  columnValues: readonly (readonly unknown[])[];
  rowCount: number;
  sourceShape: SchemaCandidate['sourceShape'];
}

export interface ColumnDetector {
  id: string;
  name: string;
  description: string;
  /**
   * Kolon adı + değerlerden DetectedColumn üretir.
   * Uygun değilse null.
   */
  detect(
    columnName: string,
    index: number,
    values: readonly unknown[],
    context: SchemaContext
  ): DetectedColumn | null;
}

export interface EntityDetector {
  id: string;
  name: string;
  description: string;
  detect(
    columns: readonly DetectedColumn[],
    context: SchemaContext
  ): readonly DetectedEntity[];
}

export interface SchemaDetector {
  id: string;
  name: string;
  description: string;
  /**
   * Girdiyi tabular dilime çevirir — veri dönüştürmez.
   */
  detect(context: SchemaContext): TabularSlice | null;
}

export type { CandidateField };
