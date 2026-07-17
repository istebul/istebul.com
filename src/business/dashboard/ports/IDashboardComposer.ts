import type { DashboardContext } from '../models/DashboardContext';
import type { DashboardFilter } from '../models/DashboardFilter';
import type { DashboardKPI } from '../models/DashboardKPI';
import type { DashboardLayout } from '../models/DashboardLayout';
import type { DashboardMetadata } from '../models/DashboardMetadata';
import type { DashboardModel } from '../models/DashboardModel';
import type { DashboardNavigation } from '../models/DashboardNavigation';
import type { DashboardSection } from '../models/DashboardSection';
import type { DashboardTheme } from '../models/DashboardTheme';
import type { DashboardWidget } from '../models/DashboardWidget';

export interface IDashboardComposer {
  compose(
    context: DashboardContext,
    parts: Readonly<{
      metadata: DashboardMetadata;
      layout: DashboardLayout;
      theme: DashboardTheme;
      sections: readonly DashboardSection[];
      widgets: readonly DashboardWidget[];
      kpis: readonly DashboardKPI[];
      filters: readonly DashboardFilter[];
      navigation: DashboardNavigation;
    }>
  ): Promise<DashboardModel>;
}
