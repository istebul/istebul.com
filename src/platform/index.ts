/**
 * İSTEBUL Platform Shell — genel dışa aktarım yüzeyi.
 *
 * PR-002: Kimlik / ürün veri katmanı.
 * PR-567: URL haritası + chrome IA fasadı + iç-link sözleşmesi (cutover aktif değil).
 */

export type {
  PlatformIdentity,
  PlatformProduct,
  PlatformProductId,
  PlatformProductStatus,
  PlatformProductVisibility
} from './types/platform-product.ts';

export type {
  PlatformChromeLink,
  PlatformSurfaceUrlKey,
  PlatformUrlEntry,
  PlatformUrlMapKey,
  PlatformUrlPhase
} from './types/platform-url.ts';

export {
  PLATFORM_PRODUCTS,
  getPlatformProductById,
  listVisiblePlatformProducts
} from './constants/platform-products.ts';

export {
  PLATFORM_PRODUCT_STATUS_LABELS,
  getPlatformProductStatusLabel,
  getPlatformProductStatusTone
} from './constants/platform-product-status.ts';

export {
  PLATFORM_PRODUCT_URLS,
  PLATFORM_SURFACE_URLS,
  PLATFORM_URL_MAP,
  PLATFORM_URL_ACTIVE_PHASE,
  getPlatformProductUrl,
  getPlatformSurfaceUrl,
  getPlatformUrl,
  listPlatformUrlCutoverDeltas
} from './constants/platform-url-map.ts';

export {
  PLATFORM_NAV_PRODUCT_LINKS_CURRENT,
  PLATFORM_NAV_PRODUCT_LINKS_TARGET,
  PLATFORM_FOOTER_PRODUCT_LINKS_CURRENT,
  PLATFORM_FOOTER_PRODUCT_LINKS_TARGET,
  PLATFORM_NAV_CATEGORY_LINKS_CURRENT
} from './constants/platform-nav-footer-ia.ts';

export {
  PLATFORM_INTERNAL_LINK_BINDINGS,
  PLATFORM_INTERNAL_LINK_CONTRACT,
  PLATFORM_INTERNAL_LINK_PHASE
} from './constants/platform-internal-links.ts';

export { PLATFORM_IDENTITY, PLATFORM_CATALOG } from './config/platform-identity.ts';
