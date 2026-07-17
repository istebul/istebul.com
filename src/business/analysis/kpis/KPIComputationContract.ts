/**
 * İSTEBUL Business Analysis Engine — KPI altyapı sözleşmeleri.
 *
 * Gerçek KPI hesaplaması yapılmaz.
 */

import type { BusinessDataset } from '../../dataset/models/BusinessDataset';
import type { KPIDefinition } from '../../knowledge/kpis/KPIDefinition';
import type { KPIResult } from '../models/KPIResult';

/**
 * KPI hesaplama isteği iskeleti.
 */
export interface KPIComputationRequest {
  dataset: BusinessDataset;
  definition: KPIDefinition;
}

/**
 * KPI hesaplama sonucu iskeleti — IKPIEngine ile uyumlu.
 */
export type KPIComputationOutcome = KPIResult;

/**
 * Gelecek KPI hesaplayıcı kaydı (implementasyon yok).
 */
export interface KPIComputationHandler {
  readonly kpiId: string;
  canCompute(definition: KPIDefinition, dataset: BusinessDataset): boolean;
  compute(request: KPIComputationRequest): Promise<KPIComputationOutcome>;
}
