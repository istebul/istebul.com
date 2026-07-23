/**
 * İSTEBUL Identity — AuthenticationProvider port (EPIC-301A).
 *
 * Gerçek authentication sağlayıcıları için adapter arayüzü.
 * Bu PR'da provider implementasyonu yoktur.
 */

import type { AuthenticationMethod } from '../runtime/AuthenticationModule';
import type { AuthenticationProviderContext } from './AuthenticationProviderContext';
import type { AuthenticationProviderResult } from './AuthenticationProviderResult';

/**
 * Provider kayıt metadata'sı — implementasyon olmadan slot tanımı.
 */
export interface AuthenticationProviderRegistration {
  /** Provider kimliği */
  id: string;
  /** Görünen ad */
  name: string;
  /** Açıklama */
  description: string;
  /** Desteklenen yöntem */
  method: AuthenticationMethod;
  /** Provider implementasyonu kayıtlı mı */
  providerRegistered: boolean;
  /** Sıralama */
  order: number;
}

/**
 * Provider operasyon sonucu — senkron veya asenkron.
 */
export type AuthenticationProviderOperationResult =
  | AuthenticationProviderResult
  | Promise<AuthenticationProviderResult>;

/**
 * Authentication provider port arayüzü.
 *
 * Gerçek sağlayıcılar (Supabase, OAuth, OIDC vb.) gelecek PR'larda
 * bu arayüzü uygular; bu foundation katmanında implementasyon yoktur.
 */
export interface AuthenticationProvider {
  /** Benzersiz provider kimliği */
  readonly id: string;
  /** Desteklenen kimlik doğrulama yöntemi */
  readonly method: AuthenticationMethod;
  /** Kimlik doğrulama */
  authenticate(
    context: AuthenticationProviderContext
  ): AuthenticationProviderOperationResult;
  /** Oturum / credential yenileme */
  refresh(
    context: AuthenticationProviderContext
  ): AuthenticationProviderOperationResult;
  /** Oturum kapatma */
  logout(
    context: AuthenticationProviderContext
  ): AuthenticationProviderOperationResult;
  /** Mevcut kullanıcıyı getir */
  getCurrentUser(
    context: AuthenticationProviderContext
  ): AuthenticationProviderOperationResult;
  /** Oturum doğrulama */
  validateSession(
    context: AuthenticationProviderContext
  ): AuthenticationProviderOperationResult;
}
