/** Raw snapshot fed by Data Provider — mock-only for EPIC-510. */
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

export interface IBusinessDataProvider {
  /** Returns a frozen snapshot; never hits network/DB. */
  getSnapshot(): RawBusinessData;
}
