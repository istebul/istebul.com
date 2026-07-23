import { createBusinessEmptyStateElement } from '../components/BusinessEmptyState';

export function createBusinessAnalysesPageElement(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-page';
  root.dataset.businessPage = 'analizler';
  root.appendChild(
    createBusinessEmptyStateElement({
      title: 'Henüz analiz yok',
      description:
        'Analiz motoru bağlantısı sonraki sprintlerde aktifleşecek. Bu sayfa Business MVP iskeletinin parçasıdır.',
      actionLabel: 'Dashboard’a dön',
      actionHref: '/business/'
    })
  );
  return root;
}

export function mountBusinessAnalysesPage(container: HTMLElement): void {
  container.replaceChildren(createBusinessAnalysesPageElement());
}

export default mountBusinessAnalysesPage;
