/**
 * Tema kayıt sistemi — henüz içerik yok.
 */

import type { ThemeDefinitionEntry } from '../styles/StyleContract';

const THEMES: ThemeDefinitionEntry[] = [];

export const THEME_REGISTRY: readonly ThemeDefinitionEntry[] =
  Object.freeze(THEMES);

export function listThemes(): readonly ThemeDefinitionEntry[] {
  return THEME_REGISTRY;
}

export function getThemeById(id: string): ThemeDefinitionEntry | undefined {
  return THEME_REGISTRY.find((entry) => entry.id === id);
}

export const THEME_REGISTRY_COUNT = THEME_REGISTRY.length;

export default THEME_REGISTRY;
