import type { DecisionContext } from '../context/DecisionContext.ts';
import {
  buildScore,
  clampScore,
  rankScores,
} from '../scoring/DecisionScorer.ts';
import type { DecisionScore } from '../types.ts';

/**
 * Table / reservation / menu recommendations from Knowledge facts (no LLM).
 */
export class RecommendationEngine {
  suggestTables(ctx: DecisionContext, limit = 5): DecisionScore[] {
    const scores: DecisionScore[] = [];
    for (const table of ctx.snapshot.tables) {
      if (table.active === false) continue;
      const reasons: string[] = [];
      let score = 40;
      if (table.status === 'available') {
        score += 35;
        reasons.push('Müsait');
      } else {
        score -= 25;
        reasons.push(`Durum: ${table.status}`);
      }
      if (table.capacity >= ctx.partySize) {
        score += 20;
        reasons.push(`Kapasite ${table.capacity} ≥ ${ctx.partySize}`);
        const waste = table.capacity - ctx.partySize;
        if (waste <= 1) score += 10;
        else if (waste >= 4) score -= 8;
      } else {
        score -= 40;
        reasons.push('Kapasite yetersiz');
      }
      if (ctx.input.salon) {
        const salonKey = String(table.salon || table.diningRoomId || '').toLowerCase();
        if (salonKey.includes(ctx.input.salon.toLowerCase())) {
          score += 12;
          reasons.push('Salon eşleşmesi');
        }
      }
      if (ctx.input.quietPreferred && (table.quiet || table.tags?.includes('quiet'))) {
        score += 10;
        reasons.push('Sessiz tercih');
      }
      if (
        ctx.input.outdoorPreferred &&
        (table.outdoor || table.tags?.includes('outdoor'))
      ) {
        score += 10;
        reasons.push('Açık alan');
      }
      scores.push(
        buildScore(table.id, table.name || table.id, score, reasons, {
          capacity: table.capacity,
          status: table.status,
          salon: table.salon,
        }),
      );
    }
    return rankScores(scores, limit);
  }

  suggestReservationSlots(ctx: DecisionContext, limit = 5): DecisionScore[] {
    const baseTimes = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
    const preferred = ctx.time;
    const openCount = ctx.openReservations.length;
    const tableCount = Math.max(1, ctx.availableTables.length);
    const scores = baseTimes.map((time) => {
      const reasons: string[] = [`Tarih ${ctx.asOfDate}`];
      let score = 55;
      if (time === preferred) {
        score += 25;
        reasons.push('İstenen saate yakın');
      } else {
        const [ph, pm] = preferred.split(':').map(Number);
        const [th, tm] = time.split(':').map(Number);
        const delta = Math.abs(ph * 60 + pm - (th * 60 + tm));
        score += clampScore(20 - delta / 6);
        if (delta <= 30) reasons.push('±30 dk pencere');
      }
      const load = openCount / tableCount;
      if (load > 0.8 && (time === '19:00' || time === '20:00')) {
        score -= 15;
        reasons.push('Yoğun saat');
      } else {
        reasons.push('Uygun slot adayı');
      }
      score += Math.min(15, ctx.availableTables.length * 2);
      return buildScore(
        `${ctx.asOfDate}_${time}`,
        `${ctx.asOfDate} ${time}`,
        score,
        reasons,
        { date: ctx.asOfDate, time, partySize: ctx.partySize },
      );
    });
    return rankScores(scores, limit);
  }

  suggestMenu(ctx: DecisionContext, limit = 5): DecisionScore[] {
    const needle = (ctx.input.menuNeedle || '').toLowerCase();
    const scores: DecisionScore[] = [];
    for (const item of ctx.menuItems) {
      if (item.active === false) continue;
      const reasons: string[] = [];
      let score = 45;
      const name = String(item.name || '');
      if (needle && name.toLowerCase().includes(needle)) {
        score += 30;
        reasons.push('Arama eşleşmesi');
      }
      if (item.tags?.includes('signature') || item.tags?.includes('popular')) {
        score += 15;
        reasons.push('İmza / popüler');
      }
      if (item.price !== null && item.price !== undefined && Number(item.price) > 0) {
        score += 5;
        reasons.push(`Fiyat ${item.price}`);
      }
      if (ctx.partySize >= 4 && item.tags?.includes('shareable')) {
        score += 10;
        reasons.push('Paylaşımlık');
      }
      if (!reasons.length) reasons.push('Menü adayı');
      scores.push(
        buildScore(item.id, name, score, reasons, {
          price: item.price,
          categoryId: item.categoryId,
        }),
      );
    }
    return rankScores(scores, limit);
  }
}
