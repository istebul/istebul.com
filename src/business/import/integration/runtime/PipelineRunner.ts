/**
 * İSTEBUL Business Import Engine — PipelineRunner (PR-101J).
 *
 * Mevcut runtime katmanlarını uçtan uca birleştirir.
 * PR-101A–101I dosyalarını değiştirmez.
 */

import { getImportAdapterById } from '../../adapters/AdapterRegistry';
import type { BusinessEntityTypeId } from '../../../dataset/entities/BusinessEntityType';
import {
  IMPORT_PIPELINE_STAGES,
  type ImportPipelineStageDefinition
} from '../../pipeline/ImportPipeline';
import { createBuilderContext } from '../../builder/runtime/BuilderContext';
import {
  createBusinessDatasetBuilderRuntime,
  type BusinessDatasetBuilderRuntime
} from '../../builder/runtime/BusinessDatasetBuilderRuntime';
import type { BuilderResult } from '../../builder/runtime/BuilderResult';
import { attachDatasetBuildToPipelineContext } from '../../builder/runtime/pipelineBridge';
import type { SchemaResult } from '../../detectors/runtime/SchemaResult';
import { createSchemaContext } from '../../detectors/runtime/SchemaContext';
import {
  createSchemaDetectionRuntime,
  type SchemaDetectionRuntime
} from '../../detectors/runtime/SchemaDetectionRuntime';
import { attachSchemaToPipelineContext } from '../../detectors/runtime/pipelineBridge';
import { createSemanticContext } from '../../mappers/runtime/SemanticContext';
import {
  createSemanticMappingRuntime,
  type SemanticMappingRuntime
} from '../../mappers/runtime/SemanticMappingRuntime';
import type { SemanticResult } from '../../mappers/runtime/SemanticResult';
import { attachSemanticToPipelineContext } from '../../mappers/runtime/pipelineBridge';
import { createNormalizationContextFromSemantic } from '../../normalizers/runtime/NormalizationContext';
import {
  createDatasetNormalizerRuntime,
  type DatasetNormalizerRuntime
} from '../../normalizers/runtime/DatasetNormalizerRuntime';
import type { NormalizationResult } from '../../normalizers/runtime/NormalizationResult';
import { attachNormalizationToPipelineContext } from '../../normalizers/runtime/pipelineBridge';
import {
  createImportError,
  IMPORT_RUNTIME_ERROR_CODES
} from '../../pipeline/runtime/errors';
import type { PipelineContext } from '../../pipeline/runtime/PipelineContext';
import { handleAdapterSelection } from '../../pipeline/runtime/stageHandlers';
import { endStageTimer, nowMs, startStageTimer } from '../../pipeline/runtime/timing';
import { attachCsvResultToPipelineContext } from '../../readers/csv/pipelineBridge';
import { CSV_READER_ID } from '../../readers/csv/CsvImportReader';
import { attachExcelResultToPipelineContext } from '../../readers/excel/pipelineBridge';
import { EXCEL_READER_ID } from '../../readers/excel/ExcelImportReader';
import {
  createReaderFactory,
  type ReaderFactory
} from '../../readers/runtime/ReaderFactory';
import {
  createReaderRegistryRuntime,
  type ReaderRegistryRuntime
} from '../../readers/runtime/ReaderRegistryRuntime';
import {
  ReaderNotFoundError,
  UnsupportedSourceError
} from '../../readers/runtime/errors';
import { attachReaderLookupToPipelineContext } from '../../readers/runtime/pipelineBridge';
import { registerCsvImportReader } from '../../readers/csv/registration';
import { registerExcelImportReader } from '../../readers/excel/registration';
import type { ImportError } from '../../types/ImportError';
import type { ImportResult } from '../../types/ImportResult';
import { createValidationContext } from '../../validators/runtime/ValidationContext';
import {
  createValidationRuntime,
  type ValidationRuntime
} from '../../validators/runtime/ValidationRuntime';
import type { ValidationResultRuntime } from '../../validators/runtime/ValidationResultRuntime';
import { attachValidationToPipelineContext } from '../../validators/runtime/pipelineBridge';
import { isBlockingSeverity } from '../../validators/runtime/ValidationSeverity';
import type { ImportExecutionContext } from './ImportExecutionContext';
import type { ImportExecutionResult } from './ImportExecutionResult';
import {
  buildExecutionTelemetry,
  createPipelineContextFromExecution,
  importTargetFromRequest,
  runTimedStage,
  type StageRunResult
} from './helpers';

