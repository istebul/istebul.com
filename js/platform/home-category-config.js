/**
 * Homepage decision categories — single source for card status and routing.
 * status: 'active' | 'coming_soon'
 */
export const HOME_DECISION_CATEGORIES = [
  {
    id: 'otomobil',
    name: 'Otomobil',
    description: 'TCO, finansman, risk ve AI gerekçe — tam araç karar analizi.',
    status: 'active',
    href: '/auto/',
    icon: 'car',
    sampleScore: 89,
    ctaLabel: 'Analiz Et',
    insight: 'Toplam maliyet + uygunluk + risk analizi',
    theme: 'auto'
  },
  {
    id: 'tatil',
    name: 'Tatil',
    description: 'Travel Decision Intelligence: bütçe, tarih ve aile yapısına göre karar analizi.',
    status: 'active',
    href: '/tatil/',
    icon: 'palmtree',
    sampleScore: 86,
    ctaLabel: 'Planlamaya başla',
    insight: 'Toplam maliyet + uygunluk + risk analizi',
    theme: 'tatil'
  },
  {
    id: 'konut',
    name: 'Konut',
    description: 'Faiz, aidat ve toplam sahip olma maliyeti — yakında.',
    status: 'coming_soon',
    href: null,
    icon: 'home',
    sampleScore: null,
    theme: 'konut'
  },
  {
    id: 'finans',
    name: 'Finans',
    description: 'Kredi senaryoları ve nakit akışı karşılaştırması — yakında.',
    status: 'coming_soon',
    href: null,
    icon: 'landmark',
    sampleScore: null,
    theme: 'finans'
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
