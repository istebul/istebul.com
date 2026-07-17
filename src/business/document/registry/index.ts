/**
 * Registry dışa aktarımları.
 */

export type { DocumentProfileDefinition } from './DocumentRegistryTypes';
export {
  DOCUMENT_PROFILE_REGISTRY,
  DOCUMENT_PROFILE_REGISTRY_COUNT,
  getDocumentProfileById,
  listDocumentProfiles
} from './DocumentRegistry';

export {
  LAYOUT_REGISTRY,
  LAYOUT_REGISTRY_COUNT,
  getLayoutById,
  listLayouts
} from './LayoutRegistry';

export {
  STYLE_REGISTRY,
  STYLE_REGISTRY_COUNT,
  getStyleById,
  listStyles
} from './StyleRegistry';

export {
  THEME_REGISTRY,
  THEME_REGISTRY_COUNT,
  getThemeById,
  listThemes
} from './ThemeRegistry';

export const DOCUMENT_REGISTRY_STRUCTURE_COUNT = 4;
