/**
 * Bulgu şablon kayıt girişi tipi.
 */

import type { AnalysisFindingSeverity } from '../models/AnalysisFinding';

export interface FindingTemplateDefinition {
  code: string;
  title: string;
  description: string;
  defaultSeverity: AnalysisFindingSeverity;
  version: string;
}
