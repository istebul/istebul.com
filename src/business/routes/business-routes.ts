export type BusinessRouteName = 'business-home';

export interface BusinessRouteDefinition {
  path: string;
  name: BusinessRouteName;
  page: 'BusinessHomePage';
  title: string;
  description: string;
}

export const BUSINESS_ROUTES: readonly BusinessRouteDefinition[] = Object.freeze([
  {
    path: '/business',
    name: 'business-home',
    page: 'BusinessHomePage',
    title: 'İSTEBUL Business',
    description: 'Yapay zekâ destekli iş yönetimi, analiz ve karar platformu.'
  }
]);

export function getBusinessRouteByPath(pathname: string): BusinessRouteDefinition | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return BUSINESS_ROUTES.find((route) => route.path === normalized) ?? null;
}

export default BUSINESS_ROUTES;
