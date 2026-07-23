import { createBusinessEmptyStateElement } from '../components/BusinessEmptyState';

export function createBusinessNotificationsPageElement(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-page';
  root.dataset.businessPage = 'bildirimler';
  root.appendChild(
    createBusinessEmptyStateElement({
      title: 'Bildirim bulunmuyor',
      description:
        'Bildirim merkezi iskeleti hazır. Gerçek zamanlı uyarılar sonraki sprintlerde bağlanacak.',
      actionLabel: 'Dashboard’a dön',
      actionHref: '/business/'
    })
  );
  return root;
}

export function mountBusinessNotificationsPage(container: HTMLElement): void {
  container.replaceChildren(createBusinessNotificationsPageElement());
}

export default mountBusinessNotificationsPage;
