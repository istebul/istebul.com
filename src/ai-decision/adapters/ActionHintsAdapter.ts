import type { DecisionKind, DecisionResult } from '../types.ts';

/**
 * Adapter → P8-D Action Engine hints only (no execute / no registry mutation).
 */
const KIND_TO_ACTION_HINTS: Record<DecisionKind, string[]> = {
  suggest_table: ['assign_table'],
  suggest_reservation: ['create_reservation'],
  suggest_menu: ['create_preorder'],
  suggest_campaign: ['apply_campaign'],
  suggest_guarantee: ['apply_guarantee'],
  predict_density: [],
  predict_wait_time: [],
  analyze_kitchen_load: [],
};

export class ActionHintsAdapter {
  hintsFor(kind: DecisionKind): string[] {
    return [...(KIND_TO_ACTION_HINTS[kind] || [])];
  }

  attach(result: DecisionResult): DecisionResult {
    return {
      ...result,
      actionHints: this.hintsFor(result.kind),
    };
  }
}
