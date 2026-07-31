import type {
  BusinessKpiComparison,
  BusinessPeriodComparisonResult
} from '../document-intelligence';

export interface BusinessExecutiveHighlightsProps {
  comparison?: BusinessPeriodComparisonResult;
}

function rankByMagnitude(
  items: readonly BusinessKpiComparison[]
): BusinessKpiComparison[] {
  return [...items].sort(
    (left, right) =>
      Math.abs(right.absoluteChange) -
      Math.abs(left.absoluteChange)
  );
}

function createHighlightCard(
  titleText: string,
  kpi?: BusinessKpiComparison
): HTMLElement {
  const article = document.createElement('article');
  article.className = 'ib-biz-highlight-card';

  const title = document.createElement('p');
  title.className = 'ib-biz-highlight-card__title';
  title.textContent = titleText;

  const metric = document.createElement('strong');
  metric.className = 'ib-biz-highlight-card__metric';
  metric.textContent =
    kpi?.label ?? 'Yeterli karşılaştırma verisi yok';

  const change = document.createElement('span');
  change.className = 'ib-biz-highlight-card__change';
  change.dataset.impact = kpi?.impact ?? 'unavailable';
  change.textContent = kpi?.changeLabel ?? '—';

  article.append(title, metric, change);
  return article;
}

export function createBusinessExecutiveHighlightsElement(
  props: BusinessExecutiveHighlightsProps
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'ib-biz-highlights';
  section.setAttribute(
    'aria-labelledby',
    'business-highlights-title'
  );

  const title = document.createElement('h2');
  title.id = 'business-highlights-title';
  title.className = 'ib-biz-highlights__title';
  title.textContent = 'Yönetici Öncelikleri';

  const positive = rankByMagnitude(
    props.comparison?.kpis.filter(
      (item) => item.impact === 'positive'
    ) ?? []
  )[0];

  const negative = rankByMagnitude(
    props.comparison?.kpis.filter(
      (item) => item.impact === 'negative'
    ) ?? []
  )[0];

  const stable = rankByMagnitude(
    props.comparison?.kpis.filter(
      (item) => item.impact === 'neutral'
    ) ?? []
  )[0];

  const grid = document.createElement('div');
  grid.className = 'ib-biz-highlights__grid';

  grid.append(
    createHighlightCard(
      'En büyük iyileşme',
      positive
    ),
    createHighlightCard(
      'En kritik bozulma',
      negative
    ),
    createHighlightCard(
      'En stabil gösterge',
      stable
    )
  );

  section.append(title, grid);
  return section;
}

export default createBusinessExecutiveHighlightsElement;
