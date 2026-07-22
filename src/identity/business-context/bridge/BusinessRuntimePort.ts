/**
 * İSTEBUL Identity — Business Runtime DI port (EPIC-302D).
 *
 * Business Admin / Business Runtime dosyalarına bağımlılık yoktur.
 * Concrete BusinessAdminRuntime bu porta yapısal olarak uyar.
 * Singleton / global state yoktur.
 */

/**
 * Business runtime girdi bağlamı (BusinessAdminContext ile uyumlu).
 */
export interface BusinessRuntimeExecutionContext {
  tenantId: string;
  locale: 'tr' | 'en';
  actorId?: string;
  moduleIds?: readonly string[];
  bag?: Record<string, unknown>;
}

/**
 * Business modül projeksiyonu (port çıktısı).
 */
export interface BusinessRuntimeModuleProjection {
  moduleId: string;
  name: string;
  description: string;
  status: string;
  category: string;
  available: boolean;
}

/**
 * Business runtime yürütme sonucu (BusinessAdminResult ile uyumlu).
 */
export interface BusinessRuntimeExecutionResult {
  modules: readonly BusinessRuntimeModuleProjection[];
  summary: {
    success: boolean;
    moduleCount: number;
    requestedCount: number;
    unavailableCount: number;
    tenantId: string;
  };
  summaryItems: readonly {
    key: string;
    label: string;
    value: string | number | boolean;
  }[];
  validationIssues: readonly {
    code: string;
    message: string;
    severity: 'warning' | 'error';
  }[];
  telemetry: {
    durationMs: number;
    startedAt: string;
    endedAt: string;
    registeredModuleCount: number;
    summaryItemCount: number;
  };
}

/**
 * Business Runtime port — DI ile enjekte edilir.
 */
export interface BusinessRuntimePort {
  execute(
    context: BusinessRuntimeExecutionContext
  ): BusinessRuntimeExecutionResult;
}
