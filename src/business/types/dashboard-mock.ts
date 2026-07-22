export interface BusinessKpiMock {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'flat';
  hint: string;
}

export interface BusinessActivityMock {
  id: string;
  title: string;
  detail: string;
  timeLabel: string;
}

export interface BusinessAiSuggestionMock {
  id: string;
  title: string;
  body: string;
}

export interface BusinessQuickActionMock {
  id: string;
  label: string;
  href: string;
}

export interface BusinessDailySummaryMock {
  greeting: string;
  headline: string;
  body: string;
  dateLabel: string;
}

export interface BusinessDashboardMockData {
  summary: BusinessDailySummaryMock;
  kpis: readonly BusinessKpiMock[];
  activities: readonly BusinessActivityMock[];
  aiSuggestions: readonly BusinessAiSuggestionMock[];
  quickActions: readonly BusinessQuickActionMock[];
}
