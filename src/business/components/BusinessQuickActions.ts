import type { BusinessQuickActionMock } from '../types/dashboard-mock';

export interface BusinessQuickActionsProps {
  items: readonly BusinessQuickActionMock[];
  title?: string;
}

export function createBusinessQuickActionsElement(props: BusinessQuickActionsProps): HTMLElement {
  const section = document.createElement('section');
  section.className = 'ib-biz-panel';
  section.setAttribute('aria-labelledby', 'business-quick-actions-title');

  const heading = document.createElement('h2');
  heading.className = 'ib-biz-panel__title';
  heading.id = 'business-quick-actions-title';
  heading.textContent = props.title ?? 'Hızlı İşlemler';

  const list = document.createElement('div');
  list.className = 'ib-biz-quick';
  list.setAttribute('role', 'list');

  for (const item of props.items) {
    const link = document.createElement('a');
    link.className = 'ib-biz-quick__action';
    link.href = item.href;
    link.textContent = item.label;
    link.dataset.actionId = item.id;
    link.setAttribute('role', 'listitem');
    list.appendChild(link);
  }

  section.append(heading, list);
  return section;
}

export default createBusinessQuickActionsElement;
