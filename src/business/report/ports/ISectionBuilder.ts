/**
 * İSTEBUL Business Report Engine — bölüm oluşturucu portu.
 */

import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { ReportContext } from '../models/ReportContext';
import type { ReportSection } from '../models/ReportSection';

export interface ISectionBuilder {
  build(
    context: ReportContext,
    decisionResult: DecisionResult,
    sectionCodes: readonly string[]
  ): Promise<readonly ReportSection[]>;
}
