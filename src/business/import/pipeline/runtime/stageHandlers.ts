/**
 * İSTEBUL Business Import Engine — aşama işleyici sözleşmesi ve varsayılanlar.
 *
 * Gerçek CSV/Excel okuma yoktur.
 */

import { getImportAdapterById } from '../../adapters/AdapterRegistry';
import type { ImportPipelineStageDefinition } from '../ImportPipeline';
import type { PipelineContext } from './PipelineContext';
import type { StageExecutionOutcome } from './StageExecution';
import {
  createImportError,
  createNotImplementedError,
  IMPORT_RUNTIME_ERROR_CODES
} from './errors';
import type { ImportError } from '../../types/ImportError';

export interface StageHandlerResult {
  outcome: StageExecutionOutcome;
  errors: ImportError[];
  warnings: ImportError[];
  detail?: string;
  /** true ise kalan aşamalar atlanır (tamamlandi hariç değil — orchestrator yönetir) */
  haltPipeline?: boolean;
}

export type StageHandler = (
  context: PipelineContext,
  definition: ImportPipelineStageDefinition
) => Promise<StageHandlerResult>;

/**
 * Adapter seçimi — registry’den kaynak tipine göre kayıt bulur.
 * Dosya okumaz.
 */
export async function handleAdapterSelection(
  context: PipelineContext,
  definition: ImportPipelineStageDefinition
): Promise<StageHandlerResult> {
  const sourceType = context.request.source?.type;
  if (!sourceType) {
    return {
      outcome: 'basarisiz',
      errors: [
        createImportError(
          IMPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST,
          'Import kaynağı tipi belirtilmedi.',
          {
            stage: definition.id,
            detail: 'ImportRequest.source.type is required.',
            recoverable: false
          }
        )
      ],
      warnings: [],
      haltPipeline: true
    };
  }

  const adapter = getImportAdapterById(sourceType);
  if (!adapter) {
    return {
      outcome: 'basarisiz',
      errors: [
        createImportError(
          IMPORT_RUNTIME_ERROR_CODES.ADAPTER_NOT_FOUND,
          `Kaynak tipi için adapter bulunamadı: ${sourceType}`,
          {
            stage: definition.id,
            detail: `No ImportAdapterRegistration for '${sourceType}'.`,
            recoverable: false
          }
        )
      ],
      warnings: [],
      haltPipeline: true
    };
  }

  context.bag.selectedAdapter = adapter;

  const warnings: ImportError[] = [];
  if (!adapter.readerRegistered) {
    warnings.push(
      createImportError(
        'ADAPTER_READER_PENDING',
        `${adapter.name} adapter kaydı var; reader henüz kayıtlı değil.`,
        {
          stage: definition.id,
          detail: `readerRegistered=false for adapter '${adapter.id}'.`,
          recoverable: true
        }
      )
    );
  }

  return {
    outcome: 'basarili',
    errors: [],
    warnings,
    detail: `Adapter seçildi: ${adapter.id} → ${adapter.datasetSourceType}`
  };
}

/**
 * Henüz uygulanmamış aşamalar için standart NotImplemented sonucu.
 */
export async function handleNotImplemented(
  _context: PipelineContext,
  definition: ImportPipelineStageDefinition
): Promise<StageHandlerResult> {
  return {
    outcome: 'not-implemented',
    errors: [createNotImplementedError(definition.id, definition.name)],
    warnings: [],
    detail: `NotImplemented: ${definition.id}`
  };
}

/**
 * Pipeline kapanış aşaması — önceki sonuçlara göre özet üretir.
 * Dataset oluşturmaz.
 */
export async function handleCompleted(
  context: PipelineContext,
  definition: ImportPipelineStageDefinition
): Promise<StageHandlerResult> {
  const prior = context.stageExecutions;
  const failed = prior.some((e) => e.outcome === 'basarisiz');
  const notImplemented = prior.some((e) => e.outcome === 'not-implemented');

  if (failed) {
    return {
      outcome: 'basarisiz',
      errors: [
        createImportError(
          IMPORT_RUNTIME_ERROR_CODES.STAGE_FAILED,
          'Pipeline önceki aşamada başarısız olduğu için tamamlanamadı.',
          { stage: definition.id, recoverable: false }
        )
      ],
      warnings: [],
      detail: 'Completed stage after prior failure.'
    };
  }

  if (notImplemented) {
    return {
      outcome: 'basarili',
      errors: [],
      warnings: [
        createImportError(
          IMPORT_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED,
          'Pipeline orchestrator tamamlandı; bazı aşamalar henüz uygulanmadı (dataset üretilmedi).',
          {
            stage: definition.id,
            detail: 'Orchestrator finished; dataset not produced.',
            recoverable: true
          }
        )
      ],
      detail: 'Orchestrator completed without full stage implementations.'
    };
  }

  return {
    outcome: 'basarili',
    errors: [],
    warnings: [],
    detail: 'Pipeline completed.'
  };
}

export function resolveStageHandler(
  stageId: ImportPipelineStageDefinition['id']
): StageHandler {
  switch (stageId) {
    case 'adapter-secimi':
      return handleAdapterSelection;
    case 'tamamlandi':
      return handleCompleted;
    case 'okuma':
    case 'tespit':
    case 'semantik-esleme':
    case 'normalizasyon':
    case 'dogrulama':
    case 'dataset-olusturma':
      return handleNotImplemented;
    default: {
      const _exhaustive: never = stageId;
      void _exhaustive;
      return handleNotImplemented;
    }
  }
}
