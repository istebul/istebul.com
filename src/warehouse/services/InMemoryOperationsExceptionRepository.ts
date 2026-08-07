import type {
  OperationsExceptionFilter,
  OperationsExceptionRecord,
} from "../types/OperationsExceptionAnalytics";
import type {
  OperationsExceptionRepository,
} from "./OperationsExceptionRepository";

export class InMemoryOperationsExceptionRepository
  implements OperationsExceptionRepository
{
  private readonly records =
    new Map<string, OperationsExceptionRecord>();

  private key(
    tenantId: string,
    exceptionId: string,
  ): string {
    return `${tenantId}:${exceptionId}`;
  }

  async save(
    record: OperationsExceptionRecord,
  ): Promise<OperationsExceptionRecord> {
    this.records.set(
      this.key(
        record.tenantId,
        record.id,
      ),
      structuredClone(record),
    );

    return structuredClone(record);
  }

  async findById(
    tenantId: string,
    exceptionId: string,
  ): Promise<OperationsExceptionRecord | null> {
    const record =
      this.records.get(
        this.key(
          tenantId,
          exceptionId,
        ),
      );

    return record
      ? structuredClone(record)
      : null;
  }

  async list(
    filter: OperationsExceptionFilter,
  ): Promise<OperationsExceptionRecord[]> {
    return [...this.records.values()]
      .filter(
        (record) =>
          record.tenantId ===
          filter.tenantId,
      )
      .filter(
        (record) =>
          filter.warehouseId === undefined ||
          record.warehouseId ===
          filter.warehouseId,
      )
      .filter(
        (record) =>
          record.occurredAt >=
            filter.periodStart &&
          record.occurredAt <=
            filter.periodEnd,
      )
      .filter(
        (record) =>
          filter.process === undefined ||
          record.process ===
          filter.process,
      )
      .filter(
        (record) =>
          filter.severity === undefined ||
          record.severity ===
          filter.severity,
      )
      .filter(
        (record) =>
          filter.unresolvedOnly !== true ||
          record.resolvedAt ===
          undefined,
      )
      .sort(
        (left, right) =>
          right.occurredAt.localeCompare(
            left.occurredAt,
          ) ||
          left.id.localeCompare(
            right.id,
          ),
      )
      .map(
        (record) =>
          structuredClone(record),
      );
  }
}
