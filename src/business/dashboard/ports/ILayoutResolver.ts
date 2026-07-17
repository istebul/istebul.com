import type { DashboardContext } from '../models/DashboardContext';
import type { DashboardLayout } from '../models/DashboardLayout';

export interface ILayoutResolver {
  resolve(
    context: DashboardContext,
    layoutId: string
  ): Promise<DashboardLayout>;
}
