/**
 * İSTEBUL Business — KPI tip sözleşmeleri.
 *
 * Bu dosya yalnızca veri modeli tanımlar.
 * Hesaplama motoru veya iş mantığı içermez.
 */

import type { BusinessCategoryId } from '../categories/CategoryDefinition';

/**
 * KPI hesaplama tipi.
 *
 * | Teknik | Türkçe |
 * |--------|--------|
 * | oran | Oran |
 * | toplam | Toplam |
 * | ortalama | Ortalama |
 * | fark | Fark |
 * | buyume | Büyüme |
 * | skor | Skor |
 * | adet | Adet |
 */
export type KPICalculationType =
  | 'oran'
  | 'toplam'
  | 'ortalama'
  | 'fark'
  | 'buyume'
  | 'skor'
  | 'adet';

/**
 * Tek bir KPI tanımı.
 *
 * Alan sözlüğü (TR):
 * - id → Kimlik
 * - name → Ad
 * - description → Açıklama
 * - calculationType → Hesaplama tipi
 * - unit → Birim
 * - category → Kategori
 * - colorHint → Renk önerisi
 * - priority → Öncelik
 */
export interface KPIDefinition {
  /** Kimlik — kararlı teknik anahtar */
  id: string;
  /** Ad — kullanıcıya görünen Türkçe KPI adı */
  name: string;
  /** Açıklama — KPI’nın neyi ölçtüğü */
  description: string;
  /** Hesaplama tipi — oran, toplam, ortalama vb. */
  calculationType: KPICalculationType;
  /** Birim — %, TL, adet, puan vb. */
  unit: string;
  /** Kategori — Business kategori kimliği */
  category: BusinessCategoryId;
  /** Renk önerisi — `#RRGGBB` veya tasarım jetonu */
  colorHint: string;
  /** Öncelik — 1 en yüksek */
  priority: number;
}
