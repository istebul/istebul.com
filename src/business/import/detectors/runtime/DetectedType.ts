/**
 * İSTEBUL Business Import Engine — DetectedType (PR-101D).
 *
 * BusinessColumnDataType ile hizalı; tespit için bilinmeyen/karışık eklenir.
 */

import type { BusinessColumnDataType } from '../../../dataset/models/BusinessColumn';

/**
 * Tespit edilen ilkel / yapısal tip.
 */
export type DetectedType =
  | BusinessColumnDataType
  | 'bilinmeyen'
  | 'karisik';

export const DETECTED_TYPE_LABELS: Readonly<Record<DetectedType, string>> =
  Object.freeze({
    metin: 'Metin',
    sayi: 'Sayı',
    tamsayi: 'Tamsayı',
    para: 'Para',
    yuzde: 'Yüzde',
    tarih: 'Tarih',
    'tarih-saat': 'Tarih-Saat',
    mantiksal: 'Mantıksal',
    json: 'JSON',
    kimlik: 'Kimlik',
    bilinmeyen: 'Bilinmeyen',
    karisik: 'Karışık'
  });

export function isDetectedType(value: string): value is DetectedType {
  return Object.prototype.hasOwnProperty.call(DETECTED_TYPE_LABELS, value);
}
