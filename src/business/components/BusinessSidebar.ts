import type { BusinessNavId, BusinessNavItem } from '../types/business-nav';
import { BUSINESS_NAV_ITEMS } from '../constants/BusinessNav';

export interface BusinessSidebarProps {
  activeId: BusinessNavId;
  items?: readonly BusinessNavItem[];
  onNavigate?: (item: BusinessNavItem) => void;
}

export function createBusinessSidebarElement(props: BusinessSidebarProps): HTMLElement {
  const items = props.items ?? BUSINESS_NAV_ITEMS;
  const aside = document.createElement('aside');
  aside.className = 'ib-biz-sidebar';
  aside.setAttribute('aria-label', 'Business menü');

  const brand = document.createElement('a');
  brand.className = 'ib-biz-sidebar__brand';
  brand.href = '/business/';
  brand.setAttribute('aria-label', 'İSTEBUL Business ana sayfa');

  const logo = document.createElement('img');
  logo.className = 'ib-biz-sidebar__logo';
  logo.src = '/assets/brand/istebul-icon.svg';
  logo.alt = '';
  logo.width = 32;
  logo.height = 32;
  logo.decoding = 'async';

  const brandText = document.createElement('span');
  brandText.className = 'ib-biz-sidebar__brand-text';
  brandText.innerHTML = '<span>İSTEBUL</span> <span>Business</span>';

  brand.append(logo, brandText);

  const nav = document.createElement('nav');
  nav.className = 'ib-biz-sidebar__nav';
  nav.setAttribute('aria-label', 'Business sayfaları');

  for (const item of items) {
    const link = document.createElement('a');
    link.className = 'ib-biz-sidebar__link';
    link.href = item.href;
    link.dataset.navId = item.id;
    link.textContent = item.label;
    link.title = item.description;
    if (item.id === props.activeId) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
    if (props.onNavigate) {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        props.onNavigate?.(item);
      });
    }
    nav.appendChild(link);
  }

  const footer = document.createElement('div');
  footer.className = 'ib-biz-sidebar__footer';

  const platformLink = document.createElement('a');
  platformLink.className = 'ib-biz-sidebar__platform';
  platformLink.href = '/';
  platformLink.textContent = 'isteBul Platform';

  footer.appendChild(platformLink);
  aside.append(brand, nav, footer);
  return aside;
}

export default createBusinessSidebarElement;
