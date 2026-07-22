/**
 * İSTEBUL Core — shared execution locale & context contracts (PR-901A).
 *
 * Type-only. Domain contexts extend or compose these shapes.
 * No runtime behavior.
 */

/**
 * Canonical supported execution locales.
 */
export type ExecutionLocale = 'tr' | 'en';

/**
 * Locale input accepted by E2E execution contexts.
 * Invalid values are rejected by domain validation stages.
 */
export type ExecutionLocaleInput = ExecutionLocale | (string & {});

/**
 * Instance-scoped pipeline bag — no global bag.
 */
export type PipelineBag = Record<string, unknown>;

/**
 * Shared optional fields for end-to-end execution contexts.
 * Domain contexts add domain-specific filters and inputs.
 */
export interface ExecutionContextBase {
  /**
   * Dil — domain default typically `tr`.
   * Invalid values produce validation errors in domain pipelines.
   */
  locale?: ExecutionLocaleInput;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Başlangıç pipeline bag */
  initialBag?: PipelineBag;
}
