/**
 * Realtime channel naming for P8-E Payment Gateway.
 * Channel: garson:{restaurant_id}:payment-gateway
 */
export function paymentGatewayRealtimeChannel(restaurantId: string): string {
  return `garson:${restaurantId}:payment-gateway`;
}
