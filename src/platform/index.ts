/**
 * İSTEBUL Platform Shell — genel dışa aktarım yüzeyi.
 *
 * PR-002: Yalnızca kimlik / ürün veri katmanı dışa aktarılır.
 * `wiredToRuntime: false` — hiçbir HTML, route, bundle veya ürün modülü
 * bu giriş noktasını henüz import etmemelidir.
 */

export type {
  PlatformIdentity,
  PlatformProduct,
  PlatformProductId,
  PlatformProductStatus,
  PlatformProductVisibility
} from './types/platform-product.ts';

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

export { PLATFORM_IDENTITY, PLATFORM_CATALOG } from './config/platform-identity.ts';
