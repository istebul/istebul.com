import { BUSINESS_DASHBOARD_MOCK } from '../data/dashboard-mock';
import { createBusinessDailySummaryElement } from '../components/BusinessDailySummary';
import { createBusinessKpiCardElement } from '../components/BusinessKpiCard';
import { createBusinessActivityListElement } from '../components/BusinessActivityList';
import { createBusinessAiSuggestionsElement } from '../components/BusinessAiSuggestions';
import { createBusinessQuickActionsElement } from '../components/BusinessQuickActions';
import { createBusinessAdvisorPanelElement } from '../components/BusinessAdvisorPanel';
import { runBusinessIntelligenceEngine } from '../intelligence/pipeline/BusinessIntelligenceEngine';
import type { BusinessRuntime } from '../app/BusinessRuntime';
import type {
  StoredBusinessDocumentAnalysis
} from '../document-intelligence/providers/supabase/SupabaseBusinessDocumentAnalysisProvider';
import type {
  BusinessDashboardMockData,
  BusinessKpiMock
} from '../types/dashboard-mock';
import type { BusinessAdvisorResult } from '../intelligence/types/advisor-result';
import type { BusinessKpi } from '../document-intelligence';

export interface BusinessDashboardPageOptions {
  data?: BusinessDashboardMockData;
  advisor?: BusinessAdvisorResult;
  analysis?: StoredBusinessDocumentAnalysis;
}

export interface MountBusinessDashboardPageOptions {
  runtime?: BusinessRuntime;
  businessId?: string;
}

function formatKpiValue(kpi: BusinessKpi): string {
  const formatted = kpi.value.toLocaleString('tr-TR', {
    maximumFractionDigits: 2
  });

  if (kpi.unit === 'TRY') return `${formatted} ₺`;
  if (kpi.unit === '%') return `%${formatted}`;
  if (kpi.unit) return `${formatted} ${kpi.unit}`;

  return formatted;
}

function mapAnalysisKpis(
  analysis: StoredBusinessDocumentAnalysis
): readonly BusinessKpiMock[] {
  const semantic = analysis.kpis.filter((kpi) =>
    kpi.id.startsWith('semantic_')
  );

  const selected =
    semantic.length > 0
      ? semantic.slice(0, 8)
      : analysis.kpis.slice(0, 8);

  return Object.freeze(
    selected.map((kpi) =>
      Object.freeze({
        id: kpi.id,
        label: kpi.label,
        value: formatKpiValue(kpi),
        delta: 'Canlı',
        trend: 'flat' as const,
        hint: 'Son analiz'
      })
    )
  );
}

function mapAnalysisToDashboard(
  analysis: StoredBusinessDocumentAnalysis
): BusinessDashboardMockData {
  const createdAt = new Date(analysis.createdAt);

  const dateLabel = Number.isNaN(createdAt.getTime())
    ? 'Son analiz'
    : new Intl.DateTimeFormat('tr-TR', {
        dateStyle: 'long',
        timeStyle: 'short'
      }).format(createdAt);

  const activities = analysis.insights.slice(0, 4).map(
    (insight, index) =>
      Object.freeze({
        id: insight.id || `insight-${index}`,
        title: insight.title,
        detail: insight.description,
        timeLabel: 'Son analiz'
      })
  );

  const aiSuggestions = analysis.recommendations
    .slice(0, 4)
    .map((recommendation, index) =>
      Object.freeze({
        id: `recommendation-${index + 1}`,
        title: `Önerilen aksiyon ${index + 1}`,
        body: recommendation
      })
    );

  return {
    summary: Object.freeze({
      greeting: 'Yönetici özeti',
      headline: `İşletme sağlık skoru: ${analysis.score}/100`,
      body: analysis.summary,
      dateLabel
    }),
    kpis: mapAnalysisKpis(analysis),
    activities: Object.freeze(activities),
    aiSuggestions: Object.freeze(aiSuggestions),
    quickActions: BUSINESS_DASHBOARD_MOCK.quickActions
  };
}

