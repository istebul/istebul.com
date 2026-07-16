import type { AIAuditLogger } from '../../ai-core/services/AIAuditLogger.ts';
import type { ActionRequest, ActionResult } from '../types.ts';

/**
 * Thin audit wrapper — every AI Action is logged via P8-A AIAuditLogger.
 */
export class ActionAudit {
  private readonly audit: AIAuditLogger;

  constructor(audit: AIAuditLogger) {
    this.audit = audit;
  }

  async log(
    request: ActionRequest,
    result: ActionResult,
    requestId: string,
  ): Promise<string> {
    const entry = await this.audit.logDecision({
      moduleId: 'reservation',
      provider: 'mock',
      conversationId: request.conversationId,
      restaurantId: request.payload.restaurantId,
      requestId,
      tags: [
        'p8d',
        'ai-actions',
        request.actionId,
        result.status,
        ...(request.tags || []),
      ],
      decision: {
        decisionType: `action.${request.actionId}`,
        summary: result.message.slice(0, 280),
        confidence: result.ok ? 0.8 : 0.2,
        inputs: {
          actionId: request.actionId,
          payload: request.payload,
          intentId: request.intentId,
          sourceText: request.sourceText,
        },
        outputs: {
          status: result.status,
          ok: result.ok,
          reservationId: result.reservationId,
          errorCode: result.errorCode,
          validationErrors: result.validationErrors,
          rolledBack: result.rolledBack,
          dataKeys: result.data ? Object.keys(result.data) : [],
        },
      },
    });
    return entry.id;
  }

  async list(options?: {
    restaurantId?: string;
    conversationId?: string;
    limit?: number;
  }) {
    return this.audit.list(options);
  }
}