export interface PipelineRunnerDependencies {
  readerRegistry?: ReaderRegistryRuntime;
  readerFactory?: ReaderFactory;
  validationRuntime?: ValidationRuntime;
  schemaRuntime?: SchemaDetectionRuntime;
  semanticRuntime?: SemanticMappingRuntime;
  normalizerRuntime?: DatasetNormalizerRuntime;
  builderRuntime?: BusinessDatasetBuilderRuntime;
  /** Reader kayıtlarını atla (reader bulunamadı testi) */
  skipReaderRegistration?: boolean;
}

function entityHintsFromExecution(
  execution: ImportExecutionContext,
  context: PipelineContext
): readonly BusinessEntityTypeId[] | undefined {
  const hints = execution.entityHints ?? context.request.entityHints;
  return hints as readonly BusinessEntityTypeId[] | undefined;
}

function stageDefinition(id: ImportPipelineStageDefinition['id']) {
  const def = IMPORT_PIPELINE_STAGES.find((s) => s.id === id);
  if (!def) {
    throw new Error(`Pipeline stage not found: ${id}`);
  }
  return def;
}

function importErrorFromUnknown(
  err: unknown,
  stage: ImportExecutionResult['importResult']['lastStage'],
  code = IMPORT_RUNTIME_ERROR_CODES.UNEXPECTED
): ImportError {
  const detail = err instanceof Error ? err.message : String(err);
  const errCode =
    err instanceof Error && 'code' in err && typeof err.code === 'string'
      ? err.code
      : code;
  return createImportError(errCode, detail, {
    stage,
    detail,
    recoverable: false
  });
}

function tabularRows(rawPayload: unknown): Record<string, unknown>[] {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return [];
  }
  const payload = rawPayload as {
    rows?: readonly Record<string, unknown>[];
  };
  if (Array.isArray(payload.rows)) {
    return [...payload.rows];
  }
  return [];
}

/**
 * Uçtan uca import pipeline yürütücüsü.
 */
export class PipelineRunner {
  private readonly readerRegistry: ReaderRegistryRuntime;
  private readonly readerFactory: ReaderFactory;
  private readonly validationRuntime: ValidationRuntime;
  private readonly schemaRuntime: SchemaDetectionRuntime;
  private readonly semanticRuntime: SemanticMappingRuntime;
  private readonly normalizerRuntime: DatasetNormalizerRuntime;
  private readonly builderRuntime: BusinessDatasetBuilderRuntime;

  constructor(deps: PipelineRunnerDependencies = {}) {
    this.readerRegistry =
      deps.readerRegistry ?? createDefaultReaderRegistry(deps.skipReaderRegistration);
    this.readerFactory =
      deps.readerFactory ?? createReaderFactory(this.readerRegistry);
    this.validationRuntime =
      deps.validationRuntime ?? createValidationRuntime();
    this.schemaRuntime =
      deps.schemaRuntime ?? createSchemaDetectionRuntime();
    this.semanticRuntime =
      deps.semanticRuntime ?? createSemanticMappingRuntime();
    this.normalizerRuntime =
      deps.normalizerRuntime ?? createDatasetNormalizerRuntime();
    this.builderRuntime =
      deps.builderRuntime ?? createBusinessDatasetBuilderRuntime();
  }

