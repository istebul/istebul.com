/**
 * EPIC-570 — Runtime health projection (not BusinessHealthEngine).
 *
 * Describes the health of a BusinessRuntime execution / provider lifecycle,
 * separate from domain business-health scoring (EPIC-540).
 */

import type { BusinessProviderKind } from '../types/business-provider';

export type RuntimeHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'idle';

export type RuntimeProviderLifecycle =
  | 'idle'
  | 'resolving'
  | 'ready'
  | 'executing'
  | 'complete'
  | 'failed';

/**
 * Runtime-level health snapshot for ops / telemetry surfaces.
 */
export interface RuntimeHealth {
  status: RuntimeHealthStatus;
  lifecycle: RuntimeProviderLifecycle;
  providerReady: boolean;
  requestedProviderKind: BusinessProviderKind;
  resolvedProviderKind: BusinessProviderKind;
  fellBackToMock: boolean;
  timedOut: boolean;
  cacheHit: boolean;
  message: string;
  checkedAt: string;
  tenantId: string | null;
}

export interface BuildRuntimeHealthInput {
  lifecycle: RuntimeProviderLifecycle;
  providerReady: boolean;
  requestedProviderKind: BusinessProviderKind;
  resolvedProviderKind: BusinessProviderKind;
  fellBackToMock: boolean;
  timedOut: boolean;
  cacheHit: boolean;
  tenantId: string | null;
  errorMessage?: string;
  checkedAt?: string;
}

/**
 * Derive a RuntimeHealth record from execution outcomes.
 */
export function buildRuntimeHealth(input: BuildRuntimeHealthInput): RuntimeHealth {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  let status: RuntimeHealthStatus = 'healthy';
  let message = 'BusinessRuntime execution completed successfully.';

  if (input.lifecycle === 'idle') {
    status = 'idle';
    message = 'BusinessRuntime has not executed yet.';
  } else if (input.lifecycle === 'failed' || input.errorMessage) {
    status = 'unhealthy';
    message = input.errorMessage ?? 'BusinessRuntime execution failed.';
  } else if (input.timedOut || input.fellBackToMock || !input.providerReady) {
    status = 'degraded';
    const reasons: string[] = [];
    if (input.timedOut) reasons.push('timeout exceeded');
    if (input.fellBackToMock) reasons.push('fell back to mock provider');
    if (!input.providerReady) reasons.push('provider not ready');
    message = `BusinessRuntime degraded: ${reasons.join('; ')}.`;
  } else if (input.cacheHit) {
    message = 'BusinessRuntime served from cache.';
  }

  return Object.freeze({
    status,
    lifecycle: input.lifecycle,
    providerReady: input.providerReady,
    requestedProviderKind: input.requestedProviderKind,
    resolvedProviderKind: input.resolvedProviderKind,
    fellBackToMock: input.fellBackToMock,
    timedOut: input.timedOut,
    cacheHit: input.cacheHit,
    message,
    checkedAt,
    tenantId: input.tenantId
  });
}

/** Idle health used before the first execution. */
export function createIdleRuntimeHealth(): RuntimeHealth {
  return buildRuntimeHealth({
    lifecycle: 'idle',
    providerReady: false,
    requestedProviderKind: 'mock',
    resolvedProviderKind: 'mock',
    fellBackToMock: false,
    timedOut: false,
    cacheHit: false,
    tenantId: null
  });
}
