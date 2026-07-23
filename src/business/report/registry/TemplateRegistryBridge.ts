/**
 * Knowledge katmanına salt okunur şablon / DNA köprüsü.
 *
 * Knowledge dosyalarına yazmaz.
 */

import type { OutputDefinition } from '../../knowledge/outputs/OutputDefinition';
import type { ReportDefinition } from '../../knowledge/reports/ReportDefinition';
import {
  OUTPUT_REGISTRY,
  listOutputs
} from '../../knowledge/outputs/OutputRegistry';
import {
  REPORT_REGISTRY,
  getReportById as getKnowledgeReportById,
  listReports as listKnowledgeReports
} from '../../knowledge/reports/ReportRegistry';

export type { OutputDefinition, ReportDefinition };

export const TEMPLATE_REGISTRY_BRIDGE_OUTPUTS = OUTPUT_REGISTRY;

export const TEMPLATE_REGISTRY_BRIDGE_REPORT_DNA = REPORT_REGISTRY;

export {
  listOutputs as listBridgedOutputTemplates,
  listKnowledgeReports as listBridgedReportDna,
  getKnowledgeReportById as getBridgedReportDnaById
};

export const TEMPLATE_REGISTRY_BRIDGE_OUTPUT_COUNT = OUTPUT_REGISTRY.length;

export const TEMPLATE_REGISTRY_BRIDGE_REPORT_DNA_COUNT = REPORT_REGISTRY.length;

export default TEMPLATE_REGISTRY_BRIDGE_OUTPUTS;
