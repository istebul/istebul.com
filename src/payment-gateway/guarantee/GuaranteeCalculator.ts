import type { GuaranteeQuote, GuaranteeRuleInput, GuaranteeRuleKind } from '../types.ts';

export interface GuaranteeContext {
  partySize: number;
  reservationDate: string; // YYYY-MM-DD
  /** Optional estimated bill for percent rules. */
  estimatedBill?: number;
}

function isWeekend(dateIso: string): boolean {
  const day = new Date(`${dateIso}T12:00:00`).getDay();
  return day === 0 || day === 6;
}

function isSpecialDay(dateIso: string, specialDays: string[] = []): boolean {
  return specialDays.includes(dateIso);
}

/**
 * Reservation Guarantee rules:
 * fixed / per_guest / percent / weekend / special_day
 */
export function calculateGuaranteeQuote(
  rules: GuaranteeRuleInput | GuaranteeRuleInput[],
  context: GuaranteeContext,
): GuaranteeQuote {
  const list = Array.isArray(rules) ? rules : [rules];
  const applied: GuaranteeRuleKind[] = [];
  let amount = 0;
  let currency = 'TRY';

  for (const rule of list) {
    currency = rule.currency || currency;
    switch (rule.kind) {
      case 'fixed': {
        const value = Number(rule.fixedAmount || 0);
        if (value > 0) {
          amount = Math.max(amount, value);
          applied.push('fixed');
        }
        break;
      }
      case 'per_guest': {
        const per = Number(rule.perGuestAmount || 0);
        if (per > 0) {
          amount = Math.max(amount, per * Math.max(1, context.partySize));
          applied.push('per_guest');
        }
        break;
      }
      case 'percent': {
        const pct = Number(rule.percent || 0);
        const base = Number(rule.baseAmount ?? context.estimatedBill ?? 0);
        if (pct > 0 && base > 0) {
          amount = Math.max(amount, Math.round((pct / 100) * base));
          applied.push('percent');
        }
        break;
      }
      case 'weekend': {
        if (isWeekend(context.reservationDate)) {
          const value = Number(rule.weekendAmount || rule.fixedAmount || 0);
          if (value > 0) {
            amount = Math.max(amount, value);
            applied.push('weekend');
          }
        }
        break;
      }
      case 'special_day': {
        if (isSpecialDay(context.reservationDate, rule.specialDayDates)) {
          const value = Number(rule.specialDayAmount || rule.fixedAmount || 0);
          if (value > 0) {
            amount = Math.max(amount, value);
            applied.push('special_day');
          }
        }
        break;
      }
      default:
        break;
    }
  }

  const required = amount > 0;
  return {
    required,
    amount,
    currency,
    appliedRules: applied,
    summary: required
      ? `Garanti gerekli: ${amount} ${currency} (${applied.join(', ') || 'rule'})`
      : 'Garanti gerekli değil',
  };
}

export function guaranteeRequired(quote: GuaranteeQuote): boolean {
  return quote.required && quote.amount > 0;
}
