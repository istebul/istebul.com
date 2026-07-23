/**
 * İSTEBUL Identity — yerleşik session tanımları (PR-203C).
 *
 * Projection-only örnek kayıtlar. JWT / Cookie / Refresh Token yok.
 */

import type { SessionModule } from './SessionModule';

/**
 * Yerleşik Session Module iskeletleri.
 */
export const BUILTIN_SESSION_MODULES: readonly SessionModule[] = Object.freeze([
  {
    id: 'session-owner-001',
    session: {
      sessionId: 'sess-owner-001',
      identityId: 'identity-platform-owner-001',
      authenticationId: 'auth-owner-001',
      principalId: 'principal-owner-001',
      state: 'active',
      lifetime: {
        startedAt: '2026-07-21T09:00:00.000Z',
        endsAt: '2026-07-22T09:00:00.000Z',
        durationSeconds: 86400
      },
      expiration: {
        expiresAt: '2026-07-22T09:00:00.000Z',
        isExpired: false
      },
      renewalReference: {
        renewalId: 'renew-owner-001',
        lastRenewedAt: '2026-07-21T09:00:00.000Z',
        nextRenewalAt: '2026-07-22T03:00:00.000Z'
      },
      activity: {
        lastActivityAt: '2026-07-21T18:00:00.000Z',
        activityCount: 12,
        lastAction: 'dashboard-view'
      },
      deviceReference: {
        deviceId: 'device-web-owner-001',
        label: 'Owner Desktop',
        platform: 'web'
      }
    },
    order: 1,
    createdAt: '2026-07-21T09:00:00.000Z',
    updatedAt: '2026-07-21T18:00:00.000Z'
  },
  {
    id: 'session-padmin-002',
    session: {
      sessionId: 'sess-padmin-002',
      identityId: 'identity-platform-admin-002',
      authenticationId: 'auth-padmin-002',
      principalId: 'principal-padmin-002',
      state: 'active',
      lifetime: {
        startedAt: '2026-07-20T14:00:00.000Z',
        endsAt: '2026-07-23T14:00:00.000Z',
        durationSeconds: 259200
      },
      expiration: {
        expiresAt: '2026-07-23T14:00:00.000Z',
        isExpired: false
      },
      renewalReference: {
        renewalId: 'renew-padmin-002',
        lastRenewedAt: '2026-07-21T10:00:00.000Z'
      },
      activity: {
        lastActivityAt: '2026-07-21T16:30:00.000Z',
        activityCount: 8,
        lastAction: 'tenant-list'
      },
      deviceReference: {
        deviceId: 'device-web-padmin-002',
        label: 'Admin Laptop',
        platform: 'web'
      }
    },
    order: 2,
    createdAt: '2026-07-20T14:00:00.000Z',
    updatedAt: '2026-07-21T16:30:00.000Z'
  },
  {
    id: 'session-badmin-003',
    session: {
      sessionId: 'sess-badmin-003',
      identityId: 'identity-business-admin-003',
      authenticationId: 'auth-badmin-003',
      principalId: 'principal-badmin-003',
      state: 'idle',
      lifetime: {
        startedAt: '2026-07-21T11:30:00.000Z',
        endsAt: '2026-07-22T11:30:00.000Z',
        durationSeconds: 86400
      },
      expiration: {
        expiresAt: '2026-07-22T11:30:00.000Z',
        isExpired: false
      },
      renewalReference: {
        renewalId: 'renew-badmin-003',
        lastRenewedAt: '2026-07-21T11:30:00.000Z',
        nextRenewalAt: '2026-07-22T05:00:00.000Z'
      },
      activity: {
        lastActivityAt: '2026-07-21T12:00:00.000Z',
        activityCount: 3,
        lastAction: 'report-export'
      },
      deviceReference: {
        deviceId: 'device-ios-badmin-003',
        label: 'Biz iPhone',
        platform: 'ios'
      }
    },
    order: 3,
    createdAt: '2026-07-21T11:30:00.000Z',
    updatedAt: '2026-07-21T12:00:00.000Z'
  },
  {
    id: 'session-member-004',
    session: {
      sessionId: 'sess-member-004',
      identityId: 'identity-tenant-member-004',
      authenticationId: 'auth-member-004',
      principalId: 'principal-member-004',
      state: 'pending',
      lifetime: {
        startedAt: '2026-07-18T10:00:00.000Z',
        durationSeconds: 3600
      },
      expiration: {
        expiresAt: '2026-07-18T11:00:00.000Z',
        isExpired: false,
        reason: 'awaiting-confirmation'
      },
      renewalReference: {
        renewalId: 'renew-member-004'
      },
      activity: {
        lastActivityAt: '2026-07-18T10:00:00.000Z',
        activityCount: 1,
        lastAction: 'oauth-start'
      },
      deviceReference: {
        deviceId: 'device-android-member-004',
        label: 'Member Phone',
        platform: 'android'
      }
    },
    order: 4,
    createdAt: '2026-07-18T10:00:00.000Z',
    updatedAt: '2026-07-18T10:00:00.000Z'
  },
  {
    id: 'session-viewer-005',
    session: {
      sessionId: 'sess-viewer-005',
      identityId: 'identity-viewer-005',
      authenticationId: 'auth-viewer-005',
      principalId: 'principal-viewer-005',
      state: 'expired',
      lifetime: {
        startedAt: '2026-07-01T09:00:00.000Z',
        endsAt: '2026-07-08T09:00:00.000Z',
        durationSeconds: 604800
      },
      expiration: {
        expiresAt: '2026-07-08T09:00:00.000Z',
        isExpired: true,
        reason: 'ttl-elapsed'
      },
      renewalReference: {
        renewalId: 'renew-viewer-005',
        lastRenewedAt: '2026-07-07T09:00:00.000Z'
      },
      activity: {
        lastActivityAt: '2026-07-08T08:55:00.000Z',
        activityCount: 20,
        lastAction: 'report-read'
      },
      deviceReference: {
        deviceId: 'device-web-viewer-005',
        label: 'Viewer Browser',
        platform: 'web'
      }
    },
    order: 5,
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-07-08T09:00:00.000Z'
  },
  {
    id: 'session-susp-006',
    session: {
      sessionId: 'sess-susp-006',
      identityId: 'identity-suspended-006',
      authenticationId: 'auth-susp-006',
      principalId: 'principal-susp-006',
      state: 'revoked',
      lifetime: {
        startedAt: '2026-05-01T10:00:00.000Z',
        endsAt: '2026-05-02T10:00:00.000Z',
        durationSeconds: 86400
      },
      expiration: {
        expiresAt: '2026-05-02T10:00:00.000Z',
        isExpired: true,
        reason: 'revoked'
      },
      renewalReference: {
        renewalId: 'renew-susp-006',
        lastRenewedAt: '2026-05-01T10:05:00.000Z'
      },
      activity: {
        lastActivityAt: '2026-05-01T10:10:00.000Z',
        activityCount: 2,
        lastAction: 'api-call'
      },
      deviceReference: {
        deviceId: 'device-desktop-susp-006',
        label: 'West Desktop',
        platform: 'desktop'
      }
    },
    order: 6,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-07-05T08:00:00.000Z'
  },
  {
    id: 'session-owner-mobile-007',
    session: {
      sessionId: 'sess-owner-mobile-007',
      identityId: 'identity-platform-owner-001',
      authenticationId: 'auth-owner-001',
      principalId: 'principal-owner-001',
      state: 'active',
      lifetime: {
        startedAt: '2026-07-21T20:00:00.000Z',
        endsAt: '2026-07-22T20:00:00.000Z',
        durationSeconds: 86400
      },
      expiration: {
        expiresAt: '2026-07-22T20:00:00.000Z',
        isExpired: false
      },
      renewalReference: {
        renewalId: 'renew-owner-mobile-007',
        lastRenewedAt: '2026-07-21T20:00:00.000Z'
      },
      activity: {
        lastActivityAt: '2026-07-21T20:15:00.000Z',
        activityCount: 4,
        lastAction: 'mobile-check'
      },
      deviceReference: {
        deviceId: 'device-ios-owner-007',
        label: 'Owner iPhone',
        platform: 'ios'
      }
    },
    order: 7,
    createdAt: '2026-07-21T20:00:00.000Z',
    updatedAt: '2026-07-21T20:15:00.000Z'
  },
  {
    id: 'session-anon-008',
    session: {
      sessionId: 'sess-anon-008',
      identityId: 'identity-platform-owner-001',
      authenticationId: 'auth-anon-007',
      principalId: 'principal-anon-007',
      state: 'expired',
      lifetime: {
        startedAt: '2026-07-20T00:00:00.000Z',
        endsAt: '2026-07-20T01:00:00.000Z',
        durationSeconds: 3600
      },
      expiration: {
        expiresAt: '2026-07-20T01:00:00.000Z',
        isExpired: true,
        reason: 'unauthenticated-ttl'
      },
      renewalReference: {
        renewalId: 'renew-anon-008'
      },
      activity: {
        lastActivityAt: '2026-07-20T00:30:00.000Z',
        activityCount: 1
      },
      deviceReference: {
        deviceId: 'device-unknown-anon-008',
        platform: 'unknown'
      }
    },
    order: 8,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T01:00:00.000Z'
  }
] as SessionModule[]);

/** Yerleşik session sayısı */
export const BUILTIN_SESSION_MODULE_COUNT = BUILTIN_SESSION_MODULES.length;

/**
 * Yerleşik session tanımını id ile döndürür.
 */
export function getBuiltinSessionModule(
  sessionId: string
): SessionModule | undefined {
  return BUILTIN_SESSION_MODULES.find(
    (item) => item.id === sessionId || item.session.sessionId === sessionId
  );
}
