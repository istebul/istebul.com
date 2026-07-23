/**
 * Artifact şablon / tip kayıt sistemi — henüz içerik yok.
 */

import type { OutputFormatId } from '../../knowledge/outputs/OutputDefinition';

export interface ArtifactDefinitionEntry {
  id: string;
  name: string;
  description: string;
  formatId: OutputFormatId;
  version: string;
}

const ARTIFACTS: ArtifactDefinitionEntry[] = [];

export const EXPORT_ARTIFACT_REGISTRY: readonly ArtifactDefinitionEntry[] =
  Object.freeze(ARTIFACTS);

export function listArtifactDefinitions(): readonly ArtifactDefinitionEntry[] {
  return EXPORT_ARTIFACT_REGISTRY;
}

export function getArtifactDefinitionById(
  id: string
): ArtifactDefinitionEntry | undefined {
  return EXPORT_ARTIFACT_REGISTRY.find((entry) => entry.id === id);
}

export const EXPORT_ARTIFACT_REGISTRY_COUNT = EXPORT_ARTIFACT_REGISTRY.length;

export default EXPORT_ARTIFACT_REGISTRY;
