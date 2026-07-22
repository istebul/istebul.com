/**
 * İSTEBUL Identity — Session modeli ve modül tanımı (PR-203C).
 *
 * Projection-only iskelet. JWT / Refresh Token / Cookie / Supabase Auth /
 * OAuth / OIDC / API / DB yok. Session süresi yalnızca projeksiyon olarak
 * temsil edilir; gerçek token doğrulaması yapılmaz.
 */

/**
 * Session State — oturum yaşam durumu (projeksiyon).
 */
export type SessionState =
  | 'active'
  | 'idle'
  | 'expired'
  | 'revoked'
  | 'pending';

/**
 * Session Lifetime — süre alanları (projeksiyon; gerçek TTL yok).
 */
export interface SessionLifetime {
  /** Başlangıç ISO */
  startedAt: string;
  /** Planlanan bitiş ISO */
  endsAt?: string;
  /** Süre (saniye) — projeksiyon değeri */
  durationSeconds?: number;
}

/**
 * Expiration — sona erme projeksiyonu.
 */
export interface SessionExpiration {
  /** Sona erme zamanı ISO */
  expiresAt: string;
  /** Süresi dolmuş mu (projeksiyon bayrağı) */
  isExpired: boolean;
  /** Sebep etiketi */
  reason?: string;
}

/**
 * Renewal Reference — yenileme referansı (refresh token yok).
 */
export interface RenewalReference {
  /** Yenileme referans kimliği */
  renewalId: string;
  /** Son yenileme ISO */
  lastRenewedAt?: string;
  /** Sonraki yenileme ISO (projeksiyon) */
  nextRenewalAt?: string;
}

/**
 * Activity — oturum aktivite projeksiyonu.
 */
export interface SessionActivity {
  /** Son aktivite ISO */
  lastActivityAt: string;
  /** Aktivite sayısı (projeksiyon) */
  activityCount: number;
  /** Son aktivite etiketi */
  lastAction?: string;
}

/**
 * Device Reference — cihaz referansı (gerçek cihaz bağlama yok).
 */
export interface DeviceReference {
  /** Cihaz kimliği */
  deviceId: string;
  /** Cihaz etiketi */
  label?: string;
  /** Platform etiketi */
  platform?: 'web' | 'ios' | 'android' | 'desktop' | 'unknown';
}

/**
 * Session — oturum agregatı.
 */
export interface Session {
  /** Benzersiz oturum kimliği */
  sessionId: string;
  /** Bağlı identity kimliği */
  identityId: string;
  /** Bağlı authentication kimliği */
  authenticationId: string;
  /** Principal kimliği */
  principalId: string;
  /** Durum */
  state: SessionState;
  /** Lifetime */
  lifetime: SessionLifetime;
  /** Expiration */
  expiration: SessionExpiration;
  /** Renewal referansı */
  renewalReference: RenewalReference;
  /** Activity */
  activity: SessionActivity;
  /** Device referansı */
  deviceReference: DeviceReference;
}

/**
 * SessionModule — registry kaydı.
 */
export interface SessionModule {
  /** Benzersiz session kaydı */
  id: string;
  /** Session agregatı */
  session: Session;
  /** Sıralama */
  order: number;
  /** Oluşturulma */
  createdAt: string;
  /** Güncellenme */
  updatedAt: string;
}

/**
 * Session projeksiyonu — runtime çıktısı.
 */
export interface SessionProjection {
  sessionId: string;
  identityId: string;
  authenticationId: string;
  principalId: string;
  state: SessionState;
  lifetime: SessionLifetime;
  expiration: SessionExpiration;
  renewalReference: RenewalReference;
  activity: SessionActivity;
  deviceReference: DeviceReference;
  /** Foundation katmanında her zaman true — gerçek token yok */
  projected: true;
}

/**
 * SessionModule tanımını projeksiyona dönüştürür.
 */
export function toSessionProjection(module: SessionModule): SessionProjection {
  const { session } = module;
  return {
    sessionId: session.sessionId,
    identityId: session.identityId,
    authenticationId: session.authenticationId,
    principalId: session.principalId,
    state: session.state,
    lifetime: { ...session.lifetime },
    expiration: { ...session.expiration },
    renewalReference: { ...session.renewalReference },
    activity: { ...session.activity },
    deviceReference: { ...session.deviceReference },
    projected: true
  };
}
