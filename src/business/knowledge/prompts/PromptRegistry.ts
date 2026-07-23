/**
 * İSTEBUL Business — prompt anahtar kayıtları (statik).
 *
 * Henüz prompt metni yazılmaz.
 * Yalnızca Report DNA ve gelecek AI katmanının kullanacağı anahtarlar tutulur.
 */

import type { PromptKey, PromptRegistryEntry } from './PromptDefinition';

export const PROMPT_REGISTRY: readonly PromptRegistryEntry[] = Object.freeze([
  Object.freeze({
    key: 'inventory-analysis',
    name: 'Envanter Analizi',
    description: 'Envanter sayımı ve stok doğruluğu analiz prompt anahtarı.',
    version: '0.1.0'
  }),
  Object.freeze({
    key: 'blind-count-analysis',
    name: 'Kör Sayım Analizi',
    description: 'Kör sayım fark ve doğrulama analiz prompt anahtarı.',
    version: '0.1.0'
  }),
  Object.freeze({
    key: 'budget-analysis',
    name: 'Bütçe Analizi',
    description: 'Bütçe sapma ve plan/gerçekleşen analiz prompt anahtarı.',
    version: '0.1.0'
  }),
  Object.freeze({
    key: 'cashflow-analysis',
    name: 'Nakit Akışı Analizi',
    description: 'Nakit giriş-çıkış ve likidite analiz prompt anahtarı.',
    version: '0.1.0'
  }),
  Object.freeze({
    key: 'income-expense-analysis',
    name: 'Gelir Gider Analizi',
    description: 'Gelir-gider dengesi analiz prompt anahtarı.',
    version: '0.1.0'
  }),
  Object.freeze({
    key: 'sales-performance-analysis',
    name: 'Satış Performansı Analizi',
    description: 'Satış hedef ve gerçekleşme analiz prompt anahtarı.',
    version: '0.1.0'
  }),
  Object.freeze({
    key: 'personnel-analysis',
    name: 'Personel Analizi',
    description: 'Personel performans ve verimlilik analiz prompt anahtarı.',
    version: '0.1.0'
  }),
  Object.freeze({
    key: 'vehicle-cost-analysis',
    name: 'Araç Maliyet Analizi',
    description: 'Filo / araç maliyet analiz prompt anahtarı.',
    version: '0.1.0'
  }),
  Object.freeze({
    key: 'risk-analysis',
    name: 'Risk Analizi',
    description: 'Operasyonel ve finansal risk analiz prompt anahtarı.',
    version: '0.1.0'
  }),
  Object.freeze({
    key: 'swot-analysis',
    name: 'SWOT Analizi',
    description: 'Güçlü/zayıf yön, fırsat ve tehdit analiz prompt anahtarı.',
    version: '0.1.0'
  }),
  Object.freeze({
    key: 'executive-summary',
    name: 'Yönetici Özeti',
    description: 'Üst yönetim için özet karar destek prompt anahtarı.',
    version: '0.1.0'
  })
]);

export function getPromptByKey(
  key: PromptKey
): PromptRegistryEntry | undefined {
  return PROMPT_REGISTRY.find((entry) => entry.key === key);
}

export function listPromptKeys(): readonly PromptKey[] {
  return PROMPT_REGISTRY.map((entry) => entry.key);
}

export const PROMPT_COUNT = PROMPT_REGISTRY.length;

export default PROMPT_REGISTRY;
