import { BUSINESS_MODULES } from '../constants/BusinessModules';
import { createBusinessModuleCardElement } from '../components/BusinessModuleCard';
import { createBusinessLayoutShell } from '../layouts/BusinessLayout';
import { getBusinessRouteByPath } from '../routes/business-routes';

export const BUSINESS_HOME_COPY = Object.freeze({
  title: 'İSTEBUL Business',
  subtitle: 'Yapay zekâ destekli iş yönetimi, analiz ve karar platformu.',
  intro:
    'İSTEBUL Business şu anda geliştirme aşamasındadır. Aşağıdaki merkezler ürün yol haritasının tanıtım yüzüdür; işlevler henüz aktif değildir.'
});

export function mountBusinessHomePage(container: HTMLElement): void {
  const route = getBusinessRouteByPath('/business');
  const shell = createBusinessLayoutShell({
    title: route?.title ?? BUSINESS_HOME_COPY.title,
    subtitle: route?.description ?? BUSINESS_HOME_COPY.subtitle,
    intro: BUSINESS_HOME_COPY.intro
  });

  const modulesRegion = shell.querySelector('#business-modules');
  if (modulesRegion) {
    for (const module of BUSINESS_MODULES) {
      modulesRegion.appendChild(createBusinessModuleCardElement({ module }));
    }
  }

  container.replaceChildren(shell);
}

export default mountBusinessHomePage;
