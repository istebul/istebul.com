import type { BusinessKpiMock } from '../types/dashboard-mock';

export interface BusinessKpiCardProps {
  kpi: BusinessKpiMock;
}

export function createBusinessKpiCardElement(props: BusinessKpiCardProps): HTMLElement {
  const { kpi } = props;
  const article = document.createElement('article');
  article.className = 'ib-biz-kpi';
  article.dataset.kpiId = kpi.id;
  article.dataset.trend = kpi.trend;

  const label = document.createElement('p');
  label.className = 'ib-biz-kpi__label';
  label.textContent = kpi.label;

  const valueRow = document.createElement('div');
  valueRow.className = 'ib-biz-kpi__value-row';

  const value = document.createElement('p');
  value.className = 'ib-biz-kpi__value';
  value.textContent = kpi.value;

  const delta = document.createElement('span');
  delta.className = `ib-biz-kpi__delta ib-biz-kpi__delta--${kpi.trend}`;
  delta.textContent = kpi.delta;

  valueRow.append(value, delta);

  const hint = document.createElement('p');
  hint.className = 'ib-biz-kpi__hint';
  hint.textContent = kpi.hint;

  article.append(label, valueRow, hint);
  return article;
}

export default createBusinessKpiCardElement;
