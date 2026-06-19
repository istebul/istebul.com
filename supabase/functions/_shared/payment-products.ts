/**
 * Server-side payment product catalog (authoritative for checkout).
 */

export type PaymentProduct = {
  code: string;
  amount: number;
  currency: string;
  label: string;
  leadCredits?: number;
  billingInterval?: "monthly" | "yearly" | "one_time";
};

export const PAYMENT_PRODUCTS: Record<string, PaymentProduct> = {
  pro_monthly: {
    code: "pro_monthly",
    amount: 199,
    currency: "TRY",
    label: "Pro Aylık",
    billingInterval: "monthly",
  },
  pro_yearly: {
    code: "pro_yearly",
    amount: 1990,
    currency: "TRY",
    label: "Pro Yıllık",
    billingInterval: "yearly",
  },
  premium_report: {
    code: "premium_report",
    amount: 99,
    currency: "TRY",
    label: "Premium PDF Rapor",
    billingInterval: "one_time",
  },
  partner_lead_credit_10: {
    code: "partner_lead_credit_10",
    amount: 1000,
    currency: "TRY",
    label: "Partner 10 lead kontörü",
    leadCredits: 10,
    billingInterval: "one_time",
  },
  partner_lead_credit_50: {
    code: "partner_lead_credit_50",
    amount: 4500,
    currency: "TRY",
    label: "Partner 50 lead kontörü",
    leadCredits: 50,
    billingInterval: "one_time",
  },
  partner_monthly: {
    code: "partner_monthly",
    amount: 4990,
    currency: "TRY",
    label: "Partner Aylık",
    billingInterval: "monthly",
  },
};

const SUBSCRIPTION_CODES = new Set(["pro_monthly", "pro_yearly", "partner_monthly"]);
const PARTNER_CODES = new Set([
  "partner_lead_credit_10",
  "partner_lead_credit_50",
  "partner_monthly",
]);

export function getPaymentProduct(code: string): PaymentProduct | null {
  return PAYMENT_PRODUCTS[code] ?? null;
}

export function listPaymentProducts(): PaymentProduct[] {
  return Object.values(PAYMENT_PRODUCTS);
}

export function isSubscriptionProduct(code: string): boolean {
  return SUBSCRIPTION_CODES.has(code);
}

export function isPartnerProduct(code: string): boolean {
  return PARTNER_CODES.has(code);
}

export function assertPaymentProduct(code: string): PaymentProduct {
  const product = getPaymentProduct(code);
  if (!product) {
    throw new Error("invalid_product_code");
  }
  return product;
}
