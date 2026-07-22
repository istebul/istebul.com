import { BUSINESS_DASHBOARD_MOCK } from '../data/dashboard-mock';
import { createBusinessDailySummaryElement } from '../components/BusinessDailySummary';
import { createBusinessKpiCardElement } from '../components/BusinessKpiCard';
import { createBusinessActivityListElement } from '../components/BusinessActivityList';
import { createBusinessAiSuggestionsElement } from '../components/BusinessAiSuggestions';
import { createBusinessQuickActionsElement } from '../components/BusinessQuickActions';
import { createBusinessAdvisorPanelElement } from '../components/BusinessAdvisorPanel';
import { runBusinessIntelligenceEngine } from '../intelligence/pipeline/BusinessIntelligenceEngine';
import type { BusinessDashboardMockData } from '../types/dashboard-mock';
import type { BusinessAdvisorResult } from '../intelligence/types/advisor-result';

export interface BusinessDashboardPageOptions {
  data?: BusinessDashboardMockData;
  /** Optional advisor result; defaults to mock Intelligence Engine run. */
  advisor?: BusinessAdvisorResult;
}

export function createBusinessDashboardPageElement(
  options: BusinessDashboardPageOptions = {}
): HTMLElement {
  const data = options.data ?? BUSINESS_DASHBOARD_MOCK;
  const advisor = options.advisor ?? runBusinessIntelligenceEngine();
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

  root.appendChild(createBusinessAdvisorPanelElement({ advisor, compact: true }));

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
