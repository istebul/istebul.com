/**
 * Homepage decision categories — single source for card status and routing.
 * status: 'active' | 'coming_soon'
 */
export const HOME_DECISION_CATEGORIES = [
  {
    id: 'araba',
    name: 'Araba',
    description: 'Araç kararında toplam maliyet, risk ve uygunluğu tek ekranda netleştirin.',
    status: 'active',
    href: '/auto/',
    icon: 'car',
    sampleScore: 89,
    ctaLabel: 'Araç analizini başlat',
    insight: 'Karar skoru, TCO, risk ve öneri özeti',
    theme: 'auto',
    settingKey: 'home_category_auto_enabled',
    totalCostLabel: 'Toplam maliyet',
    totalCostValue: '₺1.712.400 / 5 yıl',
    riskLabel: 'Risk seviyesi',
    riskValue: 'Orta-Düşük',
    aiRationale: 'Kredi yükü ve işletme giderleri bütçeyle dengeli görünüyor.',
    nextStep: 'Kredi senaryolarını karşılaştır',
    highlights: [
      'Kredi & finansman',
      'Yakıt tüketimi',
      'Sigorta & vergiler',
      'Bakım & onarım',
      'İkinci el değeri',
      'Toplam sahip olma maliyeti'
    ]
  },
  {
    id: 'tatil',
    name: 'Tatil',
    description: 'Tatil kararında bütçe, sezon riski ve deneyim uygunluğunu birlikte değerlendirin.',
    status: 'active',
    href: '/tatil/',
    icon: 'palmtree',
    sampleScore: 81,
    ctaLabel: 'Tatil analizini başlat',
    insight: 'Karar skoru, TCO, risk ve öneri özeti',
    theme: 'tatil',
    settingKey: 'home_category_tatil_enabled',
    totalCostLabel: 'Toplam maliyet',
    totalCostValue: '₺68.450 / plan',
    riskLabel: 'Risk seviyesi',
    riskValue: 'Orta',
    aiRationale: 'Sezon yoğunluğu artıyor; erken rezervasyon maliyet avantajı sağlıyor.',
    nextStep: 'Alternatif tarih senaryosu oluştur',
    highlights: [
      'Bütçe planlama',
      'Sezon yoğunluğu',
      'Aile & çocuk uyumu',
      'Uçuş + otel toplam maliyeti',
      'Tatil tipi analizi',
      'Deneyim skoru'
    ]
  },
  {
    id: 'konut',
    name: 'Konut',
    description: 'Konut kararında lokasyon, kredi yükü ve yaşam maliyetini birlikte analiz edin.',
    status: 'active',
    href: '/konut/',
    icon: 'home',
    sampleScore: 92,
    ctaLabel: 'Konut analizini başlat',
    insight: 'Karar skoru, TCO, risk ve öneri özeti',
    theme: 'konut',
    settingKey: 'home_category_konut_enabled',
    totalCostLabel: 'Toplam maliyet',
    totalCostValue: '₺22.850 / ay',
    riskLabel: 'Risk seviyesi',
    riskValue: 'Düşük',
    aiRationale: 'Lokasyon skoru ve ödeme konforu güçlü; yatırım potansiyeli dengeli.',
    nextStep: 'Deprem ve aidat kırılımını incele',
    highlights: [
      'Mortgage hesaplama',
      'Aidat & ek giderler',
      'Lokasyon riski',
      'Yatırım potansiyeli',
      'Kira getirisi',
      'Toplam yaşam maliyeti'
    ]
  },
  {
    id: 'finansman',
    name: 'Finansman',
    description: 'Finansman kararında ödeme planı, nakit akışı ve risk etkisini net görün.',
    status: 'active',
    href: '/finansman/',
    icon: 'landmark',
    sampleScore: 88,
    ctaLabel: 'Finansman analizini başlat',
    insight: 'Karar skoru, TCO, risk ve öneri özeti',
    theme: 'finans',
    settingKey: 'home_category_finans_enabled',
    totalCostLabel: 'Toplam maliyet',
    totalCostValue: '₺603.000 / vade',
    riskLabel: 'Risk seviyesi',
    riskValue: 'Düşük-Orta',
    aiRationale: 'Borç/gelir oranı kontrollü; mevcut taksit yapısı yönetilebilir seviyede.',
    nextStep: 'Vade-faiz alternatiflerini simüle et',
    highlights: [
      'Kredi & faiz oranları',
      'Aylık ödeme yükü',
      'Nakit akışı etkisi',
      'Risk skoru',
      'Borç/gelir oranı',
      'Finansal sağlık analizi'
    ]
  },
  {
    id: 'sigorta',
    name: 'Sigorta',
    description: 'Kapsam, prim ve risk dengesi için karşılaştırmalı analiz çok yakında.',
    status: 'coming_soon',
    href: '/sigorta/',
    icon: 'shield',
    sampleScore: null,
    ctaLabel: 'Bilgilendirme al',
    insight: 'Yakında',
    theme: 'sigorta',
    settingKey: 'home_category_sigorta_enabled'
  },
  {
    id: 'kasko',
    name: 'Kasko',
    description: 'Teminat, muafiyet ve prim dengesini optimize eden analiz çok yakında.',
    status: 'coming_soon',
    href: '/kasko/',
    icon: 'shield-plus',
    sampleScore: null,
    ctaLabel: 'Bilgilendirme al',
    insight: 'Yakında',
    theme: 'kasko',
    settingKey: 'home_category_kasko_enabled'
  }
];

export function isHomeCategoryActive(category) {
  return category?.status === 'active' && Boolean(category?.href);
}
