/**
 * Export profil kayıt sistemi — henüz içerik yok.
 */

import type { ExportProfileDefinition } from './ExportRegistryTypes';

const PROFILES: ExportProfileDefinition[] = [];

export const EXPORT_PROFILE_REGISTRY: readonly ExportProfileDefinition[] =
  Object.freeze(PROFILES);

export function listExportProfiles(): readonly ExportProfileDefinition[] {
  return EXPORT_PROFILE_REGISTRY;
}

export function getExportProfileById(
  id: string
): ExportProfileDefinition | undefined {
  return EXPORT_PROFILE_REGISTRY.find((entry) => entry.id === id);
}

export const EXPORT_PROFILE_REGISTRY_COUNT = EXPORT_PROFILE_REGISTRY.length;

export default EXPORT_PROFILE_REGISTRY;
