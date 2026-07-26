import type {
  BusinessSnapshot,
  BusinessSnapshotProvider,
} from "../BusinessSnapshotProvider";

export interface SupabaseLikeClient {
  from(table: string): {
    select(query: string): any;
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

    return {
      revenue: data.revenue ?? 0,
      expenses: data.expenses ?? 0,
      profit: data.profit ?? 0,
      customers: data.customers ?? 0,
      orders: data.orders ?? 0,
      updatedAt: data.updated_at,
    };
  }
}
