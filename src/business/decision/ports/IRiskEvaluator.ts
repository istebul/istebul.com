/**
 * İSTEBUL Business Decision Engine — risk değerlendirici portu.
 */

import type { AnalysisResult } from '../../analysis/models/AnalysisResult';
import type { DecisionContext } from '../models/DecisionContext';
import type { DecisionRisk } from '../models/DecisionRisk';

export interface IRiskEvaluator {
  evaluate(
    context: DecisionContext,
    analysisResult: AnalysisResult
  ): Promise<readonly DecisionRisk[]>;
}
