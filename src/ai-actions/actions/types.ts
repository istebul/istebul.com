import type { KnowledgeService } from '../../restaurant-knowledge/services/KnowledgeService.ts';
import type { AIAuditLogger } from '../../ai-core/services/AIAuditLogger.ts';
import type { ReservationActionPort } from '../ports/reservation-port.ts';
import type { KnowledgeActionValidator } from '../validation/knowledge-validator.ts';
import type {
  ActionCompensation,
  ActionFamily,
  ActionId,
  ActionRequest,
  ActionResult,
} from '../types.ts';

export interface ActionHandlerDeps {
  reservations: ReservationActionPort;
  knowledge: KnowledgeService;
  validator: KnowledgeActionValidator;
  audit: AIAuditLogger;
}

export interface ActionHandler {
  readonly id: ActionId;
  readonly family: ActionFamily;
  readonly displayName: string;
  execute(request: ActionRequest, deps: ActionHandlerDeps): Promise<ActionResult>;
  rollback?(
    compensation: ActionCompensation,
    deps: ActionHandlerDeps,
  ): Promise<ActionResult>;
}
