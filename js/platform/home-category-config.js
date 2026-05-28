/**
 * Homepage decision categories — single source for card status and routing.
 * status: 'active' | 'coming_soon'
 */
export const HOME_DECISION_CATEGORIES = [
  {
    id: 'otomobil',
    name: 'Araç Karar Asistanı',
    description: 'Kredi, yakıt, sigorta ve bakım dahil toplam sahip olma maliyetini analiz edin.',
    status: 'active',
    href: '/auto/',
    icon: 'car',
    sampleScore: 89,
    ctaLabel: 'Aracını Analiz Et',
    insight: 'Kredi & finansman + yakıt + sigorta + bakım + ikinci el değeri',
    theme: 'auto',
    settingKey: 'home_category_auto_enabled',
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
    name: 'Tatil Karar Asistanı',
    description: 'Bütçe, sezon yoğunluğu ve tatil uyum skorunu birlikte değerlendirin.',
    status: 'active',
    href: '/tatil/',
    icon: 'palmtree',
    sampleScore: 81,
    ctaLabel: 'Tatilini Planla',
    insight: 'Bütçe + sezon + deneyim skoru + toplam maliyet',
    theme: 'tatil',
    settingKey: 'home_category_tatil_enabled',
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
    name: 'Konut Karar Asistanı',
    description: 'Ev alırken toplam maliyet, lokasyon, kredi yükü ve riskleri birlikte analiz edin.',
    status: 'active',
    href: '/konut/',
    icon: 'home',
    sampleScore: 92,
    ctaLabel: 'Konut Analizi Başlat',
    insight: 'Mortgage + lokasyon + risk + yatırım + yaşam maliyeti',
    theme: 'konut',
    settingKey: 'home_category_konut_enabled',
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
    id: 'finans',
    name: 'Finans Karar Asistanı',
    description: 'Kredi, ödeme planı, toplam maliyet ve riskleri birlikte analiz edin.',
    status: 'active',
    href: '/finans/',
    icon: 'landmark',
    sampleScore: 88,
    ctaLabel: 'Finansını Analiz Et',
    insight: 'Aylık ödeme + nakit akışı + risk + borç/gelir oranı',
    theme: 'finans',
    settingKey: 'home_category_finans_enabled',
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
    description: 'Kapsam, prim ve risk dengesi analizi — yakında.',
    status: 'coming_soon',
    href: null,
    icon: 'shield',
    sampleScore: null,
    theme: 'sigorta'
  }
];

export function isHomeCategoryActive(category) {
  return category?.status === 'active' && Boolean(category?.href);
}
