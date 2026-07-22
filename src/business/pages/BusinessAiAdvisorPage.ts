import { createBusinessEmptyStateElement } from '../components/BusinessEmptyState';

export function createBusinessAiAdvisorPageElement(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-page';
  root.dataset.businessPage = 'danisman';
  root.appendChild(
    createBusinessEmptyStateElement({
      title: 'Yapay Zekâ Danışmanı yakında',
      description:
        'Danışman sohbet yüzeyi MVP iskeletinde yer tutucu olarak hazır. AI proxy bağlantısı bu sprintte açılmaz.',
      actionLabel: 'Dashboard’a dön',
      actionHref: '/business/'
    })
  );
  return root;
}

export function mountBusinessAiAdvisorPage(container: HTMLElement): void {
  container.replaceChildren(createBusinessAiAdvisorPageElement());
}

export default mountBusinessAiAdvisorPage;
