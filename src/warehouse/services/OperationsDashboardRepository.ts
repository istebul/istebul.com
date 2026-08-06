import type {
  OperationsDashboardFilter,
  OperationsDashboardSnapshot,
} from "../types/OperationsDashboard";

export interface OperationsDashboardRepository {
  save(
    snapshot: OperationsDashboardSnapshot,
  ): Promise<OperationsDashboardSnapshot>;

  findById(
    tenantId: string,
    snapshotId: string,
  ): Promise<OperationsDashboardSnapshot | null>;

  findLatest(
    filter: OperationsDashboardFilter,
  ): Promise<OperationsDashboardSnapshot | null>;

  list(
    filter: OperationsDashboardFilter,
  ): Promise<OperationsDashboardSnapshot[]>;
}
