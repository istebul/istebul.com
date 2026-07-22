import { BUSINESS_DASHBOARD_MOCK } from '../data/dashboard-mock';
import { createBusinessDailySummaryElement } from '../components/BusinessDailySummary';
import { createBusinessKpiCardElement } from '../components/BusinessKpiCard';
import { createBusinessActivityListElement } from '../components/BusinessActivityList';
import { createBusinessAiSuggestionsElement } from '../components/BusinessAiSuggestions';
import { createBusinessQuickActionsElement } from '../components/BusinessQuickActions';
import type { BusinessDashboardMockData } from '../types/dashboard-mock';

export interface BusinessDashboardPageOptions {
  data?: BusinessDashboardMockData;
}

export function createBusinessDashboardPageElement(
  options: BusinessDashboardPageOptions = {}
): HTMLElement {
  const data = options.data ?? BUSINESS_DASHBOARD_MOCK;
  const root = document.createElement('div');
  root.className = 'ib-biz-dashboard';
  root.dataset.businessPage = 'dashboard';

  root.appendChild(createBusinessDailySummaryElement({ summary: data.summary }));

  const kpiGrid = document.createElement('section');
  kpiGrid.className = 'ib-biz-kpi-grid';
  kpiGrid.setAttribute('aria-label', 'KPI kartları');
  for (const kpi of data.kpis) {
    kpiGrid.appendChild(createBusinessKpiCardElement({ kpi }));
  }
  root.appendChild(kpiGrid);

  const columns = document.createElement('div');
  columns.className = 'ib-biz-dashboard__columns';
  columns.append(
    createBusinessActivityListElement({ items: data.activities }),
    createBusinessAiSuggestionsElement({ items: data.aiSuggestions })
  );
  root.appendChild(columns);

  root.appendChild(createBusinessQuickActionsElement({ items: data.quickActions }));

  return root;
}

export function mountBusinessDashboardPage(container: HTMLElement): void {
  container.replaceChildren(createBusinessDashboardPageElement());
}

export default mountBusinessDashboardPage;