  /**
   * Tam uçtan uca akışı yürütür.
   */
  async execute(
    execution: ImportExecutionContext
  ): Promise<ImportExecutionResult> {
    const pipelineTimer = startStageTimer();
    const context = createPipelineContextFromExecution(execution);
    context.importContext.status = 'suruyor';

    const haltOnValidation =
      execution.haltOnValidationFailure !== false;

    let halted = false;

    // 1. Adapter seçimi
    const adapterDef = stageDefinition('adapter-secimi');
    const adapterResult = await runTimedStage(
      'adapter-secimi',
      adapterDef.name,
      context,
      () => handleAdapterSelection(context, adapterDef)
    );
    if (adapterResult.haltPipeline || adapterResult.outcome === 'basarisiz') {
      halted = true;
    }

    // 2. Reader
    if (!halted) {
      const readDef = stageDefinition('okuma');
      const readResult = await runTimedStage(
        'okuma',
        readDef.name,
        context,
        () => this.runReaderStage(context, execution)
      );
      if (readResult.haltPipeline || readResult.outcome === 'basarisiz') {
        halted = true;
      }
    }

    // 3. Validation (reader çıktısı üzerinde — PR-101J akışı)
    if (!halted) {
      const validationDef = stageDefinition('dogrulama');
      const validationResult = await runTimedStage(
        'dogrulama',
        validationDef.name,
        context,
        () => this.runValidationStage(context, execution)
      );
      if (
        validationResult.haltPipeline ||
        validationResult.outcome === 'basarisiz' ||
        (haltOnValidation && this.hasBlockingValidation(context))
      ) {
        halted = true;
      }
    }

    // 4. Schema detection
    if (!halted) {
      const schemaDef = stageDefinition('tespit');
      const schemaResult = await runTimedStage(
        'tespit',
        schemaDef.name,
        context,
        () => this.runSchemaStage(context, execution)
      );
      if (schemaResult.haltPipeline || schemaResult.outcome === 'basarisiz') {
        halted = true;
      }
    }

    // 5. Semantic mapping
    if (!halted) {
      const semanticDef = stageDefinition('semantik-esleme');
      const semanticResult = await runTimedStage(
        'semantik-esleme',
        semanticDef.name,
        context,
        () => this.runSemanticStage(context, execution)
      );
      if (semanticResult.haltPipeline || semanticResult.outcome === 'basarisiz') {
        halted = true;
      }
    }

    // 6. Normalization
    if (!halted) {
      const normDef = stageDefinition('normalizasyon');
      const normResult = await runTimedStage(
        'normalizasyon',
        normDef.name,
        context,
        () => this.runNormalizationStage(context, execution)
      );
      if (normResult.haltPipeline || normResult.outcome === 'basarisiz') {
        halted = true;
      }
    }

    // 7. Dataset build
    if (!halted) {
      const buildDef = stageDefinition('dataset-olusturma');
      const buildResult = await runTimedStage(
        'dataset-olusturma',
        buildDef.name,
        context,
        () => this.runBuilderStage(context, execution)
      );
      if (buildResult.haltPipeline || buildResult.outcome === 'basarisiz') {
        halted = true;
      }
    } else {
      await runTimedStage(
        'dataset-olusturma',
        stageDefinition('dataset-olusturma').name,
        context,
        () => ({
          outcome: 'atlandi',
          errors: [],
          warnings: [],
          detail: 'Önceki aşama hatası nedeniyle atlandı.'
        })
      );
    }

    // 8. Tamamlandı
    const completedDef = stageDefinition('tamamlandi');
    await runTimedStage('tamamlandi', completedDef.name, context, () => ({
      outcome: halted ? 'basarisiz' : 'basarili',
      errors: halted
        ? [
            createImportError(
              IMPORT_RUNTIME_ERROR_CODES.STAGE_FAILED,
              'Import pipeline tamamlanamadı.',
              { stage: 'tamamlandi', recoverable: false }
            )
          ]
        : [],
      warnings: [],
      detail: halted
        ? 'Pipeline önceki aşamada durdu.'
        : 'Uçtan uca import tamamlandı.'
    }));

    const { endedAt, durationMs } = endStageTimer(pipelineTimer);
    context.importContext.status = halted ? 'basarisiz' : 'basarili';

    const builderBag = context.bag.datasetBuildResult as BuilderResult | undefined;

    let importResult: ImportResult =
      builderBag?.importResult ??
      {
        requestId: context.request.id,
        status: halted ? 'basarisiz' : 'basarili',
        lastStage: context.importContext.currentStage,
        errors: context.stageExecutions.flatMap((s) => [...s.errors]),
        warnings: context.stageExecutions.flatMap((s) => [...s.warnings]),
        completedAt: endedAt
      };

    if (halted) {
      importResult = {
        ...importResult,
        status: 'basarisiz',
        errors: context.stageExecutions.flatMap((s) => [...s.errors]),
        warnings: context.stageExecutions.flatMap((s) => [...s.warnings]),
        completedAt: endedAt,
        dataset: undefined
      };
    } else {
      importResult = {
        ...importResult,
        lastStage: 'tamamlandi',
        completedAt: endedAt
      };
    }

    const telemetry = buildExecutionTelemetry(
      context,
      pipelineTimer.startedAt,
      endedAt,
      durationMs || Math.max(0, Math.round(nowMs() - pipelineTimer.mark))
    );

    return {
      importResult,
      pipelineContext: context,
      stageExecutions: Object.freeze([...context.stageExecutions]),
      telemetry,
      readerLookup: context.bag.readerLookup as ImportExecutionResult['readerLookup'],
      csvResult: context.bag.csvReaderResult as ImportExecutionResult['csvResult'],
      excelResult: context.bag.excelReaderResult as ImportExecutionResult['excelResult'],
      schemaResult: context.bag.schemaDetectionResult as ImportExecutionResult['schemaResult'],
      semanticResult: context.bag.semanticMappingResult as ImportExecutionResult['semanticResult'],
      normalizationResult: context.bag.normalizationResult as ImportExecutionResult['normalizationResult'],
      validationResult: context.bag.validationResult as ImportExecutionResult['validationResult'],
      builderResult: context.bag.datasetBuildResult as ImportExecutionResult['builderResult']
    };
  }

