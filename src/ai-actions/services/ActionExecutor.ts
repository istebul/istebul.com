import type { ActionHandlerDeps } from '../actions/types.ts';
import type {
  ActionCompensation,
  ActionRequest,
  ActionResult,
  ConciergeTurnLike,
} from '../types.ts';
import { ActionAudit } from './ActionAudit.ts';
import { ActionParser, defaultActionParser } from './ActionParser.ts';
import { ActionRegistry } from './ActionRegistry.ts';

export interface ActionExecutorOptions {
  registry: ActionRegistry;
  deps: ActionHandlerDeps;
  parser?: ActionParser;
  actionAudit?: ActionAudit;
}

/**
 * Action Executor
 *
 * AI cevabı / Intent → Action → Knowledge validate → Execute → Audit
 * Optional rollback via compensation snapshot in result.data.compensation
 */
export class ActionExecutor {
  private readonly registry: ActionRegistry;
  private readonly deps: ActionHandlerDeps;
  private readonly parser: ActionParser;
  private readonly actionAudit: ActionAudit;

  constructor(options: ActionExecutorOptions) {
    this.registry = options.registry;
    this.deps = options.deps;
    this.parser = options.parser || defaultActionParser;
    this.actionAudit =
      options.actionAudit || new ActionAudit(options.deps.audit);
  }

  async execute(request: ActionRequest): Promise<ActionResult> {
    const requestId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const handler = this.registry.get(request.actionId);
    if (!handler) {
      const missing: ActionResult = {
        ok: false,
        status: 'failed',
        actionId: request.actionId,
        family: 'reservation',
        message: `Action kayıtlı değil: ${request.actionId}`,
        errorCode: 'UNKNOWN_ACTION',
      };
      missing.auditId = await this.actionAudit.log(request, missing, requestId);
      return missing;
    }

    try {
      const result = await handler.execute(request, this.deps);
      result.auditId = await this.actionAudit.log(request, result, requestId);
      return result;
    } catch (err) {
      const failed: ActionResult = {
        ok: false,
        status: 'failed',
        actionId: request.actionId,
        family: handler.family,
        message: err instanceof Error ? err.message : 'Action execution failed',
        errorCode: 'EXECUTION_ERROR',
      };
      failed.auditId = await this.actionAudit.log(request, failed, requestId);
      return failed;
    }
  }

  /**
   * Execute then optionally rollback (compensation) — used by tests & callers.
   */
  async executeWithRollback(request: ActionRequest): Promise<{
    result: ActionResult;
    rollback?: ActionResult;
  }> {
    const result = await this.execute(request);
    if (!request.enableRollback) {
      return { result };
    }
    // Explicit rollback request via extras flag after success (test helper path)
    if (
      result.ok &&
      request.payload.extras?.forceRollbackAfterSuccess === true
    ) {
      const compensation = result.data?.compensation as
        | ActionCompensation
        | undefined;
      if (compensation) {
        const rollback = await this.rollback(compensation);
        return { result, rollback };
      }
    }
    return { result };
  }

  async rollback(compensation: ActionCompensation): Promise<ActionResult> {
    const handler = this.registry.get(compensation.actionId);
    if (!handler?.rollback) {
      return {
        ok: false,
        status: 'failed',
        actionId: compensation.actionId,
        family: 'reservation',
        message: 'Bu action için rollback tanımlı değil',
        errorCode: 'NO_ROLLBACK',
      };
    }
    const rolled = await handler.rollback(compensation, this.deps);
    const requestId = `rollback_${Date.now()}`;
    rolled.auditId = await this.actionAudit.log(
      {
        actionId: compensation.actionId,
        payload: {
          restaurantId: '',
          reservationId: compensation.reservationId,
        },
        tags: ['p8d', 'rollback'],
      },
      rolled,
      requestId,
    );
    return rolled;
  }

  /**
   * Parse Concierge turn → Action → Execute (additive caller hook).
   */
  async executeFromTurn(
    turn: ConciergeTurnLike,
    overrides: Partial<ActionRequest['payload']> = {},
  ): Promise<ActionResult | null> {
    const request = this.parser.parseFromConciergeTurn(turn, overrides);
    if (!request) return null;
    return this.execute(request);
  }

  parseFromText(
    text: string,
    payload: ActionRequest['payload'],
    extras?: { conversationId?: string; intentId?: string },
  ): ActionRequest | null {
    return this.parser.parseFromText(text, payload, extras);
  }
}
