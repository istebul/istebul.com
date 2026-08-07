import type {
  OperationsExceptionFilter,
  OperationsExceptionRecord,
} from "../types/OperationsExceptionAnalytics";

export interface OperationsExceptionRepository {
  save(
    record: OperationsExceptionRecord,
  ): Promise<OperationsExceptionRecord>;

  findById(
    tenantId: string,
    exceptionId: string,
  ): Promise<OperationsExceptionRecord | null>;

  list(
    filter: OperationsExceptionFilter,
  ): Promise<OperationsExceptionRecord[]>;
}
