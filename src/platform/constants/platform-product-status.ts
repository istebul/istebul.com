/**
 * Platform ürün durum rozeti — Türkçe etiket sözlüğü.
 * Yalnızca görünüm / kopya; yönlendirme veya iş kuralı yok.
 */

import type { PlatformProductStatus } from '../types/platform-product.ts';

/** Durum → kullanıcıya görünen Türkçe etiket. */
export const PLATFORM_PRODUCT_STATUS_LABELS: Readonly<
  Record<PlatformProductStatus, string>
> = Object.freeze({
  canli: 'Canlı',
  gelistirme: 'Canlı',
  yakinda: 'Yakında',
  beta: 'Beta',
  bakim: 'Bakım',
  kapali: 'Kapalı',
  'erken-erisim': 'Erken erişim'
});

/**
 * Kart / rozet CSS yardımcı sınıf kökü için durum anahtarı.
 * `erken-erisim` görsel olarak `yakinda` ailesine bağlanır.
 */
export function getPlatformProductStatusTone(
  status: PlatformProductStatus
): Exclude<PlatformProductStatus, 'erken-erisim'> {
  if (status === 'erken-erisim') return 'yakinda';
  return status;
}

export function getPlatformProductStatusLabel(
  status: PlatformProductStatus,
  overrideLabel?: string
): string {
  if (overrideLabel && overrideLabel.trim()) return overrideLabel.trim();
  return PLATFORM_PRODUCT_STATUS_LABELS[status];
}
