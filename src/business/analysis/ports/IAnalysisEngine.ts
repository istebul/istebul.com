/**
 * İSTEBUL Business Analysis Engine — ana motor portu.
 */

import type { AnalysisContext } from '../models/AnalysisContext';
import type { AnalysisRequest } from '../models/AnalysisRequest';
import type { AnalysisResult } from '../models/AnalysisResult';

export interface IAnalysisEngine {
  /**
   * Verilen istek ve bağlam için analiz çalıştırır.
   * Bu PR’da implementasyon yoktur.
   */
  analyze(
    request: AnalysisRequest,
    context: AnalysisContext
  ): Promise<AnalysisResult>;
}
