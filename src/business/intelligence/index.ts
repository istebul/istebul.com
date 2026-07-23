/**
 * Business Intelligence Engine (EPIC-510 → EPIC-560)
 *
 * Provider (mock default; live adapters via ProviderResolver) →
 * Analytics → Scoring → Health → KPI → Event Intelligence →
 * Metrics → Insight → Recommendation → Advisor
 *
 * Live adapters are foundation stubs only. No API, DB, auth, or tenant calls.
 */

export { MOCK_BUSINESS_RAW_DATA } from './data/mock-business-data';
export {
  MockBusinessDataProvider,
  createMockBusinessDataProvider
} from './providers/MockDataProvider';
export {
  MockBusinessProvider,
  createMockBusinessProvider
} from '../providers/MockBusinessProvider';
export {
  createBusinessDataProvider,
  getDefaultBusinessDataProvider,
  resolveBusinessProvider,
  createProviderResolver,
  resolveBusinessDataProvider
} from '../providers/ProviderFactory';
export type {
  ProviderFactoryOptions,
  ProviderResolveOptions,
  ProviderResolveResult
} from '../providers/ProviderFactory';
export {
  SupabaseProvider,
  createSupabaseProvider
} from '../providers/adapters/SupabaseProvider';
export { ERPProvider, createERPProvider } from '../providers/adapters/ERPProvider';
export {
  GarsonAIProvider,
  createGarsonAIProvider
} from '../providers/adapters/GarsonAIProvider';
export { ProviderResolver } from '../providers/core/ProviderResolver';
export {
  getProviderCapabilities,
  listProviderCapabilities,
  PROVIDER_CAPABILITIES
} from '../providers/core/ProviderCapabilities';
export {
  ProviderNotReadyError,
  createProviderStatus,
  validateProviderCapabilities,
  isProviderReady
} from '../providers/utils/provider-validator';
export type { ProviderStatusCode } from '../providers/models/provider-status';
export { computeBusinessMetrics, MetricsEngine } from '../services/MetricsEngine';
export { computeBusinessInsights, InsightEngine } from '../services/InsightEngine';
export {
  computeBusinessRecommendations,
  RecommendationEngine
} from '../services/RecommendationEngine';
export {
  runBusinessIntelligenceEngine
} from './pipeline/BusinessIntelligenceEngine';
export type {
  BusinessIntelligenceEngineOptions,
  BusinessAdvisorResultWithHealth
} from './pipeline/BusinessIntelligenceEngine';

export { AnalyticsEngine, createAnalyticsEngine } from './core/AnalyticsEngine';
export type { AnalyticsEngineOptions } from './core/AnalyticsEngine';
export {
  AnalyticsRegistry,
  createDefaultAnalyticsRegistry
} from './core/AnalyticsRegistry';

export { ScoringEngine, createScoringEngine } from './scoring/ScoringEngine';
export { RevenueScorer } from './scoring/RevenueScorer';
export { GrowthScorer } from './scoring/GrowthScorer';
export { CustomerScorer } from './scoring/CustomerScorer';
export { InventoryScorer } from './scoring/InventoryScorer';
export { CashFlowScorer } from './scoring/CashFlowScorer';
export { RiskScorer } from './scoring/RiskScorer';
export { OpportunityScorer } from './scoring/OpportunityScorer';

export {
  BusinessHealthEngine,
  createBusinessHealthEngine
} from './health/BusinessHealthEngine';
export type { BusinessHealthEngineOptions } from './health/BusinessHealthEngine';
export {
  buildExecutiveKpis,
  resolveHealthLabel,
  bandFromOverall
} from './health/ExecutiveScore';

export { KPIEngine, createKPIEngine } from './kpi/KPIEngine';
export type { KPIEngineOptions } from './kpi/KPIEngine';
export { KPIRegistry, createDefaultKPIRegistry } from './kpi/KPIRegistry';
export {
  createKpiSnapshot,
  createKpiSnapshotFromRegistry,
  computeKpiValues
} from './kpi/KPISnapshot';
export { buildKpiTrend, buildKpiTrends } from './kpi/KPITrend';

export { createBusinessEvent, synthesizeEventsFromKpiSnapshot } from './events/BusinessEvent';
export { EventBus, createEventBus } from './events/EventBus';
export { EventRegistry, createDefaultEventRegistry } from './events/EventRegistry';
export {
  EventProcessor,
  createEventProcessor,
  applyEventPatchesToSnapshot
} from './events/EventProcessor';
export type { EventProcessorOptions } from './events/EventProcessor';

export { RevenueAnalytics } from './analytics/RevenueAnalytics';
export { GrowthAnalytics } from './analytics/GrowthAnalytics';
export { CustomerAnalytics } from './analytics/CustomerAnalytics';
export { InventoryAnalytics } from './analytics/InventoryAnalytics';
export { CashFlowAnalytics } from './analytics/CashFlowAnalytics';
export { RiskAnalytics } from './analytics/RiskAnalytics';
export { OpportunityAnalytics } from './analytics/OpportunityAnalytics';

export type {
  BusinessAnalyticsModuleId,
  BusinessAnalyticsModule,
  BusinessAnalyticsModuleResult,
  BusinessAnalyticsSnapshot
} from './models/analytics';
export type {
  BusinessScorerId,
  BusinessScorer,
  DomainScore,
  ExecutiveKpi,
  HealthBand,
  BusinessHealthResult,
  ScoringEngineResult
} from './models/business-health';
export type {
  BusinessKpiId,
  BusinessKpiDefinition,
  BusinessKpiValue,
  BusinessKpiTrend,
  BusinessKpiSignals,
  BusinessKpiSnapshot,
  BusinessKpiPlugin,
  KpiComputeInput,
  KpiUnit
} from './models/business-kpi';
export type {
  BusinessEventType,
  BusinessEvent,
  BusinessEventHandler,
  BusinessEventTypeDefinition,
  EventProcessorResult,
  EventIntelligenceResult
} from './models/business-events';

export type {
  BusinessDataProvider,
  BusinessProviderAdapter,
  BusinessProviderKind,
  ProviderCapabilities,
  ProviderStatus
} from '../types/business-provider';
export type {
  IBusinessDataProvider,
  RawBusinessData,
  BusinessDataPoint,
  BusinessCategoryMargin
} from './types/raw-business-data';
export type {
  BusinessMetric,
  BusinessMetricId,
  BusinessMetricsResult,
  MetricTrendDirection
} from './types/business-metrics';
export type {
  BusinessInsight,
  BusinessInsightsResult,
  InsightKind,
  InsightSeverity
} from './types/business-insight';
export type {
  BusinessRecommendation,
  BusinessRecommendationsResult,
  RecommendationPriority
} from './types/business-recommendation';
export type { BusinessAdvisorResult } from './types/advisor-result';
export type {
  BusinessMetricSignals,
  MetricsEngineResult
} from '../services/MetricsEngine';
export type { InsightEngineResult } from '../services/InsightEngine';
