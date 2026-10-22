import type { BusinessNavId } from '../types/business-nav';
import { createBusinessLayoutShell } from '../layouts/BusinessLayout';
import {
  getBusinessRouteByNavId,
  getBusinessRouteByPath,
  type BusinessRouteDefinition
} from '../routes/business-routes';
import {
  createBusinessDashboardPageElement,
  mountBusinessDashboardPage
} from '../pages/BusinessDashboardPage';
import { createBusinessImportCenterPageElement } from '../pages/BusinessImportCenterPage';
import { createBusinessAnalysesPageElement } from '../pages/BusinessAnalysesPage';
import { createBusinessReportsPageElement } from '../pages/BusinessReportsPage';
import { createBusinessAiAdvisorPageElement } from '../pages/BusinessAiAdvisorPage';
import { createBusinessNotificationsPageElement } from '../pages/BusinessNotificationsPage';
import { createBusinessSettingsPageElement } from '../pages/BusinessSettingsPage';
import { createBusinessRuntime } from './BusinessRuntime';
import { loadBusinessWorkspace } from './loadBusinessWorkspace';
import { createBusinessLiveProjectsElement } from '../components/BusinessLiveProjects';
import { resolveBusinessAccess } from '../auth/resolveBusinessAccess';
import { createBusinessAuthPage } from '../auth/ui';
import { createBusinessOnboardingPage } from '../onboarding/BusinessOnboardingPage';

export interface MountBusinessAppOptions {
  /** Explicit page; defaults from pathname or data-business-page. */
  navId?: BusinessNavId;
  pathname?: string;
}

function resolveRoute(options: MountBusinessAppOptions, container: HTMLElement): BusinessRouteDefinition {
  if (options.navId) {
    const byNav = getBusinessRouteByNavId(options.navId);
    if (byNav) return byNav;
  }

  const dataPage = container.dataset.businessPage as BusinessNavId | undefined;
  if (dataPage) {
    const byData = getBusinessRouteByNavId(dataPage);
    if (byData) return byData;
  }

  const pathname =
    options.pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '/business');
  const byPath = getBusinessRouteByPath(pathname);
  if (byPath) return byPath;

  const fallback = getBusinessRouteByNavId('dashboard');
  if (!fallback) {
    throw new Error('Business dashboard route is missing');
  }
  return fallback;
}

function createPageElement(route: BusinessRouteDefinition): HTMLElement {
  switch (route.page) {
    case 'BusinessDashboardPage':
      return createBusinessDashboardPageElement();
    case 'BusinessImportCenterPage':
      return createBusinessImportCenterPageElement();
    case 'BusinessAnalysesPage':
      return createBusinessAnalysesPageElement();
    case 'BusinessReportsPage':
      return createBusinessReportsPageElement();
    case 'BusinessAiAdvisorPage':
      return createBusinessAiAdvisorPageElement();
    case 'BusinessNotificationsPage':
      return createBusinessNotificationsPageElement();
    case 'BusinessSettingsPage':
      return createBusinessSettingsPageElement();
    default: {
      const _exhaustive: never = route.page;
      return _exhaustive;
    }
  }
}

function createBusinessAccessErrorElement(
  message = "İşletme çalışma alanı yüklenemedi. Lütfen yeniden deneyin."
): HTMLElement {
  const root = document.createElement("section");
  root.className = "ib-biz-empty-state";
  root.setAttribute("role", "alert");

  const title = document.createElement("h2");
  title.textContent = "İşletme erişimi doğrulanamadı";

  const description = document.createElement("p");
  description.textContent = message;

  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "ib-biz-button ib-biz-button-primary";
  retry.textContent = "Yeniden dene";
  retry.addEventListener("click", () => window.location.reload());

  root.append(title, description, retry);
  return root;
}

/**
 * Business MVP uygulamasını hedef kapsayıcıya mount eder.
 * Auth / tenant / API çağrısı yapmaz.
 */
export function mountBusinessApp(
  container: HTMLElement,
  options: MountBusinessAppOptions = {}
): void {
  const route = resolveRoute(options, container);
  const { root, content } = createBusinessLayoutShell({
    activeNavId: route.navId,
    title: route.title,
    subtitle: route.description
  });

  content.appendChild(createPageElement(route));
  container.replaceChildren(root);
  container.dataset.businessAppReady = '1';
  container.dataset.businessActivePage = route.navId;

  const runtime = createBusinessRuntime();
  if (!runtime) return;

  void resolveBusinessAccess(runtime).then((access) => {
    if (access.state === 'unauthenticated') {
      content.replaceChildren(
        createBusinessAuthPage({
          runtime,
          onAuthenticated: () => {
            window.location.reload();
          }
        })
      );
      return;
    }

    if (access.state === 'error') {
      content.replaceChildren(
        createBusinessAccessErrorElement(access.error)
      );
      return;
    }

    if (access.state === 'needs-business') {
      content.replaceChildren(createBusinessOnboardingPage());
      return;
    }

    if (route.navId === 'ayarlar' && access.businessId) {
      content.replaceChildren(
        createBusinessSettingsPageElement({
          runtime,
          businessId: access.businessId,
          role: access.role
        })
      );
      return;
    }

    if (
      route.navId === 'dashboard' &&
      access.businessId
    ) {
      void mountBusinessDashboardPage(content, {
        runtime,
        businessId: access.businessId
      });
      return;
    }

    if (
      route.navId === 'veri-merkezi' &&
      access.userId &&
      access.businessId
    ) {
      content.replaceChildren(
        createBusinessImportCenterPageElement({
          runtime,
          userId: access.userId,
          businessId: access.businessId
        })
      );
      return;
    }

    if (
      route.navId === 'analizler' &&
      access.userId &&
      access.businessId
    ) {
      content.replaceChildren(
        createBusinessAnalysesPageElement({
          runtime,
          userId: access.userId,
          businessId: access.businessId
        })
      );
      return;
    }

    void loadBusinessWorkspace(runtime).then((state) => {
      if (state.error) {
        content.replaceChildren(createBusinessAccessErrorElement());
        return;
      }

      if (
        !state.authenticated ||
        !state.userId ||
        !state.businessId
      ) {
        return;
      }

      const renderProjects = (
        projects: typeof state.projects
      ): void => {
        const current = content.querySelector(
          '[aria-labelledby="business-live-projects-title"]'
        );

        const element = createBusinessLiveProjectsElement({
          projects,
          onCreateProject: async (title, type) => {
            await runtime.studio.createProject({
              businessId: state.businessId as string,
              userId: state.userId as string,
              title,
              type
            });

            const refreshedProjects =
              await runtime.studio.listProjects(
                state.businessId as string
              );

            renderProjects(refreshedProjects);
          }
        });

        if (current) {
          current.replaceWith(element);
        } else {
          content.appendChild(element);
        }
      };

      renderProjects(state.projects);
    }).catch(() => {
      content.replaceChildren(createBusinessAccessErrorElement());
    });
  }).catch(() => {
    content.replaceChildren(createBusinessAccessErrorElement());
  });
}

export default mountBusinessApp;