function renderDashboard(
  data: BusinessDashboardMockData,
  advisor: BusinessAdvisorResult
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-dashboard';
  root.dataset.businessPage = 'dashboard';

  root.appendChild(
    createBusinessDailySummaryElement({
      summary: data.summary
    })
  );

  const kpiGrid = document.createElement('section');
  kpiGrid.className = 'ib-biz-kpi-grid';
  kpiGrid.setAttribute('aria-label', 'KPI kartları');

  for (const kpi of data.kpis) {
    kpiGrid.appendChild(
      createBusinessKpiCardElement({ kpi })
    );
  }

  root.appendChild(kpiGrid);

  root.appendChild(
    createBusinessAdvisorPanelElement({
      advisor,
      compact: true
    })
  );

  const columns = document.createElement('div');
  columns.className = 'ib-biz-dashboard__columns';

  columns.append(
    createBusinessActivityListElement({
      items: data.activities
    }),
    createBusinessAiSuggestionsElement({
      items: data.aiSuggestions
    })
  );

  root.appendChild(columns);

  root.appendChild(
    createBusinessQuickActionsElement({
      items: data.quickActions
    })
  );

  return root;
}

function createLoadingElement(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-empty-state';

  const title = document.createElement('h2');
  title.textContent = 'Yönetici paneli hazırlanıyor';

  const text = document.createElement('p');
  text.textContent =
    'Son işletme analizi ve yönetici KPI’ları yükleniyor.';

  root.append(title, text);

  return root;
}

function createNoAnalysisElement(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-empty-state';
  root.dataset.businessDashboardEmpty = '1';

  const title = document.createElement('h2');
  title.textContent = 'Henüz canlı analiz bulunmuyor';

  const text = document.createElement('p');
  text.textContent =
    'Yönetici panelini gerçek işletme verileriyle doldurmak için ilk analizinizi oluşturun.';

  const action = document.createElement('a');
  action.className =
    'ib-biz-button ib-biz-button-primary';
  action.href = '/business/analizler/';
  action.textContent = 'Yeni analiz oluştur';

  root.append(title, text, action);

  return root;
}

function createErrorElement(message: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ib-biz-empty-state';

  const title = document.createElement('h2');
  title.textContent = 'Yönetici paneli yüklenemedi';

  const text = document.createElement('p');
  text.textContent = message;

  const action = document.createElement('a');
  action.href = '/business/analizler/';
  action.textContent = 'Analizler ekranına git';

  root.append(title, text, action);

  return root;
}

export function createBusinessDashboardPageElement(
  options: BusinessDashboardPageOptions = {}
): HTMLElement {
  const data = options.analysis
    ? mapAnalysisToDashboard(options.analysis)
    : options.data ?? BUSINESS_DASHBOARD_MOCK;

  const advisor =
    options.advisor ??
    runBusinessIntelligenceEngine();

  return renderDashboard(data, advisor);
}

export async function mountBusinessDashboardPage(
  container: HTMLElement,
  options: MountBusinessDashboardPageOptions = {}
): Promise<void> {
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  if (params.get('demo') === '1') {
    container.replaceChildren(
      createBusinessDashboardPageElement()
    );
    return;
  }

  if (!options.runtime || !options.businessId) {
    container.replaceChildren(
      createErrorElement(
        'Oturum veya işletme bilgisi hazırlanamadı.'
      )
    );
    return;
  }

  container.replaceChildren(createLoadingElement());

  try {
    const analyses =
      await options.runtime.documentAnalyses.listByBusiness(
        options.businessId
      );

    const latestAnalysis = analyses[0];

    if (!latestAnalysis) {
      container.replaceChildren(
        createNoAnalysisElement()
      );
      return;
    }

    container.replaceChildren(
      createBusinessDashboardPageElement({
        analysis: latestAnalysis
      })
    );
  } catch (error) {
    container.replaceChildren(
      createErrorElement(
        error instanceof Error
          ? error.message
          : 'Beklenmeyen bir Business veri hatası oluştu.'
      )
    );
  }
}

export default mountBusinessDashboardPage;
