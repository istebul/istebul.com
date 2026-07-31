import type {
  BusinessPeriodComparisonResult
} from '../document-intelligence';

export interface BusinessExecutiveHealthPanelProps {
  score: number;
  comparison?: BusinessPeriodComparisonResult;
}

function createMetric(
  labelText: string,
  valueText: string
): HTMLElement {
  const article = document.createElement('article');
  article.className = 'ib-biz-health-panel__metric';

  const label = document.createElement('span');
  label.className = 'ib-biz-health-panel__label';
  label.textContent = labelText;

  const value = document.createElement('strong');
  value.className = 'ib-biz-health-panel__value';
  value.textContent = valueText;

  article.append(label, value);
  return article;
}

export function createBusinessExecutiveHealthPanelElement(
  props: BusinessExecutiveHealthPanelProps
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'ib-biz-health-panel';
  section.setAttribute(
    'aria-labelledby',
    'business-health-panel-title'
  );

  const header = document.createElement('div');
  header.className = 'ib-biz-health-panel__header';

  const headingWrap = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'ib-biz-health-panel__eyebrow';
  eyebrow.textContent = 'Yönetici görünümü';

  const title = document.createElement('h2');
  title.id = 'business-health-panel-title';
  title.className = 'ib-biz-health-panel__title';
  title.textContent = 'İşletme Sağlığı';

  headingWrap.append(eyebrow, title);

  const status = document.createElement('span');
  status.className = 'ib-biz-health-panel__status';

  const scoreDirection =
    props.comparison?.score.direction ?? 'stable';

  status.dataset.status = scoreDirection;

  status.textContent =
    scoreDirection === 'up'
      ? 'İyileşiyor'
      : scoreDirection === 'down'
        ? 'Dikkat gerekiyor'
        : 'Stabil';

  header.append(headingWrap, status);

  const metrics = document.createElement('div');
  metrics.className = 'ib-biz-health-panel__metrics';

  metrics.append(
    createMetric(
      'Güncel sağlık skoru',
      `${props.score}/100`
    ),
    createMetric(
      'Önceki dönem',
      props.comparison
        ? `${props.comparison.score.previousValue}/100`
        : 'Karşılaştırma yok'
    ),
    createMetric(
      'Skor değişimi',
      props.comparison
        ? props.comparison.score.changeLabel
        : 'İlk analiz'
    )
  );

  const summary = document.createElement('p');
  summary.className = 'ib-biz-health-panel__summary';
  summary.textContent =
    props.comparison?.summary ??
    'Karşılaştırmalı değerlendirme için en az iki analiz gerekir.';

  section.append(header, metrics, summary);
  return section;
}

export default createBusinessExecutiveHealthPanelElement;
