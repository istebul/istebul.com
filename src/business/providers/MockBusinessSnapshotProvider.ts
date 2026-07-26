import type {
  BusinessSnapshot,
  BusinessSnapshotProvider,
} from "./BusinessSnapshotProvider";

export class MockBusinessSnapshotProvider
  implements BusinessSnapshotProvider
{
  async getSnapshot(): Promise<BusinessSnapshot> {
    return {
      revenue: 125000,
      expenses: 87000,
      profit: 38000,
      customers: 742,
      orders: 391,
      updatedAt: new Date().toISOString(),
    };
  }
}
