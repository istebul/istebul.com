/**
 * İSTEBUL Business Report Engine — rapor isteği.
 */

import type { OutputFormatId } from '../../knowledge/outputs/OutputDefinition';

/**
 * Report Engine girdisi — Decision Engine çıktısına referans.
 */
export interface ReportRequest {
  /** İstek kimliği */
  id: string;
  /** Kaynak karar isteği kimliği */
  decisionRequestId: string;
  /** Knowledge Report DNA kimliği */
  reportId: string;
  /** Dataset kimliği */
  datasetId: string;
  /** Hedef çıktı formatları — üretim sonraki PR */
  requestedOutputs?: readonly OutputFormatId[];
  /** Dil */
  locale?: 'tr' | 'en';
}
