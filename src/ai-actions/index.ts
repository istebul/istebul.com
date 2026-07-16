/**
 * GarsonAI — P8-D AI Action Engine
 *
 * Turns Concierge intents into auditable restaurant actions.
 * Built on P8-A AI Core + P8-B Knowledge Graph + P8-C Concierge turn shape.
 *
 * Additive: does not modify P6 production, P7 modules, or P8-A/B/C behavior.
 * No live payment / provision in this phase.
 */

export type {
  ActionFamily,
  ActionId,
  ActionStatus,
  ActionPayload,
  ActionRequest,
  ActionResult,
  ActionContext,
  ActionCompensation,
  ConciergeTurnLike,
} from './types.ts';

export type {
  ReservationActionPort,
  ReservationDraftInput,
  PreorderLine,
} from './ports/reservation-port.ts';

export { ReservationEngine } from './engines/ReservationEngine.ts';
export { KnowledgeActionValidator } from './validation/knowledge-validator.ts';

export type { ActionHandler, ActionHandlerDeps } from './actions/index.ts';
export {
  ReservationAction,
  UpdateReservationAction,
  AssignTableAction,
  ChangeTableAction,
  CreatePreorderAction,
  UpdatePreorderAction,
  GuaranteeAction,
  PaymentAction,
  CampaignAction,
  SummaryAction,
} from './actions/index.ts';

export {
  ActionRegistry,
  BUILTIN_ACTIONS,
  BUILTIN_ACTION_IDS,
  ACTION_FAMILIES,
} from './services/ActionRegistry.ts';
export { ActionParser, defaultActionParser } from './services/ActionParser.ts';
export { ActionAudit } from './services/ActionAudit.ts';
export { ActionExecutor } from './services/ActionExecutor.ts';
export {
  createAIActionEngine,
  type CreateAIActionEngineOptions,
  type AIActionEngine,
} from './services/ActionEngine.ts';
