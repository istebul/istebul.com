export interface BusinessTopbarProps {
  title: string;
  subtitle?: string;
  onMenuToggle?: () => void;
}

export function createBusinessTopbarElement(props: BusinessTopbarProps): HTMLElement {
  const header = document.createElement('header');
  header.className = 'ib-biz-topbar';

  const left = document.createElement('div');
  left.className = 'ib-biz-topbar__left';

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'ib-biz-topbar__menu';
  menuBtn.setAttribute('aria-label', 'Menüyü aç veya kapat');
  menuBtn.setAttribute('aria-controls', 'ib-biz-sidebar');
  menuBtn.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
  if (props.onMenuToggle) {
    menuBtn.addEventListener('click', () => props.onMenuToggle?.());
  }

  const titles = document.createElement('div');
  titles.className = 'ib-biz-topbar__titles';

  const title = document.createElement('h1');
  title.className = 'ib-biz-topbar__title';
  title.id = 'business-page-title';
  title.textContent = props.title;

  titles.appendChild(title);

  if (props.subtitle) {
    const subtitle = document.createElement('p');
    subtitle.className = 'ib-biz-topbar__subtitle';
    subtitle.textContent = props.subtitle;
    titles.appendChild(subtitle);
  }

  left.append(menuBtn, titles);

  const right = document.createElement('div');
  right.className = 'ib-biz-topbar__right';

  const badge = document.createElement('span');
  badge.className = 'ib-biz-topbar__badge';
  badge.textContent = 'Beta';

  const workspace = document.createElement('span');
  workspace.className = 'ib-biz-topbar__workspace';
  workspace.textContent = 'Canlı çalışma alanı';

  right.append(badge, workspace);
  header.append(left, right);
  return header;
}

export default createBusinessTopbarElement;
