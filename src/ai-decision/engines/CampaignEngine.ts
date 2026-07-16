import type { DecisionContext } from '../context/DecisionContext.ts';
import { buildScore, rankScores } from '../scoring/DecisionScorer.ts';
import type { DecisionScore } from '../types.ts';

/**
 * Campaign ranking from Knowledge Graph campaigns (no LLM).
 */
export class CampaignEngine {
  suggest(ctx: DecisionContext, limit = 5): DecisionScore[] {
    const needle = (ctx.input.campaignNeedle || '').toLowerCase();
    const scores: DecisionScore[] = [];
    for (const campaign of ctx.activeCampaigns) {
      const reasons: string[] = [];
      let score = 50;
      const name = String(campaign.name || campaign.id);
      if (needle && name.toLowerCase().includes(needle)) {
        score += 25;
        reasons.push('Arama eşleşmesi');
      }
      if (campaign.discountPercent) {
        score += Math.min(20, Number(campaign.discountPercent));
        reasons.push(`%${campaign.discountPercent} indirim`);
      }
      if (campaign.discountAmount) {
        score += Math.min(12, Number(campaign.discountAmount) / 10);
        reasons.push(`${campaign.discountAmount} tutar indirim`);
      }
      const day = new Date(`${ctx.asOfDate}T12:00:00`).getDay();
      if (
        (day === 0 || day === 6) &&
        (campaign.tags?.includes('weekend') || name.toLowerCase().includes('hafta'))
      ) {
        score += 12;
        reasons.push('Hafta sonu kampanyası');
      }
      if (!reasons.length) reasons.push('Aktif kampanya');
      scores.push(
        buildScore(campaign.id, name, score, reasons, {
          discountPercent: campaign.discountPercent,
          tags: campaign.tags,
        }),
      );
    }
    return rankScores(scores, limit);
  }
}
