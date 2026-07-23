import type { DashboardContext } from '../models/DashboardContext';
import type { DashboardWidget } from '../models/DashboardWidget';

export interface IWidgetBuilder {
  build(
    context: DashboardContext,
    widgetCodes: readonly string[]
  ): Promise<readonly DashboardWidget[]>;
}
