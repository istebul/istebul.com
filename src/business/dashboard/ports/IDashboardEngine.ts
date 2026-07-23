import type { DashboardContext } from '../models/DashboardContext';
import type { DashboardModel } from '../models/DashboardModel';
import type { DashboardRequest } from '../models/DashboardRequest';

export interface IDashboardEngine {
  /**
   * Analysis / Decision / Report girdilerinden DashboardModel üretir.
   * Bu PR’da implementasyon yoktur.
   */
  buildDashboard(
    request: DashboardRequest,
    context: DashboardContext
  ): Promise<DashboardModel>;
}
