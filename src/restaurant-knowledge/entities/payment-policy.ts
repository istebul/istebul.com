/** Maps from existing `payment_policies`. */
export interface PaymentPolicy {
  id: string;
  restaurantId: string;
  name: string;
  code?: string;
  description?: string;
  active?: boolean;
  requiresDeposit?: boolean;
  depositPercent?: number;
  depositAmount?: number;
  cancellationHours?: number;
  acceptedMethods?: string[];
  currency?: string;
  metadata?: Record<string, unknown>;
}

export function createPaymentPolicy(
  partial: Partial<PaymentPolicy> & Pick<PaymentPolicy, 'id' | 'restaurantId' | 'name'>,
): PaymentPolicy {
  return {
    active: true,
    currency: 'TRY',
    acceptedMethods: [],
    ...partial,
  };
}
