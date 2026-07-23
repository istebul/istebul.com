import type { BusinessNavId } from '../types/business-nav';
import { createBusinessSidebarElement } from '../components/BusinessSidebar';
import { createBusinessTopbarElement } from '../components/BusinessTopbar';
import { createBusinessPlatformNavElement } from '../components/BusinessPlatformNav';

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
  platformNav: HTMLElement;
}

/**
 * Business uygulama kabuğu: Platform nav + Sidebar + Topbar + içerik.
 * Platform logo → `/`. Kimlik doğrulama / tenant bağlamı içermez.
 */
export function createBusinessLayoutShell(options: BusinessLayoutOptions): BusinessLayoutResult {
  const root = document.createElement('div');
  root.className = 'ib-business-frame';
  root.dataset.businessFrame = '1';

  const platformNav = createBusinessPlatformNavElement();

  const shell = document.createElement('div');
  shell.className = 'ib-biz-shell';
  shell.dataset.businessShell = '1';

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
      shell.classList.toggle('is-sidebar-open');
      const open = shell.classList.contains('is-sidebar-open');
      shell.setAttribute('data-sidebar-open', open ? '1' : '0');
    }
  });

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'ib-biz-shell__backdrop';
  backdrop.setAttribute('aria-label', 'Menüyü kapat');
  backdrop.addEventListener('click', () => {
    shell.classList.remove('is-sidebar-open');
    shell.setAttribute('data-sidebar-open', '0');
  });

  main.append(topbar, content);
  shell.append(sidebar, backdrop, main);
  root.append(platformNav, shell);

  return { root, content, sidebar, platformNav };
}

export default createBusinessLayoutShell;
