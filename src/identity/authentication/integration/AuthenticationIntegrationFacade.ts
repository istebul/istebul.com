/**
 * İSTEBUL Identity — AuthenticationIntegrationFacade (EPIC-301E).
 *
 * Uçtan uca Authentication Integration giriş noktası —
 * Adapter + Supabase Provider + Session Bridge + Identity Bridge.
 *
 * 301A–301D implementasyonlarını değiştirmez.
 */

import type { AuthenticationIntegrationResult } from './AuthenticationIntegrationExecutionResult';
import type { AuthenticationIntegrationExecutionContext } from './AuthenticationIntegrationExecutionContext';
import { createAuthenticationIntegrationExecutionContext } from './AuthenticationIntegrationExecutionContext';
import type { AuthenticationIntegrationExecutionResult } from './AuthenticationIntegrationExecutionResult';
import {
  AuthenticationIntegrationPipelineRunner,
  createAuthenticationIntegrationPipelineRunner,
  type AuthenticationIntegrationPipelineRunnerDependencies
} from './AuthenticationIntegrationPipelineRunner';

/**
 * Uçtan uca Authentication Integration facade.
 */
export class AuthenticationIntegrationFacade {
  private readonly runner: AuthenticationIntegrationPipelineRunner;

  constructor(deps?: AuthenticationIntegrationPipelineRunnerDependencies) {
    this.runner = createAuthenticationIntegrationPipelineRunner(deps);
  }

  getRunner(): AuthenticationIntegrationPipelineRunner {
    return this.runner;
  }

  /**
   * Tam yürütme — AuthenticationIntegrationExecutionResult döner.
   */
  execute(
    context: AuthenticationIntegrationExecutionContext = {}
  ): Promise<AuthenticationIntegrationExecutionResult> {
    return this.runner.execute(context);
  }

  /**
   * Kısayol — yalnızca AuthenticationIntegrationResult döner.
   */
  async run(
    options: AuthenticationIntegrationExecutionContext = {}
  ): Promise<AuthenticationIntegrationResult> {
    const result = await this.execute(
      createAuthenticationIntegrationExecutionContext(options)
    );
    return result.authenticationIntegrationResult;
  }
}

/**
 * Fabrika — singleton yok.
 */
export function createAuthenticationIntegrationFacade(
  deps?: AuthenticationIntegrationPipelineRunnerDependencies
): AuthenticationIntegrationFacade {
  return new AuthenticationIntegrationFacade(deps);
}

export default AuthenticationIntegrationFacade;