  private hasBlockingValidation(context: PipelineContext): boolean {
    const validation = context.bag.validationResult as
      | { isValid?: boolean; issues?: readonly { severity: string }[] }
      | undefined;
    if (!validation) {
      return false;
    }
    if (validation.isValid === false) {
      return true;
    }
    return (
      validation.issues?.some((issue) =>
        isBlockingSeverity(issue.severity as 'ERROR' | 'CRITICAL' | 'INFO' | 'WARNING')
      ) ?? false
    );
  }

  private runReaderStage(
    context: PipelineContext,
    execution: ImportExecutionContext
  ): Promise<StageRunResult> {
    return this.runReaderStageAsync(context, execution);
  }

  private async runReaderStageAsync(
    context: PipelineContext,
    execution: ImportExecutionContext
  ): Promise<StageRunResult> {
    const warnings: ImportError[] = [];
    try {
      const target = importTargetFromRequest(
        context.request,
        execution.tenantId
      );
      const { reader, readerId, telemetry } = this.readerFactory.create(target);
      attachReaderLookupToPipelineContext(context, telemetry);

      const adapter = getImportAdapterById(context.request.source.type);
      if (adapter && !adapter.readerRegistered) {
        warnings.push(
          createImportError(
            'ADAPTER_READER_PENDING',
            `${adapter.name} adapter kaydı var; reader runtime ile okunuyor.`,
            { stage: 'okuma', recoverable: true }
          )
        );
      }

      const readerResult = await reader.read(
        context.importContext,
        context.request.payloadRef
      );

      if (readerId === CSV_READER_ID) {
        attachCsvResultToPipelineContext(context, readerResult as never);
      } else if (readerId === EXCEL_READER_ID) {
        attachExcelResultToPipelineContext(context, readerResult as never);
      } else {
        context.bag.rawPayload = readerResult;
      }

      return {
        outcome: 'basarili',
        errors: [],
        warnings,
        detail: `Reader: ${readerId}`
      };
    } catch (err) {
      if (err instanceof ReaderNotFoundError || err instanceof UnsupportedSourceError) {
        return {
          outcome: 'basarisiz',
          errors: [
            createImportError(
              'READER_NOT_FOUND',
              err.message,
              { stage: 'okuma', detail: err.message, recoverable: false }
            )
          ],
          warnings: [],
          haltPipeline: true
        };
      }
      return {
        outcome: 'basarisiz',
        errors: [importErrorFromUnknown(err, 'okuma')],
        warnings: [],
        haltPipeline: true
      };
    }
  }

