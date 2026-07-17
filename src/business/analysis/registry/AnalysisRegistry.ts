/**
 * İSTEBUL Business Analysis Engine — analiz profil kayıt sistemi.
 *
 * Henüz analiz profili eklenmez.
 */

export interface AnalysisDefinitionEntry {
  id: string;
  name: string;
  description: string;
  reportId?: string;
  version: string;
}

const ANALYSES: AnalysisDefinitionEntry[] = [];

export const ANALYSIS_REGISTRY: readonly AnalysisDefinitionEntry[] =
  Object.freeze(ANALYSES);

export function listAnalyses(): readonly AnalysisDefinitionEntry[] {
  return ANALYSIS_REGISTRY;
}

export function getAnalysisById(
  id: string
): AnalysisDefinitionEntry | undefined {
  return ANALYSIS_REGISTRY.find((entry) => entry.id === id);
}

export const ANALYSIS_REGISTRY_COUNT = ANALYSIS_REGISTRY.length;

export default ANALYSIS_REGISTRY;
