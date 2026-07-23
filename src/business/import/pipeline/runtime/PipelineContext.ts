/**
 * İSTEBUL Business Import Engine — runtime PipelineContext.
 *
 * Foundation `ImportContext` üzerine yürütme durumu ekler; sözleşmeyi değiştirmez.
 */

import type { ImportAdapterRegistration } from '../../adapters/AdapterRegistry';
import type { ImportContext } from '../../types/ImportContext';
import type { ImportRequest } from '../../types/ImportRequest';
import type { StageExecution } from './StageExecution';

/**
 * Aşamalar arası taşıma torbası — gerçek parse verisi yok.
 */
export interface PipelineBag {
  /** Seçilen adapter kaydı (adapter-secimi) */
  selectedAdapter?: ImportAdapterRegistration;
  /** Ham payload — bu PR’da okunmaz */
  rawPayload?: unknown;
  /** Diğer ara değerler */
  [key: string]: unknown;
}

/**
 * Orchestrator çalışma bağlamı.
 */
export interface PipelineContext {
  /** Kaynak istek */
  request: ImportRequest;
  /** Foundation ImportContext (güncel aşama/durum) */
  importContext: ImportContext;
  /** Tamamlanan aşama kayıtları */
  stageExecutions: StageExecution[];
  /** Ara veri */
  bag: PipelineBag;
  /** Pipeline başlangıcı (ISO 8601) */
  startedAt: string;
  /** Monotonik başlangıç işareti (ms) */
  startedMark: number;
}
