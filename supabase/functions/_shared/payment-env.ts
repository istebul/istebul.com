/**
 * Payment provider environment probes (no secrets exposed to clients).
 */

export type ProviderRuntimeStatus = "configured" | "pending" | "passive";

export function isIyzicoConfigured(): boolean {
  return Boolean(
    Deno.env.get("IYZICO_API_KEY") &&
      Deno.env.get("IYZICO_SECRET_KEY") &&
      Deno.env.get("IYZICO_BASE_URL"),
  );
}

export function isPaytrConfigured(): boolean {
  return Boolean(
    Deno.env.get("PAYTR_MERCHANT_ID") &&
      Deno.env.get("PAYTR_MERCHANT_KEY") &&
      Deno.env.get("PAYTR_MERCHANT_SALT"),
  );
}

export function isStripeConfigured(): boolean {
  return Boolean(Deno.env.get("STRIPE_SECRET_KEY"));
}

export function paymentSuccessUrl(): string {
  return (
    Deno.env.get("PAYMENT_SUCCESS_URL") ||
    "https://www.istebul.com/profil?payment=success"
  );
}

export function paymentFailureUrl(): string {
  return (
    Deno.env.get("PAYMENT_FAILURE_URL") ||
    "https://www.istebul.com/profil?payment=failed"
  );
}

export function providerStatusSnapshot(): Record<
  string,
  { status: ProviderRuntimeStatus; scope?: string }
> {
  return {
    iyzico: { status: isIyzicoConfigured() ? "configured" : "pending" },
    paytr: { status: isPaytrConfigured() ? "configured" : "pending" },
    stripe: {
      status: "passive",
      scope: "global_provider_passive",
    },
  };
}

export function generateConversationId(): string {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `istebul_${Date.now()}_${rand}`;
}
