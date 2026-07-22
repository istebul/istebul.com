import { createBusinessEmptyStateElement } from '../components/BusinessEmptyState';

export function createBusinessSettingsPageElement(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-page';
  root.dataset.businessPage = 'ayarlar';
  root.appendChild(
    createBusinessEmptyStateElement({
      title: 'Ayarlar henüz yapılandırılmadı',
      description:
        'Çalışma alanı ayarları için iskelet hazır. Kimlik doğrulama ve tenant ayarları bu sprintte değiştirilmez.',
      actionLabel: 'Dashboard’a dön',
      actionHref: '/business/'
    })
  );
  return root;
}

export function mountBusinessSettingsPage(container: HTMLElement): void {
  container.replaceChildren(createBusinessSettingsPageElement());
}

export default mountBusinessSettingsPage;
