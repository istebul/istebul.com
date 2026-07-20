/**
 * İSTEBUL Business Import Engine — ImportExecutionResult (PR-101J).
 */

import type { BuilderResult } from '../../builder/runtime/BuilderResult';
import type { SchemaResult } from '../../detectors/runtime/SchemaResult';
import type { SemanticResult } from '../../mappers/runtime/SemanticResult';
import type { NormalizationResult } from '../../normalizers/runtime/NormalizationResult';
import type { PipelineContext } from '../../pipeline/runtime/PipelineContext';
import type { StageExecution, StageExecutionOutcome } from '../../pipeline/runtime/StageExecution';
import type { CsvReaderResult } from '../../readers/csv/CsvReaderResult';
import type { ExcelReaderResult } from '../../readers/excel/ExcelReaderResult';
import type { ReaderLookupTelemetry } from '../../readers/runtime/telemetry';
import type { ImportResult } from '../../types/ImportResult';
import type { ImportStage } from '../../types/ImportStage';
import type { ValidationResultRuntime } from '../../validators/runtime/ValidationResultRuntime';

/**
 * Pipeline özet telemetrisi.
 */
export interface ImportPipelineSummary {
  /** Toplam aşama sayısı (yürütülen) */
  stagesExecuted: number;
  /** Başarılı aşama */
  stagesSucceeded: number;
  /** Başarısız aşama */
  stagesFailed: number;
  /** Atlanan aşama */
  stagesSkipped: number;
  /** Genel başarı */
  success: boolean;
  /** Dataset üretildi mi */
  datasetProduced: boolean;
  /** Toplam uyarı */
  warningCount: number;
  /** Toplam hata */
  errorCount: number;
}

/**
 * Uçtan uca yürütme telemetrisi.
 */
export interface ImportExecutionTelemetry {
  /** Toplam süre (ms) */
  totalDurationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Aşama süreleri */
  stageDurationsMs: Readonly<Partial<Record<ImportStage, number>>>;
  /** Aşama sonuçları */
  stageOutcomes: Readonly<Partial<Record<ImportStage, StageExecutionOutcome>>>;
  /** Pipeline özeti */
  summary: ImportPipelineSummary;
}

/**
 * Uçtan uca import yürütme sonucu.
 */
export interface ImportExecutionResult {
  /** Foundation ImportResult */
  importResult: ImportResult;
  /** Son pipeline bağlamı */
  pipelineContext: Readonly<PipelineContext>;
  /** Aşama kayıtları */
  stageExecutions: readonly StageExecution[];
  /** Telemetri */
  telemetry: ImportExecutionTelemetry;
  /** Reader lookup telemetrisi */
  readerLookup?: ReaderLookupTelemetry;
  /** CSV okuma sonucu */
  csvResult?: CsvReaderResult;
  /** Excel okuma sonucu */
  excelResult?: ExcelReaderResult;
  /** Şema tespiti sonucu */
  schemaResult?: SchemaResult;
  /** Semantik eşleme sonucu */
  semanticResult?: SemanticResult;
  /** Normalizasyon sonucu */
  normalizationResult?: NormalizationResult;
  /** Doğrulama sonucu */
  validationResult?: ValidationResultRuntime;
  /** Dataset builder sonucu */
  builderResult?: BuilderResult;
}
