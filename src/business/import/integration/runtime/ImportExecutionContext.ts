/**
 * İSTEBUL Business Import Engine — ImportExecutionContext (PR-101J).
 */

import type { BusinessEntityTypeId } from '../../../dataset/entities/BusinessEntityType';
import type { PipelineBag } from '../../pipeline/runtime/PipelineContext';
import type { ImportContext } from '../../types/ImportContext';
import type { ImportRequest } from '../../types/ImportRequest';
import type { ExcelRawWorkbook } from '../../readers/excel/ExcelWorkbook';

/**
 * Uçtan uca import yürütme bağlamı.
 */
export interface ImportExecutionContext {
  /** İçe aktarma isteği */
  request: ImportRequest;
  /** Opsiyonel foundation import bağlamı — yoksa istekten türetilir */
  importContext?: ImportContext;
  /** Inline CSV içeriği (test / doğrudan girdi) */
  csvContent?: string;
  /** Yapısal Excel workbook (test / doğrudan girdi) */
  excelWorkbook?: ExcelRawWorkbook;
  /** Başlangıç pipeline bag */
  initialBag?: PipelineBag;
  /** Dil */
  locale?: 'tr' | 'en';
  /** Entity ipuçları */
  entityHints?: readonly BusinessEntityTypeId[];
  /** Semantik minimum confidence */
  minSemanticConfidence?: number;
  /** Builder varsayılan entity tipi */
  defaultEntityType?: BusinessEntityTypeId;
  /** Dataset kimliği */
  datasetId?: string;
  /** Dataset başlığı */
  title?: string;
  /** Dataset revizyonu */
  revision?: string;
  /** Metadata etiketleri */
  tags?: readonly string[];
  /** Kiracı */
  tenantId?: string;
  /**
   * Doğrulama engelleyici hatalarda pipeline durdurulsun mu.
   * Varsayılan: true
   */
  haltOnValidationFailure?: boolean;
}

export type CreateImportExecutionContextInput = ImportExecutionContext;

/**
 * ImportExecutionContext fabrikası.
 */
export function createImportExecutionContext(
  input: CreateImportExecutionContextInput
): ImportExecutionContext {
  return { ...input };
}