  private runValidationStage(
    context: PipelineContext,
    execution: ImportExecutionContext
  ): StageRunResult {
    const result = this.validationRuntime.validate(
      createValidationContext({
        request: context.request,
        importContext: context.importContext,
        readerOutput: context.bag.rawPayload,
        locale: context.importContext.locale,
        tenantId: execution.tenantId,
        bag: context.bag as Record<string, unknown>
      })
    );
    attachValidationToPipelineContext(context, result);

    const warnings: ImportError[] = [];
    const errors: ImportError[] = [];
    for (const issue of result.issues) {
      const mapped = createImportError(issue.code, issue.message, {
        stage: 'dogrulama',
        detail: issue.path ?? issue.detail,
        recoverable: !isBlockingSeverity(issue.severity)
      });
      if (isBlockingSeverity(issue.severity)) {
        errors.push(mapped);
      } else {
        warnings.push(mapped);
      }
    }

    const blocking = errors.length > 0 || !result.isValid;
    return {
      outcome: blocking ? 'basarisiz' : 'basarili',
      errors,
      warnings,
      detail: `Doğrulama: ${result.issues.length} bulgu`,
      haltPipeline: blocking
    };
  }

  private runSchemaStage(
    context: PipelineContext,
    execution: ImportExecutionContext
  ): StageRunResult {
    try {
      const result = this.schemaRuntime.detect(
        createSchemaContext({
          input: context.bag.rawPayload,
          sourceType: context.request.source.type,
          entityHints: entityHintsFromExecution(execution, context),
          locale: context.importContext.locale,
          tenantId: execution.tenantId
        })
      );
      attachSchemaToPipelineContext(context, result);
      return {
        outcome: 'basarili',
        errors: [],
        warnings: [],
        detail: `${result.columns.length} kolon tespit edildi`
      };
    } catch (err) {
      return {
        outcome: 'basarisiz',
        errors: [importErrorFromUnknown(err, 'tespit')],
        warnings: [],
        haltPipeline: true
      };
    }
  }

  private runSemanticStage(
    context: PipelineContext,
    execution: ImportExecutionContext
  ): StageRunResult {
    try {
      const schemaResult = context.bag.schemaDetectionResult as
        | SchemaResult
        | undefined;
      const result = this.semanticRuntime.map(
        createSemanticContext({
          schemaResult,
          columnKeys: schemaResult?.columnKeys,
          entityHints: entityHintsFromExecution(execution, context),
          locale: context.importContext.locale,
          minConfidence: execution.minSemanticConfidence,
          tenantId: execution.tenantId
        })
      );
      attachSemanticToPipelineContext(context, result);

      const warnings: ImportError[] = [];
      if (result.unmappedSourceKeys.length > 0) {
        warnings.push(
          createImportError(
            'SEMANTIC_UNMAPPED_COLUMNS',
            `${result.unmappedSourceKeys.length} kolon eşlenemedi.`,
            {
              stage: 'semantik-esleme',
              detail: result.unmappedSourceKeys.join(', '),
              recoverable: true
            }
          )
        );
      }
      const lowConfidence = result.columns.filter(
        (c) => c.confidence !== undefined && c.confidence < 0.5
      );
      if (lowConfidence.length > 0) {
        warnings.push(
          createImportError(
            'SEMANTIC_LOW_CONFIDENCE',
            `${lowConfidence.length} kolon düşük confidence ile eşlendi.`,
            { stage: 'semantik-esleme', recoverable: true }
          )
        );
      }

      return {
        outcome: 'basarili',
        errors: [],
        warnings,
        detail: `${result.mappings.length} eşleme, ${result.unmappedSourceKeys.length} eşlenemeyen`
      };
    } catch (err) {
      return {
        outcome: 'basarisiz',
        errors: [importErrorFromUnknown(err, 'semantik-esleme')],
        warnings: [],
        haltPipeline: true
      };
    }
  }

