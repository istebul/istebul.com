import { BUSINESS_DASHBOARD_MOCK } from '../data/dashboard-mock';
import { createBusinessDailySummaryElement } from '../components/BusinessDailySummary';
import { createBusinessKpiCardElement } from '../components/BusinessKpiCard';
import { createBusinessActivityListElement } from '../components/BusinessActivityList';
import { createBusinessAiSuggestionsElement } from '../components/BusinessAiSuggestions';
import { createBusinessQuickActionsElement } from '../components/BusinessQuickActions';
import { createBusinessAdvisorPanelElement } from '../components/BusinessAdvisorPanel';
import { runBusinessIntelligenceEngine } from '../intelligence/pipeline/BusinessIntelligenceEngine';
import { createSupabaseProvider } from '../providers/adapters/SupabaseProvider';
import type { BusinessDashboardMockData } from '../types/dashboard-mock';
import type { BusinessAdvisorResult } from '../intelligence/types/advisor-result';

export interface BusinessDashboardPageOptions {
  data?: BusinessDashboardMockData;
  advisor?: BusinessAdvisorResult;
}

function renderDashboard(
  data: BusinessDashboardMockData,
  advisor: BusinessAdvisorResult
): HTMLElement {
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

function createLoadingElement(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-empty-state';

  const title = document.createElement('h2');
  title.textContent = 'Business verileri yükleniyor';

  const text = document.createElement('p');
  text.textContent = 'İşletme metrikleri ve yapay zekâ değerlendirmesi hazırlanıyor.';

  root.append(title, text);
  return root;
}

function createErrorElement(message: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-empty-state';

  const title = document.createElement('h2');
  title.textContent = 'Business verisi alınamadı';

  const text = document.createElement('p');
  text.textContent = message;

  const action = document.createElement('a');
  action.href = '/business/?demo=1';
  action.textContent = 'Demo verisiyle görüntüle';

  root.append(title, text, action);
  return root;
}

export function createBusinessDashboardPageElement(
  options: BusinessDashboardPageOptions = {}
): HTMLElement {
  const data = options.data ?? BUSINESS_DASHBOARD_MOCK;
  const advisor = options.advisor ?? runBusinessIntelligenceEngine();

  return renderDashboard(data, advisor);
}

export async function mountBusinessDashboardPage(
  container: HTMLElement
): Promise<void> {
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const demoMode = params.get('demo') === '1';

  if (demoMode) {
    container.replaceChildren(createBusinessDashboardPageElement());
    return;
  }

  container.replaceChildren(createLoadingElement());

  try {
    const provider = createSupabaseProvider();
    const snapshot = await provider.loadSnapshot();
    const advisor = runBusinessIntelligenceEngine();

    const data: BusinessDashboardMockData = {
      ...BUSINESS_DASHBOARD_MOCK,
      summary: BUSINESS_DASHBOARD_MOCK.summary
    };

    void snapshot;

    container.replaceChildren(renderDashboard(data, advisor));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Beklenmeyen bir Business veri hatası oluştu.';

    container.replaceChildren(createErrorElement(message));
  }
}

export default mountBusinessDashboardPage;
