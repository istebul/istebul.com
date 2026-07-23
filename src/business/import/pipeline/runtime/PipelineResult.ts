/**
 * İSTEBUL Business Import Engine — runtime PipelineResult.
 */

import type { ImportResult } from '../../types/ImportResult';
import type { PipelineContext } from './PipelineContext';
import type { StageExecution } from './StageExecution';

/**
 * Detaylı pipeline sonucu — ImportResult + yürütme telemetrisi.
 */
export interface PipelineResult {
  /** Foundation ImportResult */
  importResult: ImportResult;
  /** Son bağlam durumu (salt okunur görünüm) */
  context: Readonly<PipelineContext>;
  /** Aşama yürütmeleri */
  stageExecutions: readonly StageExecution[];
  /** Toplam süre (ms) */
  totalDurationMs: number;
}
