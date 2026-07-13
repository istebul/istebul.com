export interface BusinessLayoutOptions {
  title: string;
  subtitle: string;
  intro: string;
}

export function createBusinessLayoutShell(options: BusinessLayoutOptions): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-business-layout';

  const hero = document.createElement('header');
  hero.className = 'ib-business-layout__hero';

  const title = document.createElement('h1');
  title.className = 'ib-business-layout__title';
  title.textContent = options.title;

  const subtitle = document.createElement('p');
  subtitle.className = 'ib-business-layout__subtitle';
  subtitle.textContent = options.subtitle;

  const intro = document.createElement('p');
  intro.className = 'ib-business-layout__intro';
  intro.textContent = options.intro;

  hero.append(title, subtitle, intro);

  const modulesRegion = document.createElement('section');
  modulesRegion.className = 'ib-business-layout__modules';
  modulesRegion.setAttribute('aria-label', 'Business modülleri');
  modulesRegion.id = 'business-modules';

  root.append(hero, modulesRegion);
  return root;
}

export default createBusinessLayoutShell;
