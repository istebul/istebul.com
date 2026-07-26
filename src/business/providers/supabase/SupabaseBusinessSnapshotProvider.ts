import type {
  BusinessSnapshot,
  BusinessSnapshotProvider,
} from "../BusinessSnapshotProvider";

type SnapshotRow = {
  revenue: number;
  expenses: number;
  profit: number;
  customers: number;
  orders: number;
  updated_at: string;
};

export interface SupabaseLikeClient {
  from(table: string): {
    select(query: string): {
      eq(column: string, value: string): {
        single(): Promise<{
          data: SnapshotRow | null;
          error: Error | null;
        }>;
      };
    };
  };
}

export class SupabaseBusinessSnapshotProvider
  implements BusinessSnapshotProvider
{
  constructor(private readonly client: SupabaseLikeClient) {}

  async getSnapshot(businessId: string): Promise<BusinessSnapshot> {
    const { data, error } = await this.client
      .from("business_snapshots")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (error) throw error;

    const row: SnapshotRow = data ?? {
      revenue: 0,
      expenses: 0,
      profit: 0,
      customers: 0,
      orders: 0,
      updated_at: new Date().toISOString(),
    };

    return {
      revenue: row.revenue,
      expenses: row.expenses,
      profit: row.profit,
      customers: row.customers,
      orders: row.orders,
      updatedAt: row.updated_at,
    };
  }
}
