/**
 * İSTEBUL Business Dashboard Engine — runtime pipeline context.
 */

import type { BusinessValidationResult } from '../../../dataset/models/BusinessValidationResult';
import type { DashboardContext } from '../../models/DashboardContext';
import type { DashboardFilter } from '../../models/DashboardFilter';
import type { DashboardKPI } from '../../models/DashboardKPI';
import type { DashboardLayout } from '../../models/DashboardLayout';
import type { DashboardModel } from '../../models/DashboardModel';
import type { DashboardNavigation } from '../../models/DashboardNavigation';
import type { DashboardRequest } from '../../models/DashboardRequest';
import type { DashboardSection } from '../../models/DashboardSection';
import type { DashboardTheme } from '../../models/DashboardTheme';
import type { DashboardWidget } from '../../models/DashboardWidget';
import type { DashboardStageExecution } from './DashboardStageExecution';

/**
 * Dashboard Pipeline ara veri çantası — yalnızca Dashboard Engine anahtarları.
 * Global bag oluşturmaz; Report / Decision / Analysis bag'leri paylaşılmaz.
 */
export interface DashboardPipelineBag {
  /** Kaynak (Analysis / Decision / Report) doğrulama sonucu */
  sourceValidation?: BusinessValidationResult;
  /** Widget placeholder alanı */
  widgets?: readonly DashboardWidget[];
  /** Yerleşim placeholder */
  layout?: DashboardLayout;
  /** Filtre placeholder alanı */
  filters?: readonly DashboardFilter[];
  /** Bölüm placeholder alanı */
  sections?: readonly DashboardSection[];
  /** KPI placeholder alanı */
  kpis?: readonly DashboardKPI[];
  /** Gezinme placeholder */
  navigation?: DashboardNavigation;
  /** Tema placeholder */
  theme?: DashboardTheme;
  /** Taslak DashboardModel placeholder */
  dashboardModel?: DashboardModel;
  /** Diğer ara değerler */
  [key: string]: unknown;
}

export interface DashboardPipelineContext {
  /** Kaynak istek */
  request: DashboardRequest;
  /** Foundation DashboardContext */
  dashboardContext: DashboardContext;
  /** Tamamlanan aşama kayıtları */
  stageExecutions: DashboardStageExecution[];
  /** Dashboard-özel ara veri */
  bag: DashboardPipelineBag;
  /** Pipeline başlangıcı (ISO 8601) */
  startedAt: string;
  /** Monotonik başlangıç işareti (ms) */
  startedMark: number;
}
