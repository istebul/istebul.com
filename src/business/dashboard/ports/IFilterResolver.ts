import type { DashboardContext } from '../models/DashboardContext';
import type { DashboardFilter } from '../models/DashboardFilter';

export interface IFilterResolver {
  resolve(
    context: DashboardContext,
    filterIds?: readonly string[]
  ): Promise<readonly DashboardFilter[]>;
}
