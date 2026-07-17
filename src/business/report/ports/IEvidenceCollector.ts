/**
 * İSTEBUL Business Report Engine — kanıt toplayıcı portu.
 */

import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { ReportContext } from '../models/ReportContext';
import type { ReportReference } from '../models/ReportReference';

export interface IEvidenceCollector {
  collect(
    context: ReportContext,
    decisionResult: DecisionResult
  ): Promise<readonly ReportReference[]>;
}
