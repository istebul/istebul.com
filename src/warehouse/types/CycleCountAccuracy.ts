export interface CycleCountAccuracy {
  readonly tenantId: string;
  readonly warehouseId?: string;
  readonly locationId?: string;
  readonly productId?: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalCountedItems: number;
  readonly matchedItems: number;
  readonly varianceItems: number;
  readonly recountItems: number;
  readonly adjustedItems: number;
  readonly totalExpectedQuantity: number;
  readonly totalCountedQuantity: number;
  readonly totalAbsoluteVariance: number;
  readonly totalVarianceValue: number;
  readonly quantityAccuracyRate: number;
  readonly lineAccuracyRate: number;
  readonly firstCountAccuracyRate: number;
  readonly adjustmentRate: number;
  readonly calculatedAt: string;
}

export interface CycleCountAccuracyFilter {
  tenantId: string;
  warehouseId?: string;
  locationId?: string;
  productId?: string;
  periodStart: string;
  periodEnd: string;
}
