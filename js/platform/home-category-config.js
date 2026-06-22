/**
 * Homepage decision categories — routing, status, scores (display copy lives in i18n/marketing-copy.js).
 * Derived from category-registry via homeKey adapter (Faz 0.2).
 */
import { listVerticals } from './category-registry.js';

export const HOME_CATEGORY_PILLARS = [
  'Karar skoru',
  'Toplam maliyet',
  'Risk analizi',
  'Sonraki adım'
];

const HOME_SAMPLE_SCORES = Object.freeze({
  araba: 89,
  konut: 88,
  tatil: 91,
  finansman: 87,
  sigorta: 86,
  kasko: 85
});

const REGISTRY_TO_HOME_STATUS = Object.freeze({
  live: 'active',
  beta: 'coming_soon',
  draft: 'coming_soon'
});

function toHomeDecisionCategory(entry) {
  return {
    id: entry.homeKey,
    status: REGISTRY_TO_HOME_STATUS[entry.status] ?? 'coming_soon',
    href: entry.href,
    sampleScore: HOME_SAMPLE_SCORES[entry.homeKey],
    settingKey: entry.settingKey
  };
}

export const HOME_DECISION_CATEGORIES = listVerticals().map(toHomeDecisionCategory);

export function isHomeCategoryActive(category) {
  return category?.status === 'active' && Boolean(category?.href);
}

export function getHomeCategoriesByStatus(status) {
  return HOME_DECISION_CATEGORIES.filter((c) => c.status === status);
}
