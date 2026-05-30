/**
 * iyzico checkout initialize adapter (fetch-based).
 * Signature: IYZWSv2 per iyzico docs — full HMAC implementation TODO when keys are live.
 */

import { paymentFailureUrl, paymentSuccessUrl } from "./payment-env.ts";

export type IyzicoInitInput = {
  conversationId: string;
  amount: number;
  currency: string;
  productLabel: string;
  buyerEmail?: string;
  buyerName?: string;
};

export type IyzicoInitResult =
  | { ok: true; paymentPageUrl: string; token: string }
  | { ok: false; message: string };

function baseUrl(): string {
  return (Deno.env.get("IYZICO_BASE_URL") || "https://api.iyzipay.com").replace(/\/$/, "");
}

/**
 * TODO(iyzico): Replace placeholder Authorization with IYZWSv2 signed request body.
 */
export async function initializeIyzicoCheckout(
  input: IyzicoInitInput,
): Promise<IyzicoInitResult> {
  const apiKey = Deno.env.get("IYZICO_API_KEY") || "";
  const secretKey = Deno.env.get("IYZICO_SECRET_KEY") || "";
  if (!apiKey || !secretKey) {
    return { ok: false, message: "iyzico_not_configured" };
  }

  const payload = {
    locale: "tr",
    conversationId: input.conversationId,
    price: input.amount.toFixed(2),
    paidPrice: input.amount.toFixed(2),
    currency: input.currency,
    basketId: input.conversationId,
    paymentGroup: "PRODUCT",
    callbackUrl: paymentSuccessUrl(),
    enabledInstallments: [1],
    buyer: {
      id: input.conversationId,
      name: input.buyerName || "Müşteri",
      surname: "isteBul",
      email: input.buyerEmail || "payments@istebul.com",
      identityNumber: "11111111111",
      registrationAddress: "Türkiye",
      city: "Istanbul",
      country: "Turkey",
    },
    billingAddress: {
      contactName: input.buyerName || "Müşteri",
      city: "Istanbul",
      country: "Turkey",
      address: "Türkiye",
    },
    basketItems: [
      {
        id: input.conversationId,
        name: input.productLabel,
        category1: "Digital",
        itemType: "VIRTUAL",
        price: input.amount.toFixed(2),
      },
    ],
  };

  try {
    const res = await fetch(`${baseUrl()}/payment/iyzipos/checkoutform/initialize/auth/ecom`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `IYZWS ${apiKey}:${secretKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    const token = String(data?.token || "");
    const paymentPageUrl = String(data?.paymentPageUrl || "");

    if (res.ok && data?.status === "success" && paymentPageUrl) {
      return { ok: true, paymentPageUrl, token };
    }

    return {
      ok: false,
      message: String(data?.errorMessage || data?.errorCode || `iyzico_http_${res.status}`),
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "iyzico_request_failed",
    };
  }
}

/**
 * Webhook signature verification — default reject until implemented.
 * TODO(iyzico): Implement per https://dev.iyzipay.com webhook docs.
 */
export function verifyIyzicoWebhookSignature(
  _rawBody: string,
  _headers: Headers,
): boolean {
  const secret = Deno.env.get("IYZICO_WEBHOOK_SECRET");
  if (!secret) return false;
  // TODO: HMAC validation with IYZICO_WEBHOOK_SECRET
  return false;
}

export { paymentFailureUrl, paymentSuccessUrl };
