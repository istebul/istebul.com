import { AIAuditLogger } from '../../ai-core/services/AIAuditLogger.ts';
import {
  createRestaurantKnowledge,
  type KnowledgeService,
} from '../../restaurant-knowledge/index.ts';
import type { ActionHandlerDeps } from '../actions/types.ts';
import { ReservationEngine } from '../engines/ReservationEngine.ts';
import type { ReservationActionPort } from '../ports/reservation-port.ts';
import type {
  ActionCompensation,
  ActionRequest,
  ActionResult,
  ConciergeTurnLike,
} from '../types.ts';
import { KnowledgeActionValidator } from '../validation/knowledge-validator.ts';
import { ActionAudit } from './ActionAudit.ts';
import { ActionExecutor } from './ActionExecutor.ts';
import { ActionParser } from './ActionParser.ts';
import { ActionRegistry } from './ActionRegistry.ts';

export interface CreateAIActionEngineOptions {
  restaurantId?: string;
  /** Seed demo Knowledge Graph (default true). */
  seedDemo?: boolean;
  knowledge?: KnowledgeService;
  reservations?: ReservationActionPort;
  audit?: AIAuditLogger;
  registry?: ActionRegistry;
  parser?: ActionParser;
}

export interface AIActionEngine {
  readonly registry: ActionRegistry;
  readonly executor: ActionExecutor;
  readonly reservations: ReservationActionPort;
  readonly knowledge: KnowledgeService;
  readonly audit: ActionAudit;
  execute(request: ActionRequest): Promise<ActionResult>;
  executeFromTurn(
    turn: ConciergeTurnLike,
    overrides?: Partial<ActionRequest['payload']>,
  ): Promise<ActionResult | null>;
  rollback(compensation: ActionCompensation): Promise<ActionResult>;
  executeWithRollback(request: ActionRequest): Promise<{
    result: ActionResult;
    rollback?: ActionResult;
  }>;
}

class AIActionEngineImpl implements AIActionEngine {
  readonly registry: ActionRegistry;
  readonly executor: ActionExecutor;
  readonly reservations: ReservationActionPort;
  readonly knowledge: KnowledgeService;
  readonly audit: ActionAudit;

  constructor(options: CreateAIActionEngineOptions = {}) {
    const restaurantId = options.restaurantId || 'demo-cafe';
    if (options.knowledge) {
      this.knowledge = options.knowledge;
    } else {
      const created = createRestaurantKnowledge({
        seedDemo: options.seedDemo !== false,
        restaurantId,
      });
      this.knowledge = created.service;
    }

    this.reservations = options.reservations || new ReservationEngine();
    const coreAudit = options.audit || new AIAuditLogger({ defaultProvider: 'mock' });
    this.audit = new ActionAudit(coreAudit);
    this.registry = options.registry || new ActionRegistry();
    const validator = new KnowledgeActionValidator(this.knowledge);
    const deps: ActionHandlerDeps = {
      reservations: this.reservations,
      knowledge: this.knowledge,
      validator,
      audit: coreAudit,
    };
    this.executor = new ActionExecutor({
      registry: this.registry,
      deps,
      parser: options.parser,
      actionAudit: this.audit,
    });
  }

  execute(request: ActionRequest): Promise<ActionResult> {
    return this.executor.execute(request);
  }

  executeFromTurn(
    turn: ConciergeTurnLike,
    overrides: Partial<ActionRequest['payload']> = {},
  ): Promise<ActionResult | null> {
    return this.executor.executeFromTurn(turn, overrides);
  }

  rollback(compensation: ActionCompensation): Promise<ActionResult> {
    return this.executor.rollback(compensation);
  }

  executeWithRollback(request: ActionRequest) {
    return this.executor.executeWithRollback(request);
  }
}

/**
 * One-line bootstrap:
 *   const engine = createAIActionEngine({ restaurantId: 'demo-cafe' });
 *   await engine.execute({ actionId: 'create_reservation', payload: {...} });
 */
export function createAIActionEngine(
  options: CreateAIActionEngineOptions = {},
): AIActionEngine {
  return new AIActionEngineImpl(options);
}
