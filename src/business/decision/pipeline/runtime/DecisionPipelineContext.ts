/**
 * İSTEBUL Business Decision Engine — runtime pipeline context.
 */

import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import type { DecisionAction } from '../../models/DecisionAction';
import type { DecisionContext } from '../../models/DecisionContext';
import type { DecisionOpportunity } from '../../models/DecisionOpportunity';
import type { DecisionPriority } from '../../models/DecisionPriority';
import type { DecisionRecommendation } from '../../models/DecisionRecommendation';
import type { DecisionRequest } from '../../models/DecisionRequest';
import type { DecisionRisk } from '../../models/DecisionRisk';
import type { DecisionScore } from '../../models/DecisionScore';
import type { DecisionSummary } from '../../models/DecisionSummary';
import type { DecisionStageExecution } from './DecisionStageExecution';

/**
 * Decision Pipeline ara veri çantası — yalnızca Decision Engine anahtarları.
 */
export interface DecisionPipelineBag {
  /** AnalysisResult doğrulama sonucu */
  analysisValidation?: BusinessValidationResult;
  /** Risk placeholder alanı */
  risks?: readonly DecisionRisk[];
  /** Fırsat placeholder alanı */
  opportunities?: readonly DecisionOpportunity[];
  /** Öneri placeholder alanı */
  recommendations?: readonly DecisionRecommendation[];
  /** Aksiyon placeholder alanı */
  actions?: readonly DecisionAction[];
  /** Öncelik placeholder alanı */
  priorities?: readonly DecisionPriority[];
  /** Skor placeholder alanı */
  scores?: readonly DecisionScore[];
  /** Özet placeholder alanı */
  summary?: DecisionSummary;
  /** Diğer ara değerler */
  [key: string]: unknown;
}

export interface DecisionPipelineContext {
  /** Kaynak istek */
  request: DecisionRequest;
  /** Foundation DecisionContext */
  decisionContext: DecisionContext;
  /** Tamamlanan aşama kayıtları */
  stageExecutions: DecisionStageExecution[];
  /** Ara veri */
  bag: DecisionPipelineBag;
  /** Pipeline başlangıcı (ISO 8601) */
  startedAt: string;
  /** Monotonik başlangıç işareti (ms) */
  startedMark: number;
}
