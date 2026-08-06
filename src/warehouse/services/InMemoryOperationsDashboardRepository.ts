import type {
  OperationsDashboardFilter,
  OperationsDashboardSnapshot,
} from "../types/OperationsDashboard";
import type {
  OperationsDashboardRepository,
} from "./OperationsDashboardRepository";

export class InMemoryOperationsDashboardRepository
  implements OperationsDashboardRepository
{
  private readonly snapshots =
    new Map<string, OperationsDashboardSnapshot>();

  private key(
    tenantId: string,
    snapshotId: string,
  ): string {
    return `${tenantId}:${snapshotId}`;
  }

  async save(
    snapshot: OperationsDashboardSnapshot,
  ): Promise<OperationsDashboardSnapshot> {
    this.snapshots.set(
      this.key(
        snapshot.tenantId,
        snapshot.id,
      ),
      structuredClone(snapshot),
    );

    return structuredClone(snapshot);
  }

  async findById(
    tenantId: string,
    snapshotId: string,
  ): Promise<OperationsDashboardSnapshot | null> {
    const snapshot =
      this.snapshots.get(
        this.key(
          tenantId,
          snapshotId,
        ),
      );

    return snapshot
      ? structuredClone(snapshot)
      : null;
  }

  async findLatest(
    filter: OperationsDashboardFilter,
  ): Promise<OperationsDashboardSnapshot | null> {
    const [latest] =
      await this.list(filter);

    return latest ?? null;
  }

  async list(
    filter: OperationsDashboardFilter,
  ): Promise<OperationsDashboardSnapshot[]> {
    return [...this.snapshots.values()]
      .filter(
        (snapshot) =>
          snapshot.tenantId ===
          filter.tenantId,
      )
      .filter(
        (snapshot) =>
          filter.warehouseId === undefined ||
          snapshot.warehouseId ===
          filter.warehouseId,
      )
      .filter(
        (snapshot) =>
          filter.periodStart === undefined ||
          snapshot.periodEnd >=
          filter.periodStart,
      )
      .filter(
        (snapshot) =>
          filter.periodEnd === undefined ||
          snapshot.periodStart <=
          filter.periodEnd,
      )
      .sort(
        (left, right) =>
          right.calculatedAt.localeCompare(
            left.calculatedAt,
          ),
      )
      .map(
        (snapshot) =>
          structuredClone(snapshot),
      );
  }
}
