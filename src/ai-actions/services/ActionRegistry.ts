import type { ActionHandler } from '../actions/types.ts';
import {
  AssignTableAction,
  CampaignAction,
  ChangeTableAction,
  CreatePreorderAction,
  GuaranteeAction,
  PaymentAction,
  ReservationAction,
  SummaryAction,
  UpdatePreorderAction,
  UpdateReservationAction,
} from '../actions/index.ts';
import type { ActionFamily, ActionId } from '../types.ts';

/** Named registry families required by P8-D. */
export const ACTION_FAMILIES: ActionFamily[] = [
  'reservation',
  'table_assignment',
  'preorder',
  'guarantee',
  'payment',
  'campaign',
  'summary',
];

/** Concrete ActionIds wired into the registry. */
export const BUILTIN_ACTION_IDS: ActionId[] = [
  'create_reservation',
  'update_reservation',
  'assign_table',
  'change_table',
  'create_preorder',
  'update_preorder',
  'apply_guarantee',
  'create_reservation_summary',
  'prepare_payment',
  'apply_campaign',
];

/**
 * Registry catalog (family display names):
 * ReservationAction, TableAssignmentAction, PreorderAction,
 * GuaranteeAction, PaymentAction, CampaignAction, SummaryAction
 */
export const BUILTIN_ACTIONS: ActionHandler[] = [
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
];

/**
 * Action Registry — maps ActionId → handler.
 * Families: Reservation, TableAssignment, Preorder, Guarantee, Payment, Campaign, Summary.
 */
export class ActionRegistry {
  private readonly byId = new Map<ActionId, ActionHandler>();

  constructor(handlers: ActionHandler[] = BUILTIN_ACTIONS) {
    for (const handler of handlers) {
      this.register(handler);
    }
  }

  register(handler: ActionHandler): void {
    this.byId.set(handler.id, handler);
  }

  get(actionId: ActionId): ActionHandler | undefined {
    return this.byId.get(actionId);
  }

  require(actionId: ActionId): ActionHandler {
    const handler = this.byId.get(actionId);
    if (!handler) {
      throw new Error(`Action not registered: ${actionId}`);
    }
    return handler;
  }

  list(): ActionHandler[] {
    return [...this.byId.values()];
  }

  listIds(): ActionId[] {
    return [...this.byId.keys()];
  }

  listFamilies(): ActionFamily[] {
    return [...new Set(this.list().map((h) => h.family))];
  }
}
