/**
 * Document Engine çalışma bağlamı.
 */

import type { ReportModel } from '../../report/models/ReportModel';
import type {
  DocumentExecutionStatus,
  DocumentStage
} from './DocumentStage';

export interface DocumentContext {
  documentJobId: string;
  reportModel: ReportModel;
  locale: 'tr' | 'en';
  layoutId: string;
  themeId: string;
  currentStage: DocumentStage;
  status: DocumentExecutionStatus;
  metadata?: Readonly<Record<string, string>>;
}
