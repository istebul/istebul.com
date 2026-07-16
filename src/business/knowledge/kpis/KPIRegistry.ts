/**
 * İSTEBUL Business — KPI kayıtları (statik örnekler).
 *
 * Hesaplama motoru yoktur; yalnızca örnek KPI tanımları tutulur.
 */

import type { KPIDefinition } from './KPIDefinition';

export const KPI_REGISTRY: readonly KPIDefinition[] = Object.freeze([
  Object.freeze({
    id: 'stok-dogruluk-orani',
    name: 'Stok Doğruluk Oranı',
    description: 'Sayılan stok ile sistem stoku arasındaki uyum oranı.',
    calculationType: 'oran',
    unit: '%',
    category: 'stok',
    colorHint: '#0f766e',
    priority: 1
  }),
  Object.freeze({
    id: 'sayim-fark-orani',
    name: 'Sayım Fark Oranı',
    description: 'Kör sayımda tespit edilen farkların toplam stoka oranı.',
    calculationType: 'oran',
    unit: '%',
    category: 'depo',
    colorHint: '#b45309',
    priority: 1
  }),
  Object.freeze({
    id: 'butce-sapma-orani',
    name: 'Bütçe Sapma Oranı',
    description: 'Planlanan bütçe ile gerçekleşen tutar arasındaki sapma.',
    calculationType: 'oran',
    unit: '%',
    category: 'finans',
    colorHint: '#1d4ed8',
    priority: 1
  }),
  Object.freeze({
    id: 'nakit-oran',
    name: 'Nakit Oranı',
    description: 'Kısa vadeli yükümlülüklere karşı nakit karşılama gücü.',
    calculationType: 'oran',
    unit: 'x',
    category: 'finans',
    colorHint: '#0369a1',
    priority: 2
  }),
  Object.freeze({
    id: 'net-nakit-akisi',
    name: 'Net Nakit Akışı',
    description: 'Dönem içi net nakit giriş / çıkış tutarı.',
    calculationType: 'toplam',
    unit: 'TL',
    category: 'finans',
    colorHint: '#047857',
    priority: 1
  }),
  Object.freeze({
    id: 'gelir-gider-orani',
    name: 'Gelir / Gider Oranı',
    description: 'Toplam gelirin toplam gidere oranı.',
    calculationType: 'oran',
    unit: 'x',
    category: 'muhasebe',
    colorHint: '#4f46e5',
    priority: 1
  }),
  Object.freeze({
    id: 'brut-kar-marji',
    name: 'Brüt Kâr Marjı',
    description: 'Brüt kârın gelire oranı.',
    calculationType: 'oran',
    unit: '%',
    category: 'muhasebe',
    colorHint: '#15803d',
    priority: 2
  }),
  Object.freeze({
    id: 'satis-buyume-orani',
    name: 'Satış Büyüme Oranı',
    description: 'Önceki döneme göre satış tutarı değişimi.',
    calculationType: 'buyume',
    unit: '%',
    category: 'satis',
    colorHint: '#c2410c',
    priority: 1
  }),
  Object.freeze({
    id: 'hedef-gerceklesme-orani',
    name: 'Hedef Gerçekleşme Oranı',
    description: 'Satış hedefinin gerçekleşme yüzdesi.',
    calculationType: 'oran',
    unit: '%',
    category: 'satis',
    colorHint: '#ea580c',
    priority: 1
  }),
  Object.freeze({
    id: 'personel-verimlilik-skoru',
    name: 'Personel Verimlilik Skoru',
    description: 'Çıktı / işgücü temelli birleşik verimlilik skoru.',
    calculationType: 'skor',
    unit: 'puan',
    category: 'insan-kaynaklari',
    colorHint: '#7c3aed',
    priority: 1
  }),
  Object.freeze({
    id: 'kisi-basi-maliyet',
    name: 'Kişi Başı Maliyet',
    description: 'Dönem personel maliyetinin çalışan sayısına oranı.',
    calculationType: 'ortalama',
    unit: 'TL',
    category: 'insan-kaynaklari',
    colorHint: '#6d28d9',
    priority: 2
  }),
  Object.freeze({
    id: 'arac-birim-maliyet',
    name: 'Araç Birim Maliyeti',
    description: 'Araç başına ortalama işletme maliyeti.',
    calculationType: 'ortalama',
    unit: 'TL',
    category: 'lojistik',
    colorHint: '#0e7490',
    priority: 1
  }),
  Object.freeze({
    id: 'risk-skoru',
    name: 'Risk Skoru',
    description: 'Tanımlı risk faktörlerinden üretilen birleşik risk skoru.',
    calculationType: 'skor',
    unit: 'puan',
    category: 'denetim',
    colorHint: '#b91c1c',
    priority: 1
  }),
  Object.freeze({
    id: 'yuksek-risk-adet',
    name: 'Yüksek Risk Adedi',
    description: 'Yüksek öncelikli risk kayıtlarının sayısı.',
    calculationType: 'adet',
    unit: 'adet',
    category: 'denetim',
    colorHint: '#dc2626',
    priority: 2
  }),
  Object.freeze({
    id: 'swot-firsat-sayisi',
    name: 'SWOT Fırsat Sayısı',
    description: 'SWOT analizinde tanımlanan fırsat maddesi adedi.',
    calculationType: 'adet',
    unit: 'adet',
    category: 'yonetim',
    colorHint: '#16a34a',
    priority: 3
  }),
  Object.freeze({
    id: 'yonetici-ozet-skoru',
    name: 'Yönetici Özet Skoru',
    description: 'Üst yönetim özetinde kullanılan birleşik sağlık skoru.',
    calculationType: 'skor',
    unit: 'puan',
    category: 'yonetim',
    colorHint: '#1e40af',
    priority: 1
  })
]);

export function getKPIById(id: string): KPIDefinition | undefined {
  return KPI_REGISTRY.find((kpi) => kpi.id === id);
}

export function listKPIs(): readonly KPIDefinition[] {
  return KPI_REGISTRY;
}

export function listKPIsByCategory(
  category: KPIDefinition['category']
): readonly KPIDefinition[] {
  return KPI_REGISTRY.filter((kpi) => kpi.category === category);
}

export const KPI_COUNT = KPI_REGISTRY.length;

export default KPI_REGISTRY;
