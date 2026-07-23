import { createBusinessEmptyStateElement } from '../components/BusinessEmptyState';

export function createBusinessReportsPageElement(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-page';
  root.dataset.businessPage = 'raporlar';
  root.appendChild(
    createBusinessEmptyStateElement({
      title: 'Henüz rapor yok',
      description:
        'Rapor merkezi iskeleti hazır. Canlı rapor üretimi sonraki sürümlerde eklenecek.',
      actionLabel: 'Dashboard’a dön',
      actionHref: '/business/'
    })
  );
  return root;
}

export function mountBusinessReportsPage(container: HTMLElement): void {
  container.replaceChildren(createBusinessReportsPageElement());
}

export default mountBusinessReportsPage;
