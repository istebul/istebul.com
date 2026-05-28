/**
 * Homepage decision categories — single source for card status and routing.
 * status: 'active' | 'coming_soon'
 */
export const HOME_CATEGORY_PILLARS = [
  'Karar skoru',
  'Toplam maliyet',
  'Risk analizi',
  'Sonraki adım'
];

export const HOME_DECISION_CATEGORIES = [
  {
    id: 'otomobil',
    name: 'Araç',
    description: 'TCO, finansman ve risk — tam araç karar analizi.',
    status: 'active',
    href: '/auto/',
    icon: 'car',
    sampleScore: 89,
    ctaLabel: 'Analiz et',
    insight: 'Karar skoru · Toplam maliyet · Risk · Sonraki adım',
    theme: 'auto'
  },
  {
    id: 'konut',
    name: 'Konut',
    description: 'Aidat, ipotek ve toplam sahip olma maliyeti analizi.',
    status: 'active',
    href: '/konut/',
    icon: 'home',
    sampleScore: 84,
    ctaLabel: 'Konut analizine git',
    insight: 'Karar skoru · Toplam maliyet · Risk · Sonraki adım',
    theme: 'konut'
  },
  {
    id: 'tatil',
    name: 'Tatil',
    description: 'Bütçe, tarih ve aile yapısına göre tatil karar analizi.',
    status: 'active',
    href: '/tatil/',
    icon: 'palmtree',
    sampleScore: 86,
    ctaLabel: 'Planlamaya başla',
    insight: 'Karar skoru · Toplam maliyet · Risk · Sonraki adım',
    theme: 'tatil'
  },
  {
    id: 'finans',
    name: 'Finansman',
    description: 'Kredi senaryoları, nakit akışı ve finansman yükü karşılaştırması.',
    status: 'active',
    href: '/finans/',
    icon: 'landmark',
    sampleScore: 82,
    ctaLabel: 'Finansman analizine git',
    insight: 'Karar skoru · Toplam maliyet · Risk · Sonraki adım',
    theme: 'finans'
  },
  {
    id: 'sigorta',
    name: 'Sigorta',
    description: 'Kapsam, prim ve risk dengesi — erken erişim listesine katılın.',
    status: 'coming_soon',
    href: null,
    icon: 'shield',
    sampleScore: null,
    theme: 'sigorta'
  },
  {
    id: 'kasko',
    name: 'Kasko',
    description: 'Kasko primi ve teminat karşılaştırması — erken erişim yakında.',
    status: 'coming_soon',
    href: null,
    icon: 'shield-check',
    sampleScore: null,
    theme: 'kasko'
  }
];

export function isHomeCategoryActive(category) {
  return category?.status === 'active' && Boolean(category?.href);
}

export function getHomeCategoriesByStatus(status) {
  return HOME_DECISION_CATEGORIES.filter((c) => c.status === status);
}
