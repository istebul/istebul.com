/** Homepage category card imagery — single source for paths. */
export const HOME_CATEGORY_CARD_IMAGES = Object.freeze({
  araba: '/assets/images/home-categories/araba.webp',
  tatil: '/assets/images/home-categories/tatil.webp',
  konut: '/assets/images/home-categories/konut.webp',
  finansman: '/assets/images/home-categories/finansman.webp',
  sigorta: '/assets/images/home-categories/sigorta.webp',
  kasko: '/assets/images/home-categories/kasko.webp'
});

export function getHomeCategoryCardImage(categoryId) {
  return HOME_CATEGORY_CARD_IMAGES[categoryId] || '';
}
