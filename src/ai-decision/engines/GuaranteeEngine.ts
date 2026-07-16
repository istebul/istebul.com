import type { DecisionContext } from '../context/DecisionContext.ts';
import { buildScore } from '../scoring/DecisionScorer.ts';
import type { DecisionScore } from '../types.ts';

export interface GuaranteeSuggestion {
  amount: number;
  currency: string;
  required: boolean;
  policyId?: string;
  recommendations: DecisionScore[];
  summary: string;
}

/**
 * Guarantee amount suggestion from payment policies (Knowledge) — no capture.
 */
export class GuaranteeEngine {
  suggest(ctx: DecisionContext): GuaranteeSuggestion {
    const policy = ctx.paymentPolicies[0];
    const currency = policy?.currency || 'TRY';
    let amount = 0;
    const reasons: string[] = [];

    if (!policy) {
      amount = Math.max(0, ctx.partySize * 100);
      reasons.push('Politika yok — kişi başı varsayılan 100');
    } else {
      const deposit = Number(policy.depositAmount || 0);
      const percent = Number(policy.depositPercent || 0);
      const bill = Number(ctx.input.estimatedBill || 500);
      if (deposit > 0) {
        amount = Math.max(amount, deposit);
        reasons.push(`Sabit depozito ${deposit}`);
      }
      if (percent > 0) {
        const pctAmount = Math.round((percent / 100) * bill);
        amount = Math.max(amount, pctAmount);
        reasons.push(`%${percent} üzerinden ${pctAmount}`);
      }
      // Per-guest heuristic when policy only has name/meta
      if (amount <= 0) {
        amount = ctx.partySize * 100;
        reasons.push(`Kişi başı varsayılan (${ctx.partySize}×100)`);
      }
      const day = new Date(`${ctx.asOfDate}T12:00:00`).getDay();
      if (day === 0 || day === 6) {
        amount = Math.round(amount * 1.2);
        reasons.push('Hafta sonu +%20');
      }
    }

    const required = amount > 0;
    const recommendations = [
      buildScore(
        policy?.id || 'default-guarantee',
        policy?.name || 'Varsayılan garanti',
        required ? 80 : 20,
        reasons,
        { amount, currency, partySize: ctx.partySize },
      ),
    ];

    return {
      amount,
      currency,
      required,
      policyId: policy?.id,
      recommendations,
      summary: required
        ? `Önerilen garanti: ${amount} ${currency}`
        : 'Garanti gerekli değil',
    };
  }
}
