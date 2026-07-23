/**
 * İSTEBUL Business Import Engine — standart runtime hata yardımcıları.
 */

import type { ImportError } from '../../types/ImportError';
import type { ImportStage } from '../../types/ImportStage';

/** Kararlı hata kodları */
export const IMPORT_RUNTIME_ERROR_CODES = Object.freeze({
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  ADAPTER_NOT_FOUND: 'ADAPTER_NOT_FOUND',
  INVALID_REQUEST: 'INVALID_REQUEST',
  STAGE_FAILED: 'STAGE_FAILED',
  UNEXPECTED: 'UNEXPECTED'
} as const);

export type ImportRuntimeErrorCode =
  (typeof IMPORT_RUNTIME_ERROR_CODES)[keyof typeof IMPORT_RUNTIME_ERROR_CODES];

export function createImportError(
  code: string,
  message: string,
  options?: Readonly<{
    stage?: ImportStage;
    detail?: string;
    recoverable?: boolean;
  }>
): ImportError {
  return {
    code,
    message,
    stage: options?.stage,
    detail: options?.detail,
    recoverable: options?.recoverable
  };
}

export function createNotImplementedError(
  stage: ImportStage,
  stageName: string
): ImportError {
  return createImportError(
    IMPORT_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED,
    `${stageName} aşaması henüz uygulanmadı.`,
    {
      stage,
      detail: `Stage '${stage}' is not implemented in Import Pipeline Runtime (PR-101A).`,
      recoverable: false
    }
  );
}
