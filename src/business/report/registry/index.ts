/**
 * Registry dışa aktarımları.
 */

export type { ReportProfileDefinition } from './ReportRegistryTypes';
export {
  REPORT_PROFILE_REGISTRY,
  REPORT_PROFILE_REGISTRY_COUNT,
  getReportProfileById,
  listReportProfiles
} from './ReportRegistry';

export {
  SECTION_REGISTRY,
  SECTION_REGISTRY_COUNT,
  getSectionTemplateByCode,
  listSectionTemplates
} from './SectionRegistry';

export type { ReferenceTemplateDefinition } from './ReferenceRegistry';
export {
  REFERENCE_REGISTRY,
  REFERENCE_REGISTRY_COUNT,
  getReferenceTemplateByCode,
  listReferenceTemplates
} from './ReferenceRegistry';

export {
  TEMPLATE_REGISTRY_BRIDGE_OUTPUTS,
  TEMPLATE_REGISTRY_BRIDGE_REPORT_DNA,
  TEMPLATE_REGISTRY_BRIDGE_OUTPUT_COUNT,
  TEMPLATE_REGISTRY_BRIDGE_REPORT_DNA_COUNT,
  listBridgedOutputTemplates,
  listBridgedReportDna,
  getBridgedReportDnaById
} from './TemplateRegistryBridge';
export type {
  OutputDefinition,
  ReportDefinition
} from './TemplateRegistryBridge';

export const REPORT_REGISTRY_STRUCTURE_COUNT = 4;
