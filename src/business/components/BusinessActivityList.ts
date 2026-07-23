import type { BusinessActivityMock } from '../types/dashboard-mock';

export interface BusinessActivityListProps {
  items: readonly BusinessActivityMock[];
  title?: string;
}

export function createBusinessActivityListElement(props: BusinessActivityListProps): HTMLElement {
  const section = document.createElement('section');
  section.className = 'ib-biz-panel';
  section.setAttribute('aria-labelledby', 'business-activity-title');

  const heading = document.createElement('h2');
  heading.className = 'ib-biz-panel__title';
  heading.id = 'business-activity-title';
  heading.textContent = props.title ?? 'Son Aktiviteler';

  const list = document.createElement('ul');
  list.className = 'ib-biz-activity';

  for (const item of props.items) {
    const li = document.createElement('li');
    li.className = 'ib-biz-activity__item';
    li.dataset.activityId = item.id;

    const title = document.createElement('p');
    title.className = 'ib-biz-activity__title';
    title.textContent = item.title;

    const detail = document.createElement('p');
    detail.className = 'ib-biz-activity__detail';
    detail.textContent = item.detail;

    const time = document.createElement('time');
    time.className = 'ib-biz-activity__time';
    time.textContent = item.timeLabel;

    li.append(title, detail, time);
    list.appendChild(li);
  }

  section.append(heading, list);
  return section;
}

export default createBusinessActivityListElement;
