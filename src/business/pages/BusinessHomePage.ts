import { mountBusinessApp } from '../app/mountBusinessApp';
import { getBusinessRouteByPath } from '../routes/business-routes';

/** Legacy marketing copy — dashboard route description ile hizalı tutulur. */
export const BUSINESS_HOME_COPY = Object.freeze({
  title: 'İSTEBUL Business',
  subtitle: 'Yapay zekâ destekli iş yönetimi, analiz ve karar platformu.',
  intro:
    'İSTEBUL Business MVP iskeleti aktiftir. Dashboard mock veriyle çalışır; kimlik doğrulama ve API bağlantısı yoktur.'
});

/**
 * Geriye uyumlu giriş: Business uygulamasını Dashboard ile mount eder.
 */
export function mountBusinessHomePage(container: HTMLElement): void {
  const route = getBusinessRouteByPath('/business');
  container.dataset.businessPage = route?.navId ?? 'dashboard';
  mountBusinessApp(container, { navId: 'dashboard' });
}

export default mountBusinessHomePage;
