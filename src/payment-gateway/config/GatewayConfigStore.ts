import type { PaymentGatewayConfig, PaymentMode, PaymentProviderCode } from '../types.ts';

function nowIso(): string {
  return new Date().toISOString();
}

function idFor(restaurantId: string): string {
  return `pgw_cfg_${restaurantId}`;
}

/** In-memory per-restaurant gateway config (Supabase tables mirror this shape). */
export class GatewayConfigStore {
  private readonly byRestaurant = new Map<string, PaymentGatewayConfig>();

  get(restaurantId: string): PaymentGatewayConfig | null {
    return this.byRestaurant.get(restaurantId) || null;
  }

  upsert(input: {
    restaurantId: string;
    activeProvider?: PaymentProviderCode;
    mode?: PaymentMode;
    webhookSecret?: string;
    merchantId?: string;
    providerMetadata?: Record<string, unknown>;
    enabled?: boolean;
  }): PaymentGatewayConfig {
    const existing = this.byRestaurant.get(input.restaurantId);
    const stamp = nowIso();
    const next: PaymentGatewayConfig = {
      id: existing?.id || idFor(input.restaurantId),
      restaurantId: input.restaurantId,
      activeProvider: input.activeProvider || existing?.activeProvider || 'mock',
      mode: input.mode || existing?.mode || 'test',
      webhookSecret: input.webhookSecret ?? existing?.webhookSecret ?? 'test_webhook_secret',
      merchantId: input.merchantId ?? existing?.merchantId ?? `merchant_${input.restaurantId}`,
      providerMetadata: {
        ...(existing?.providerMetadata || {}),
        ...(input.providerMetadata || {}),
      },
      enabled: input.enabled ?? existing?.enabled ?? true,
      createdAt: existing?.createdAt || stamp,
      updatedAt: stamp,
    };
    this.byRestaurant.set(input.restaurantId, next);
    return next;
  }

  ensureDefault(restaurantId: string): PaymentGatewayConfig {
    return this.get(restaurantId) || this.upsert({ restaurantId });
  }

  list(): PaymentGatewayConfig[] {
    return [...this.byRestaurant.values()];
  }
}
