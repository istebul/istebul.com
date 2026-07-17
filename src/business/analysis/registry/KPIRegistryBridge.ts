/**
 * İSTEBUL Business Analysis Engine — Knowledge KPI köprüsü.
 *
 * Knowledge katmanına yazmaz; yalnızca okuma yüzeyi sağlar.
 */

import type { KPIDefinition } from '../../knowledge/kpis/KPIDefinition';
import {
  KPI_COUNT,
  KPI_REGISTRY,
  getKPIById,
  listKPIs,
  listKPIsByCategory
} from '../../knowledge/kpis/KPIRegistry';

export type { KPIDefinition };

/**
 * Analysis Engine için Knowledge KPI kayıtlarına salt okunur köprü.
 */
export const KPI_REGISTRY_BRIDGE = KPI_REGISTRY;

export {
  KPI_COUNT as KPI_REGISTRY_BRIDGE_COUNT,
  getKPIById as getBridgedKPIById,
  listKPIs as listBridgedKPIs,
  listKPIsByCategory as listBridgedKPIsByCategory
};

export default KPI_REGISTRY_BRIDGE;
