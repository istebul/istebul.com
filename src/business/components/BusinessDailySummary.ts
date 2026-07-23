import type { BusinessDailySummaryMock } from '../types/dashboard-mock';

export interface BusinessDailySummaryProps {
  summary: BusinessDailySummaryMock;
}

export function createBusinessDailySummaryElement(props: BusinessDailySummaryProps): HTMLElement {
  const { summary } = props;
  const section = document.createElement('section');
  section.className = 'ib-biz-summary';
  section.setAttribute('aria-labelledby', 'business-daily-summary-title');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'ib-biz-summary__eyebrow';
  eyebrow.textContent = `${summary.greeting} · ${summary.dateLabel}`;

  const title = document.createElement('h2');
  title.className = 'ib-biz-summary__title';
  title.id = 'business-daily-summary-title';
  title.textContent = summary.headline;

  const body = document.createElement('p');
  body.className = 'ib-biz-summary__body';
  body.textContent = summary.body;

  section.append(eyebrow, title, body);
  return section;
}

export default createBusinessDailySummaryElement;
