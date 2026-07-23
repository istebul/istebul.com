/**
 * İSTEBUL Core — shared execution metadata contracts (PR-901A).
 *
 * Reserved for bag/metadata helpers. Product metadata models
 * (ExportMetadata, ReportMetadata, …) stay in domain packages.
 */

import type { PipelineBag } from './ExecutionContext';

/**
 * Readonly view of an execution pipeline bag.
 */
export type ExecutionBagMetadata = Readonly<PipelineBag>;

/**
 * Optional opaque metadata record attached to executions.
 * Domains may narrow or ignore this alias.
 */
export type ExecutionMetadata = Readonly<Record<string, unknown>>;
