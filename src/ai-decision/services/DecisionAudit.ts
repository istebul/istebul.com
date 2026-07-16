import { AIAuditLogger } from '../../ai-core/services/AIAuditLogger.ts';
import type { DecisionResult } from '../types.ts';

/**
 * DecisionAudit — wraps P8-A AIAuditLogger (additive, in-memory by default).
 */
export class DecisionAudit {
  private readonly logger: AIAuditLogger;

  constructor(logger: AIAuditLogger) {
    this.logger = logger;
  }

  async log(result: DecisionResult, conversationId?: string): Promise<string | undefined> {
    const entry = await this.logger.logDecision({
      provider: result.provider === 'mock' ? 'mock' : result.provider,
      moduleId: 'reservation',
      restaurantId: result.restaurantId,
      conversationId,
      tags: ['p8f', 'ai-decision', result.kind],
      decision: {
        decisionType: `decision.${result.kind}`,
        summary: result.summary,
        confidence: result.recommendations[0]?.score,
        outputs: {
          kind: result.kind,
          recommendations: result.recommendations.slice(0, 5),
          predictions: result.predictions,
          guarantee: result.guarantee,
          actionHints: result.actionHints,
          remoteCallAttempted: false,
        },
      },
    });
    return entry.id;
  }

  list(restaurantId?: string) {
    return this.logger.list({ restaurantId, limit: 50 });
  }
}
