/**
 * İSTEBUL Business — kategori kayıtları (statik).
 *
 * Yeni kategori eklemek için bu listeye tanım eklenir.
 * Çalışma zamanı iş mantığı yoktur.
 */

import type { BusinessCategoryId, CategoryDefinition } from './CategoryDefinition';

/**
 * İlk kategori listesi — fonksiyonel + sektörel.
 */
export const CATEGORY_REGISTRY: readonly CategoryDefinition[] = Object.freeze([
  Object.freeze({
    id: 'finans',
    name: 'Finans',
    description: 'Nakit, bütçe, maliyet ve finansal performans analizleri.',
    kind: 'fonksiyonel',
    icon: 'wallet',
    order: 1
  }),
  Object.freeze({
    id: 'muhasebe',
    name: 'Muhasebe',
    description: 'Gelir-gider, mizan ve muhasebe özet raporları.',
    kind: 'fonksiyonel',
    icon: 'calculator',
    order: 2
  }),
  Object.freeze({
    id: 'depo',
    name: 'Depo',
    description: 'Depo operasyonları, yerleşim ve sayım süreçleri.',
    kind: 'fonksiyonel',
    icon: 'warehouse',
    order: 3
  }),
  Object.freeze({
    id: 'stok',
    name: 'Stok',
    description: 'Envanter doğruluğu, stok seviyeleri ve fark analizi.',
    kind: 'fonksiyonel',
    icon: 'package',
    order: 4
  }),
  Object.freeze({
    id: 'lojistik',
    name: 'Lojistik',
    description: 'Taşıma, dağıtım ve araç maliyet izleme.',
    kind: 'fonksiyonel',
    icon: 'truck',
    order: 5
  }),
  Object.freeze({
    id: 'insan-kaynaklari',
    name: 'İnsan Kaynakları',
    description: 'Personel performansı, verimlilik ve İK göstergeleri.',
    kind: 'fonksiyonel',
    icon: 'users',
    order: 6
  }),
  Object.freeze({
    id: 'uretim',
    name: 'Üretim',
    description: 'Üretim çıktısı, kapasite ve verimlilik analizleri.',
    kind: 'fonksiyonel',
    icon: 'factory',
    order: 7
  }),
  Object.freeze({
    id: 'satin-alma',
    name: 'Satın Alma',
    description: 'Tedarik, sipariş ve satın alma performansı.',
    kind: 'fonksiyonel',
    icon: 'shopping-cart',
    order: 8
  }),
  Object.freeze({
    id: 'satis',
    name: 'Satış',
    description: 'Satış performansı, büyüme ve hedef takibi.',
    kind: 'fonksiyonel',
    icon: 'trending-up',
    order: 9
  }),
  Object.freeze({
    id: 'crm',
    name: 'CRM',
    description: 'Müşteri ilişkileri, pipeline ve etkileşim özetleri.',
    kind: 'fonksiyonel',
    icon: 'contact',
    order: 10
  }),
  Object.freeze({
    id: 'kalite',
    name: 'Kalite',
    description: 'Kalite kontrol, uygunsuzluk ve iyileştirme göstergeleri.',
    kind: 'fonksiyonel',
    icon: 'badge-check',
    order: 11
  }),
  Object.freeze({
    id: 'isg',
    name: 'İSG',
    description: 'İş sağlığı ve güvenliği risk / olay göstergeleri.',
    kind: 'fonksiyonel',
    icon: 'shield',
    order: 12
  }),
  Object.freeze({
    id: 'yonetim',
    name: 'Yönetim',
    description: 'Yönetici özeti, SWOT ve stratejik karar destek raporları.',
    kind: 'fonksiyonel',
    icon: 'briefcase',
    order: 13
  }),
  Object.freeze({
    id: 'denetim',
    name: 'Denetim',
    description: 'İç kontrol, uyum ve denetim bulguları.',
    kind: 'fonksiyonel',
    icon: 'clipboard-check',
    order: 14
  }),
  Object.freeze({
    id: 'restoran',
    name: 'Restoran',
    description: 'Restoran işletmelerine özel operasyon ve maliyet raporları.',
    kind: 'sektorel',
    icon: 'utensils',
    order: 15
  }),
  Object.freeze({
    id: 'kafe',
    name: 'Kafe',
    description: 'Kafe işletmelerine özel satış ve stok raporları.',
    kind: 'sektorel',
    icon: 'coffee',
    order: 16
  }),
  Object.freeze({
    id: 'otel',
    name: 'Otel',
    description: 'Konaklama doluluk, gelir ve operasyon raporları.',
    kind: 'sektorel',
    icon: 'hotel',
    order: 17
  }),
  Object.freeze({
    id: 'e-ticaret',
    name: 'E-Ticaret',
    description: 'Online satış, sepet ve lojistik performans raporları.',
    kind: 'sektorel',
    icon: 'store',
    order: 18
  }),
  Object.freeze({
    id: 'tarim',
    name: 'Tarım',
    description: 'Tarım işletmeleri için üretim ve maliyet raporları.',
    kind: 'sektorel',
    icon: 'sprout',
    order: 19
  }),
  Object.freeze({
    id: 'insaat',
    name: 'İnşaat',
    description: 'İnşaat projeleri için maliyet, risk ve ilerleme raporları.',
    kind: 'sektorel',
    icon: 'hard-hat',
    order: 20
  }),
  Object.freeze({
    id: 'enerji',
    name: 'Enerji',
    description: 'Enerji tüketimi, maliyet ve verimlilik raporları.',
    kind: 'sektorel',
    icon: 'zap',
    order: 21
  })
]);

export function getCategoryById(
  id: BusinessCategoryId
): CategoryDefinition | undefined {
  return CATEGORY_REGISTRY.find((category) => category.id === id);
}

export function listCategories(): readonly CategoryDefinition[] {
  return CATEGORY_REGISTRY;
}

export const CATEGORY_COUNT = CATEGORY_REGISTRY.length;

export default CATEGORY_REGISTRY;
