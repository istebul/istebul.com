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

const CHECKOUT_URI = "/payment/iyzipos/checkoutform/initialize/auth/ecom";

async function buildIyzwsv2Authorization(
  apiKey: string,
  secretKey: string,
  uriPath: string,
  body: Record<string, unknown>,
): Promise<string> {
  const randomKey = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const bodyStr = JSON.stringify(body);
  const payload = randomKey + uriPath + bodyStr;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const signature = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const authorizationString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  const base64 = btoa(authorizationString);
  return `IYZWSv2 ${base64}`;
}

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
    const authorization = await buildIyzwsv2Authorization(
      apiKey,
      secretKey,
      CHECKOUT_URI,
      payload,
    );
    const res = await fetch(`${baseUrl()}${CHECKOUT_URI}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
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
 * Webhook signature verification (X-IYZ-SIGNATURE-V3 when present).
 * @see https://docs.iyzico.com
 */
export async function verifyIyzicoWebhookSignature(
  rawBody: string,
  headers: Headers,
): Promise<boolean> {
  const secret = Deno.env.get("IYZICO_WEBHOOK_SECRET");
  if (!secret) return false;

  const signatureV3 = headers.get("x-iyz-signature-v3") || headers.get("X-IYZ-SIGNATURE-V3");
  if (!signatureV3) {
    return false;
  }

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== signatureV3.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signatureV3.charCodeAt(i);
  }
  return diff === 0;
}

export { paymentFailureUrl, paymentSuccessUrl };
