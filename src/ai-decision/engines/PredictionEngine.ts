import type { DecisionContext } from '../context/DecisionContext.ts';
import {
  bandFromPct,
  clampScore,
  timeOfDayFactor,
  weekendFactor,
} from '../scoring/DecisionScorer.ts';

export interface PredictionBundle {
  densityPct: number;
  waitMinutes: number;
  kitchenLoadPct: number;
  band: 'low' | 'medium' | 'high';
  summary: string;
}

/**
 * Occupancy / wait / kitchen load predictions — heuristic mock (no telemetry APIs).
 */
export class PredictionEngine {
  predict(ctx: DecisionContext): PredictionBundle {
    const tables = ctx.snapshot.tables.filter((t) => t.active !== false);
    const total = Math.max(1, tables.length);
    const occupied = tables.filter((t) =>
      ['occupied', 'reserved', 'awaiting_checkin', 'serving', 'preparing'].includes(
        String(t.status || ''),
      ),
    ).length;
    const openRes = ctx.openReservations.length;
    const tod = timeOfDayFactor(ctx.time);
    const week = weekendFactor(ctx.asOfDate);
    const occupancyBase = (occupied + openRes * 0.5) / total;
    const densityPct = clampScore(occupancyBase * 100 * tod * week);

    const waitMinutes = clampScore(
      densityPct < 40 ? 5 : densityPct < 75 ? 15 + (densityPct - 40) * 0.4 : 35 + (densityPct - 75) * 0.8,
    );

    const preorderPressure = ctx.snapshot.reservations.filter(
      (r) => r.date === ctx.asOfDate && r.hasPreorder === true,
    ).length;
    const kitchenLoadPct = clampScore(
      densityPct * 0.7 + preorderPressure * 8 + tod * 20,
    );

    const band = bandFromPct(densityPct);
    const summary = `Yoğunluk %${densityPct} (${band}), tahmini bekleme ~${waitMinutes} dk, mutfak yükü %${kitchenLoadPct}`;

    return {
      densityPct,
      waitMinutes,
      kitchenLoadPct,
      band,
      summary,
    };
  }
}
