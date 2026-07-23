import type { BusinessNavId } from '../types/business-nav';
import { createBusinessSidebarElement } from '../components/BusinessSidebar';
import { createBusinessTopbarElement } from '../components/BusinessTopbar';

export interface BusinessLayoutOptions {
  activeNavId: BusinessNavId;
  title: string;
  subtitle?: string;
  /** @deprecated Legacy marketing shell fields — ignored by app layout. */
  intro?: string;
}

export interface BusinessLayoutResult {
  root: HTMLElement;
  content: HTMLElement;
  sidebar: HTMLElement;
}

/**
 * Business uygulama kabuğu: Sidebar + Topbar + içerik alanı.
 * Kimlik doğrulama / tenant bağlamı içermez.
 */
export function createBusinessLayoutShell(options: BusinessLayoutOptions): BusinessLayoutResult {
  const root = document.createElement('div');
  root.className = 'ib-biz-shell';
  root.dataset.businessShell = '1';

  const sidebar = createBusinessSidebarElement({ activeId: options.activeNavId });
  sidebar.id = 'ib-biz-sidebar';

  const main = document.createElement('div');
  main.className = 'ib-biz-shell__main';

  const content = document.createElement('div');
  content.className = 'ib-biz-shell__content';
  content.id = 'business-app-content';
  content.setAttribute('role', 'main');

  const topbar = createBusinessTopbarElement({
    title: options.title,
    subtitle: options.subtitle,
    onMenuToggle: () => {
      root.classList.toggle('is-sidebar-open');
      const open = root.classList.contains('is-sidebar-open');
      root.setAttribute('data-sidebar-open', open ? '1' : '0');
    }
  });

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'ib-biz-shell__backdrop';
  backdrop.setAttribute('aria-label', 'Menüyü kapat');
  backdrop.addEventListener('click', () => {
    root.classList.remove('is-sidebar-open');
    root.setAttribute('data-sidebar-open', '0');
  });

  main.append(topbar, content);
  root.append(sidebar, backdrop, main);

  return { root, content, sidebar };
}

export default createBusinessLayoutShell;
