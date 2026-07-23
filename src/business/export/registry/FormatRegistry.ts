/**
 * Format kayıt sistemi — henüz içerik yok.
 *
 * Knowledge `OUTPUT_REGISTRY` ile hizalanacak; bu PR’da boş tutulur.
 */

import type { FormatDefinitionEntry } from '../formats/FormatContract';

const FORMATS: FormatDefinitionEntry[] = [];

export const EXPORT_FORMAT_REGISTRY: readonly FormatDefinitionEntry[] =
  Object.freeze(FORMATS);

export function listExportFormats(): readonly FormatDefinitionEntry[] {
  return EXPORT_FORMAT_REGISTRY;
}

export function getExportFormatById(
  id: FormatDefinitionEntry['id']
): FormatDefinitionEntry | undefined {
  return EXPORT_FORMAT_REGISTRY.find((entry) => entry.id === id);
}

export const EXPORT_FORMAT_REGISTRY_COUNT = EXPORT_FORMAT_REGISTRY.length;

export default EXPORT_FORMAT_REGISTRY;
