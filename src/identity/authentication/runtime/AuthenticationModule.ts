/**
 * İSTEBUL Identity — Authentication modeli ve modül tanımı (PR-203B).
 *
 * Projection-only iskelet. Login UI / Logout UI / JWT / Supabase Auth /
 * OAuth / OIDC / API / DB yok.
 */

/**
 * Authentication Status — oturum durumu (gerçek auth yok).
 */
export type AuthenticationStatus =
  | 'authenticated'
  | 'unauthenticated'
  | 'expired'
  | 'revoked'
  | 'pending';

/**
 * Authentication Method — kimlik doğrulama yöntemi (provider entegrasyonu yok).
 */
export type AuthenticationMethod =
  | 'password'
  | 'magic-link'
  | 'oauth'
  | 'oidc'
  | 'api-key'
  | 'session-ref';

/**
 * Principal — kimliği doğrulanmış (projeksiyon) aktör.
 */
export interface Principal {
  /** Benzersiz principal kimliği */
  principalId: string;
  /** Bağlı Identity kimliği */
  identityId: string;
  /** Görünen ad */
  displayName: string;
  /** Opsiyonel tenant kimliği */
  tenantId?: string;
}

/**
 * Credential Reference — kimlik bilgisi referansı (JWT doğrulama yok).
 */
export interface CredentialReference {
  /** Kimlik bilgisi referans kimliği */
  credentialId: string;
  /** Yöntem */
  method: AuthenticationMethod;
  /** Veriliş zamanı ISO */
  issuedAt?: string;
  /** Bitiş zamanı ISO */
  expiresAt?: string;
}

/**
 * Authentication State — kimlik doğrulama durumu agregatı.
 */
export interface AuthenticationState {
  /** Durum kimliği */
  stateId: string;
  /** Durum */
  status: AuthenticationStatus;
  /** Principal */
  principal: Principal;
  /** Credential referansı */
  credentialReference: CredentialReference;
  /** Yöntem */
  method: AuthenticationMethod;
  /** Son doğrulama zamanı ISO */
  lastAuthenticatedAt?: string;
}

/**
 * AuthenticationModule — registry kaydı.
 */
export interface AuthenticationModule {
  /** Benzersiz authentication kaydı */
  id: string;
  /** Authentication state */
  state: AuthenticationState;
  /** Sıralama */
  order: number;
  /** Oluşturulma */
  createdAt: string;
  /** Güncellenme */
  updatedAt: string;
}

/**
 * Authentication projeksiyonu — runtime çıktısı.
 */
export interface AuthenticationProjection {
  authenticationId: string;
  state: AuthenticationState;
  status: AuthenticationStatus;
  method: AuthenticationMethod;
  principal: Principal;
  credentialReference: CredentialReference;
  /** Foundation katmanında her zaman true — gerçek auth yok */
  projected: true;
}

/**
 * AuthenticationModule tanımını projeksiyona dönüştürür.
 */
export function toAuthenticationProjection(
  module: AuthenticationModule
): AuthenticationProjection {
  return {
    authenticationId: module.id,
    state: {
      ...module.state,
      principal: { ...module.state.principal },
      credentialReference: { ...module.state.credentialReference }
    },
    status: module.state.status,
    method: module.state.method,
    principal: { ...module.state.principal },
    credentialReference: { ...module.state.credentialReference },
    projected: true
  };
}
