import type { ProviderCapabilities } from '../models/provider-capabilities';
import type { ProviderStatus, ProviderStatusCode } from '../models/provider-status';
import type { BusinessProviderKind } from '../../types/business-provider';

export class ProviderNotReadyError extends Error {
  readonly kind: BusinessProviderKind;
  readonly status: ProviderStatus;

  constructor(kind: BusinessProviderKind, status: ProviderStatus) {
    super(
      `Business provider "${kind}" is not ready (${status.code}): ${status.message}`
    );
    this.name = 'ProviderNotReadyError';
    this.kind = kind;
    this.status = status;
  }
}

/** Build a frozen ProviderStatus record. */
export function createProviderStatus(params: {
  kind: BusinessProviderKind | string;
  code: ProviderStatusCode;
  message: string;
  ready?: boolean;
  checkedAt?: string;
}): ProviderStatus {
  const ready = params.ready ?? params.code === 'ready';
  return Object.freeze({
    kind: params.kind,
    code: params.code,
    ready,
    message: params.message,
    checkedAt: params.checkedAt ?? new Date(0).toISOString()
  });
}

/** True when capabilities look structurally valid. */
export function validateProviderCapabilities(
  capabilities: ProviderCapabilities | null | undefined
): boolean {
  if (!capabilities || typeof capabilities !== 'object') return false;
  if (!capabilities.kind || typeof capabilities.kind !== 'string') return false;
  if (typeof capabilities.live !== 'boolean') return false;
  if (typeof capabilities.supportsRealtime !== 'boolean') return false;
  if (typeof capabilities.supportsHistorical !== 'boolean') return false;
  if (typeof capabilities.requiresAuth !== 'boolean') return false;
  if (typeof capabilities.requiresNetwork !== 'boolean') return false;
  if (!capabilities.label || typeof capabilities.label !== 'string') return false;
  return true;
}

/**
 * Validate that a provider status is ready for live snapshot use.
 * Mock providers with code `ready` pass; stub/unavailable live adapters fail.
 */
export function isProviderReady(status: ProviderStatus | null | undefined): boolean {
  return Boolean(status && status.ready && status.code === 'ready');
}

export default validateProviderCapabilities;
