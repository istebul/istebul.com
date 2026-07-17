/**
 * Dashboard yerleşim kayıt sözleşmesi.
 */

import type { DashboardDensity } from '../models/DashboardLayout';

export interface DashboardLayoutDefinitionEntry {
  id: string;
  name: string;
  description: string;
  columnCount: number;
  density: DashboardDensity;
  version: string;
}