  private runNormalizationStage(
    context: PipelineContext,
    _execution: ImportExecutionContext
  ): StageRunResult {
    try {
      const semanticResult = context.bag.semanticMappingResult as
        | SemanticResult
        | undefined;
      const rows = tabularRows(context.bag.rawPayload);
      const normContext = createNormalizationContextFromSemantic(
        semanticResult ?? {
          columns: Object.freeze([]),
          mappings: Object.freeze([]),
          unmappedSourceKeys: Object.freeze([]),
          telemetry: {
            ruleCount: 0,
            rulesExecuted: 0,
            rulesMatched: 0,
            totalMatches: 0,
            unmappedCount: 0,
            confidenceDistribution: { high: 0, medium: 0, low: 0 },
            durationMs: 0,
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString()
          }
        },
        rows,
        { locale: context.importContext.locale }
      );
      const result = this.normalizerRuntime.normalize(normContext);
      attachNormalizationToPipelineContext(context, result);

      const warnings: ImportError[] = result.warnings.map((w) =>
        createImportError(w.code, w.message, {
          stage: 'normalizasyon',
          detail: w.path ?? w.sourceKey,
          recoverable: true
        })
      );

      return {
        outcome: 'basarili',
        errors: [],
        warnings,
        detail: `${result.records.length} kayıt normalize edildi`
      };
    } catch (err) {
      return {
        outcome: 'basarisiz',
        errors: [importErrorFromUnknown(err, 'normalizasyon')],
        warnings: [],
        haltPipeline: true
      };
    }
  }

  private runBuilderStage(
    context: PipelineContext,
    execution: ImportExecutionContext
  ): StageRunResult {
    try {
      const normalizationResult = context.bag.normalizationResult as
        | NormalizationResult
        | undefined;
      if (!normalizationResult) {
        return {
          outcome: 'basarisiz',
          errors: [
            createImportError(
              'NORMALIZATION_MISSING',
              'Normalizasyon sonucu bulunamadı.',
              { stage: 'dataset-olusturma', recoverable: false }
            )
          ],
          warnings: [],
          haltPipeline: true
        };
      }

      const validationResult = context.bag.validationResult as
        | ValidationResultRuntime
        | undefined;

      const builderResult = this.builderRuntime.build(
        createBuilderContext({
          normalizationResult,
          request: context.request,
          validationResult,
          importContext: context.importContext,
          datasetId: execution.datasetId,
          title: execution.title,
          locale: execution.locale ?? context.importContext.locale,
          revision: execution.revision,
          defaultEntityType: execution.defaultEntityType,
          tags: execution.tags
        })
      );
      attachDatasetBuildToPipelineContext(context, builderResult);

      return {
        outcome: 'basarili',
        errors: [],
        warnings: [],
        detail: `Dataset: ${builderResult.dataset.id}`
      };
    } catch (err) {
      return {
        outcome: 'basarisiz',
        errors: [importErrorFromUnknown(err, 'dataset-olusturma')],
        warnings: [],
        haltPipeline: true
      };
    }
  }
}

function createDefaultReaderRegistry(
  skipRegistration?: boolean
): ReaderRegistryRuntime {
  const registry = createReaderRegistryRuntime();
  if (!skipRegistration) {
    registerCsvImportReader(registry);
    registerExcelImportReader(registry);
  }
  return registry;
}

export function createPipelineRunner(
  deps?: PipelineRunnerDependencies
): PipelineRunner {
  return new PipelineRunner(deps);
}
