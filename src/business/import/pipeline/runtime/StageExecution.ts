/**
 * İSTEBUL Business Import Engine — aşama yürütme kaydı.
 *
 * Foundation `ImportStage` sözleşmesini değiştirmez.
 */

import type { ImportError } from '../../types/ImportError';
import type { ImportStage } from '../../types/ImportStage';

/**
 * Tek aşama yürütme sonucu.
 *
 * | Teknik | Türkçe |
 * |--------|--------|
 * | basarili | Başarılı |
 * | not-implemented | Henüz uygulanmadı |
 * | basarisiz | Başarısız |
 * | atlandi | Atlandı |
 */
export type StageExecutionOutcome =
  | 'basarili'
  | 'not-implemented'
  | 'basarisiz'
  | 'atlandi';

export const STAGE_EXECUTION_OUTCOME_LABELS: Readonly<
  Record<StageExecutionOutcome, string>
> = Object.freeze({
  basarili: 'Başarılı',
  'not-implemented': 'Henüz uygulanmadı',
  basarisiz: 'Başarısız',
  atlandi: 'Atlandı'
});

/**
 * Pipeline içinde tek bir aşamanın yürütme kaydı.
 */
export interface StageExecution {
  /** Aşama kimliği */
  stageId: ImportStage;
  /** Görünen ad */
  stageName: string;
  /** Sonuç */
  outcome: StageExecutionOutcome;
  /** Başlangıç (ISO 8601) */
  startedAt: string;
  /** Bitiş (ISO 8601) */
  endedAt: string;
  /** Süre (ms) */
  durationMs: number;
  /** Aşama hataları */
  errors: readonly ImportError[];
  /** Aşama uyarıları */
  warnings: readonly ImportError[];
  /** Kısa teknik not */
  detail?: string;
}
