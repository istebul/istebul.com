import type { AuthorizationStatus } from '../types.ts';

/** Allowed transitions for the authorization state machine. */
const TRANSITIONS: Record<AuthorizationStatus, AuthorizationStatus[]> = {
  pending: ['authorized', 'expired', 'cancelled'],
  authorized: ['captured', 'released', 'expired', 'cancelled'],
  captured: ['refunded'],
  released: [],
  refunded: [],
  expired: [],
  cancelled: [],
};

export function canTransition(
  from: AuthorizationStatus,
  to: AuthorizationStatus,
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(
  from: AuthorizationStatus,
  to: AuthorizationStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid payment lifecycle transition: ${from} → ${to}`);
  }
}

export function lifecycleOrder(): AuthorizationStatus[] {
  return [
    'pending',
    'authorized',
    'captured',
    'released',
    'refunded',
    'expired',
    'cancelled',
  ];
}
