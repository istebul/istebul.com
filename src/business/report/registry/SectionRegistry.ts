/**
 * Bölüm kayıt sistemi — henüz içerik yok.
 */

import type { SectionTemplateDefinition } from '../sections/SectionContract';

const SECTIONS: SectionTemplateDefinition[] = [];

export const SECTION_REGISTRY: readonly SectionTemplateDefinition[] =
  Object.freeze(SECTIONS);

export function listSectionTemplates(): readonly SectionTemplateDefinition[] {
  return SECTION_REGISTRY;
}

export function getSectionTemplateByCode(
  code: string
): SectionTemplateDefinition | undefined {
  return SECTION_REGISTRY.find((entry) => entry.sectionCode === code);
}

export const SECTION_REGISTRY_COUNT = SECTION_REGISTRY.length;

export default SECTION_REGISTRY;
