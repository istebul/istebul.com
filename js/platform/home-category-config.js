/**
 * Homepage decision categories — routing, status, scores (display copy lives in i18n/marketing-copy.js).
 */
export const HOME_CATEGORY_PILLARS = [
  'Karar skoru',
  'Toplam maliyet',
  'Risk analizi',
  'Sonraki adım'
];

export const HOME_DECISION_CATEGORIES = [
  {
    id: 'araba',
    status: 'active',
    href: '/auto/',
    sampleScore: 89,
    settingKey: 'home_category_auto_enabled'
  },
  {
    id: 'konut',
    status: 'active',
    href: '/konut/',
    sampleScore: 88,
    settingKey: 'home_category_konut_enabled'
  },
  {
    id: 'tatil',
    status: 'active',
    href: '/tatil/',
    sampleScore: 91,
    settingKey: 'home_category_tatil_enabled'
  },
  {
    id: 'finansman',
    status: 'active',
    href: '/finans/',
    sampleScore: 87,
    settingKey: 'home_category_finans_enabled'
  },
  {
    id: 'sigorta',
    status: 'active',
    href: '/sigorta/',
    sampleScore: 86,
    settingKey: 'home_category_sigorta_enabled'
  },
  {
    id: 'kasko',
    status: 'active',
    href: '/kasko/',
    sampleScore: 85,
    settingKey: 'home_category_kasko_enabled'
  }
];

export function isHomeCategoryActive(category) {
  return category?.status === 'active' && Boolean(category?.href);
}

export function getHomeCategoriesByStatus(status) {
  return HOME_DECISION_CATEGORIES.filter((c) => c.status === status);
}
