/**
 * Yerleşim kayıt sistemi — henüz içerik yok.
 */

import type { LayoutDefinitionEntry } from '../layouts/LayoutContract';

const LAYOUTS: LayoutDefinitionEntry[] = [];

export const LAYOUT_REGISTRY: readonly LayoutDefinitionEntry[] =
  Object.freeze(LAYOUTS);

export function listLayouts(): readonly LayoutDefinitionEntry[] {
  return LAYOUT_REGISTRY;
}

export function getLayoutById(
  id: string
): LayoutDefinitionEntry | undefined {
  return LAYOUT_REGISTRY.find((entry) => entry.id === id);
}

export const LAYOUT_REGISTRY_COUNT = LAYOUT_REGISTRY.length;

export default LAYOUT_REGISTRY;
