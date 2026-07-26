export interface BusinessSnapshot {
  revenue: number;
  expenses: number;
  profit: number;
  customers: number;
  orders: number;
  updatedAt: string;
}

export interface BusinessSnapshotProvider {
  getSnapshot(businessId: string): Promise<BusinessSnapshot>;
}
