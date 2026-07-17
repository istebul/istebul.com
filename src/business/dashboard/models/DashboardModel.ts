/**
 * İSTEBUL Business Dashboard Engine — kanonik DashboardModel.
 */

import type { DashboardFilter } from './DashboardFilter';
import type { DashboardKPI } from './DashboardKPI';
import type { DashboardLayout } from './DashboardLayout';
import type { DashboardMetadata } from './DashboardMetadata';
import type { DashboardNavigation } from './DashboardNavigation';
import type { DashboardSection } from './DashboardSection';
import type {
  DashboardExecutionStatus,
  DashboardStage
} from './DashboardStage';
import type { DashboardTheme } from './DashboardTheme';
import type { DashboardWidget } from './DashboardWidget';

/**
 * Analysis / Decision / Report girdilerinden türetilen dashboard modeli.
 * React / grafik kütüphanesi bağlanmaz; yalnızca veri sözleşmesi.
 */
export interface DashboardModel {
  /** Model kimliği */
  id: string;
  /** Üst veri */
  metadata: DashboardMetadata;
  /** Durum */
  status: DashboardExecutionStatus;
  /** Son aşama */
  lastStage: DashboardStage;
  /** Yerleşim */
  layout: DashboardLayout;
  /** Tema */
  theme: DashboardTheme;
  /** Bölümler */
  sections: readonly DashboardSection[];
  /** Widget’lar */
  widgets: readonly DashboardWidget[];
  /** KPI kartları */
  kpis: readonly DashboardKPI[];
  /** Filtreler */
  filters: readonly DashboardFilter[];
  /** Gezinme */
  navigation: DashboardNavigation;
}
