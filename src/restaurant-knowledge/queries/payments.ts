import type { PaymentPolicy } from '../entities/payment-policy.ts';
import type { RestaurantSnapshot } from '../types/snapshot.ts';

export function listPaymentPolicies(snapshot: RestaurantSnapshot): PaymentPolicy[] {
  return snapshot.paymentPolicies.filter((p) => p.active !== false);
}

export function getPrimaryDepositPolicy(
  snapshot: RestaurantSnapshot,
): PaymentPolicy | undefined {
  return listPaymentPolicies(snapshot).find((p) => p.requiresDeposit);
}

export function summarizePaymentPolicies(snapshot: RestaurantSnapshot): string {
  const policies = listPaymentPolicies(snapshot);
  if (!policies.length) return 'Ödeme politikası tanımlı değil.';
  return policies
    .map((p) => {
      const bits = [p.name];
      if (p.requiresDeposit) {
        if (p.depositPercent !== undefined) bits.push(`depozito %${p.depositPercent}`);
        if (p.depositAmount !== undefined) bits.push(`depozito ${p.depositAmount}`);
      }
      if (p.cancellationHours !== undefined) {
        bits.push(`iptal ${p.cancellationHours}s`);
      }
      if (p.acceptedMethods?.length) {
        bits.push(`yöntem: ${p.acceptedMethods.join(',')}`);
      }
      return bits.join(' — ');
    })
    .join('; ');
}
