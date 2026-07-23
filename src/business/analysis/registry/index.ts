/**
 * Registry dışa aktarımları.
 */

export type { AnalysisDefinitionEntry } from './AnalysisRegistry';
export {
  ANALYSIS_REGISTRY,
  ANALYSIS_REGISTRY_COUNT,
  getAnalysisById,
  listAnalyses
} from './AnalysisRegistry';

export {
  RULE_REGISTRY,
  RULE_REGISTRY_COUNT,
  getRuleById,
  listRules
} from './RuleRegistry';

export type { FindingTemplateDefinition } from './FindingRegistryTypes';
export {
  FINDING_REGISTRY,
  FINDING_REGISTRY_COUNT,
  getFindingTemplateByCode,
  listFindingTemplates
} from './FindingRegistry';

export {
  KPI_REGISTRY_BRIDGE,
  KPI_REGISTRY_BRIDGE_COUNT,
  getBridgedKPIById,
  listBridgedKPIs,
  listBridgedKPIsByCategory
} from './KPIRegistryBridge';
export type { KPIDefinition } from './KPIRegistryBridge';

export const ANALYSIS_REGISTRY_STRUCTURE_COUNT = 4;
