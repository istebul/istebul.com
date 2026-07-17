/**
 * Stil kayıt sistemi — henüz içerik yok.
 */

import type { StyleDefinitionEntry } from '../styles/StyleContract';

const STYLES: StyleDefinitionEntry[] = [];

export const STYLE_REGISTRY: readonly StyleDefinitionEntry[] =
  Object.freeze(STYLES);

export function listStyles(): readonly StyleDefinitionEntry[] {
  return STYLE_REGISTRY;
}

export function getStyleById(id: string): StyleDefinitionEntry | undefined {
  return STYLE_REGISTRY.find((entry) => entry.id === id);
}

export const STYLE_REGISTRY_COUNT = STYLE_REGISTRY.length;

export default STYLE_REGISTRY;
