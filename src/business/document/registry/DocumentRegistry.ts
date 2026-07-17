/**
 * Doküman profil kayıt sistemi — henüz içerik yok.
 */

import type { DocumentProfileDefinition } from './DocumentRegistryTypes';

const PROFILES: DocumentProfileDefinition[] = [];

export const DOCUMENT_PROFILE_REGISTRY: readonly DocumentProfileDefinition[] =
  Object.freeze(PROFILES);

export function listDocumentProfiles(): readonly DocumentProfileDefinition[] {
  return DOCUMENT_PROFILE_REGISTRY;
}

export function getDocumentProfileById(
  id: string
): DocumentProfileDefinition | undefined {
  return DOCUMENT_PROFILE_REGISTRY.find((entry) => entry.id === id);
}

export const DOCUMENT_PROFILE_REGISTRY_COUNT = DOCUMENT_PROFILE_REGISTRY.length;

export default DOCUMENT_PROFILE_REGISTRY;
