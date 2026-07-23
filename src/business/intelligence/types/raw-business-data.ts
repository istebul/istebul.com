/** Raw snapshot fed by Data Provider — mock-only for EPIC-510/520. */
export interface BusinessDataPoint {
  label: string;
  value: number;
}

export interface BusinessCategoryMargin {
  category: string;
  marginPercent: number;
}

export interface RawBusinessData {
  /** ISO date of snapshot */
  asOf: string;
  currency: 'TRY';
  revenueSeries: readonly BusinessDataPoint[];
  costSeries: readonly BusinessDataPoint[];
  customerCount: number;
  previousCustomerCount: number;
  churnRatePercent: number;
  stockDaysRemaining: number;
  categoryMargins: readonly BusinessCategoryMargin[];
  cashFlowSeries: readonly BusinessDataPoint[];
}

/**
 * @deprecated Prefer `BusinessDataProvider` from `src/business/types/business-provider.ts`.
 * Kept for EPIC-510 compatibility; includes provider `kind`.
 */
export interface IBusinessDataProvider {
  readonly kind: 'mock';
  /** Returns a frozen snapshot; never hits network/DB. */
  getSnapshot(): RawBusinessData;
}
