/**
 * Export şablon kayıt sistemi — henüz içerik yok.
 *
 * Report `TemplateRegistryBridge` ile karışmaması için
 * dışa aktarım adı `EXPORT_TEMPLATE_REGISTRY`dır.
 */

import type { TemplateDefinitionEntry } from '../templates/TemplateContract';

const TEMPLATES: TemplateDefinitionEntry[] = [];

export const EXPORT_TEMPLATE_REGISTRY: readonly TemplateDefinitionEntry[] =
  Object.freeze(TEMPLATES);

export function listExportTemplates(): readonly TemplateDefinitionEntry[] {
  return EXPORT_TEMPLATE_REGISTRY;
}

export function getExportTemplateById(
  id: string
): TemplateDefinitionEntry | undefined {
  return EXPORT_TEMPLATE_REGISTRY.find((entry) => entry.id === id);
}

export const EXPORT_TEMPLATE_REGISTRY_COUNT = EXPORT_TEMPLATE_REGISTRY.length;

export default EXPORT_TEMPLATE_REGISTRY;
