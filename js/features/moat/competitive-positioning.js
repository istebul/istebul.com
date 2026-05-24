/**
 * Competitive positioning — re-exports P3.1 category ownership + legacy moat pillars.
 */
import {
  CATEGORY_DEFINITION,
  CATEGORY_TAGLINES,
  COMPETITOR_ALTERNATIVES,
  renderCategoryNotStripHtml,
  renderCompetitorAlternativesHtml,
  renderCategoryOwnershipSectionHtml
} from './category-positioning.js';

export {
  CATEGORY_DEFINITION,
  CATEGORY_TAGLINES,
  COMPETITOR_ALTERNATIVES,
  renderCategoryNotStripHtml,
  renderCompetitorAlternativesHtml,
  renderCategoryOwnershipSectionHtml
};

export const MOAT_PILLARS = Object.freeze([
  {
    id: 'deterministic',
    title: 'Sayılar motordan, AI anlatır',
    summary: CATEGORY_TAGLINES.aiContrast
  },
  {
    id: 'closed_loop',
    title: 'Kapalı döngü partner ekonomisi',
    summary:
      'Skorlu lead → imzalı webhook → outcome graph. Klasik lead formu değil, operasyonel teslimat.'
  },
  {
    id: 'data_moat',
    title: 'Anonim outcome graph',
    summary:
      'Segment kapanış sinyalleri skor kalibrasyonuna girer. Arayüz kopyalanır; biriken outcome verisi kopyalanmaz.'
  },
  {
    id: 'neutral',
    title: CATEGORY_DEFINITION.label,
    summary: CATEGORY_DEFINITION.oneLiner
  }
]);

/** @deprecated Use COMPETITOR_ALTERNATIVES — kept for karar-moat page */
export const COMPETITOR_FRAMES = Object.freeze(
  COMPETITOR_ALTERNATIVES.map((row) => ({
    id: row.id,
    name: row.category,
    counter: row.istebul
  }))
);

export function renderMoatPillarsHtml() {
  return `
    <div class="ib-moat-pillars">
      ${MOAT_PILLARS.map(
        (p) => `
        <article class="ib-moat-pillar" id="moat-${p.id}">
          <h3>${p.title}</h3>
          <p>${p.summary}</p>
        </article>`
      ).join('')}
    </div>`;
}

export function renderCompetitorFramesHtml() {
  return renderCompetitorAlternativesHtml();
}
