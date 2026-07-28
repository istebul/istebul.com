import type { DocumentClassification } from '../models/DocumentClassification';
import type { NormalizedDocument } from '../models/NormalizedDocument';

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export class BusinessHealthScorer {
  score(
    document: NormalizedDocument,
    classification: DocumentClassification
  ): number {
    const tableCount = document.tables.length;
    const rowCount = document.tables.reduce(
      (sum, table) => sum + table.rowCount,
      0
    );
    const columnCount = document.tables.reduce(
      (sum, table) => sum + table.columns.length,
      0
    );
    const warningPenalty = document.warnings.length * 8;

    const classifiedBonus =
      classification.category === 'unknown'
        ? 0
        : Math.round(classification.confidence * 20);

    const structureScore =
      Math.min(tableCount * 8, 16) +
      Math.min(rowCount, 30) +
      Math.min(columnCount * 2, 20);

    return clampScore(
      30 +
        structureScore +
        classifiedBonus -
        warningPenalty
    );
  }
}
