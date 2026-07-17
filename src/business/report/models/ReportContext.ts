/**
 * Report Engine — rapor üretim bağlamı.
 */

import type { DecisionResult } from '../../decision/models/DecisionResult';
import type {
  ReportExecutionStatus,
  ReportStage
} from '../models/ReportStage';

export interface ReportContext {
  reportJobId: string;
  decisionResult: DecisionResult;
  reportDnaId: string;
  locale: 'tr' | 'en';
  currentStage: ReportStage;
  status: ReportExecutionStatus;
  metadata?: Readonly<Record<string, string>>;
}
