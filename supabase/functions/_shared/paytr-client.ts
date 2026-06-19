/**
 * PayTR iframe token helpers.
 */

export type PaytrInitInput = {
  conversationId: string;
  amount: number;
  email: string;
  userName: string;
  productLabel: string;
};

export type PaytrInitResult =
  | { ok: true; token: string; iframeUrl: string }
  | { ok: false; message: string };

async function sha256Base64(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function paytrBaseUrl(): string {
  return (Deno.env.get("PAYTR_BASE_URL") || "https://www.paytr.com").replace(/\/$/, "");
}

export async function createPaytrToken(
  input: PaytrInitInput,
): Promise<PaytrInitResult> {
  const merchantId = Deno.env.get("PAYTR_MERCHANT_ID") || "";
  const merchantKey = Deno.env.get("PAYTR_MERCHANT_KEY") || "";
  const merchantSalt = Deno.env.get("PAYTR_MERCHANT_SALT") || "";

  if (!merchantId || !merchantKey || !merchantSalt) {
    return { ok: false, message: "paytr_not_configured" };
  }

  const userIp = "127.0.0.1";
  const merchantOid = input.conversationId;
  const paymentAmount = Math.round(input.amount * 100);
  const currency = "TL";
  const testMode = Deno.env.get("PAYTR_TEST_MODE") === "1" ? "1" : "0";
  const noInstallment = "1";
  const maxInstallment = "0";

  const hashStr = `${merchantId}${userIp}${merchantOid}${input.email}${paymentAmount}${currency}${testMode}${noInstallment}${maxInstallment}${merchantSalt}`;
  const paytrToken = await sha256Base64(hashStr + merchantKey);

  const body = new URLSearchParams({
    merchant_id: merchantId,
    user_ip: userIp,
    merchant_oid: merchantOid,
    email: input.email,
    payment_amount: String(paymentAmount),
    paytr_token: paytrToken,
    user_basket: JSON.stringify([[input.productLabel, input.amount.toFixed(2), 1]]),
    debug_on: testMode,
    no_installment: noInstallment,
    max_installment: maxInstallment,
    user_name: input.userName,
    user_address: "Türkiye",
    user_phone: "05000000000",
    merchant_ok_url:
      Deno.env.get("PAYMENT_SUCCESS_URL") ||
      "https://www.istebul.com/profil?payment=success",
    merchant_fail_url:
      Deno.env.get("PAYMENT_FAILURE_URL") ||
      "https://www.istebul.com/profil?payment=failed",
    timeout_limit: "30",
    currency,
    test_mode: testMode,
  });

  try {
    const res = await fetch(`${paytrBaseUrl()}/odeme/api/get-token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await res.json().catch(() => ({}));
    const token = String(data?.token || "");
    if (data?.status === "success" && token) {
      return {
        ok: true,
        token,
        iframeUrl: `${paytrBaseUrl()}/odeme/guvenli/${token}`,
      };
    }
    return {
      ok: false,
      message: String(data?.reason || `paytr_http_${res.status}`),
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "paytr_request_failed",
    };
  }
}

/**
 * PayTR callback hash verification.
 */
export async function verifyPaytrCallbackHash(fields: {
  merchantOid: string;
  status: string;
  totalAmount: string;
  hash: string;
}): Promise<boolean> {
  const merchantKey = Deno.env.get("PAYTR_MERCHANT_KEY") || "";
  const merchantSalt = Deno.env.get("PAYTR_MERCHANT_SALT") || "";
  if (!merchantKey || !merchantSalt) return false;

  const payload =
    `${fields.merchantOid}${merchantSalt}${fields.status}${fields.totalAmount}`;
  const expected = await sha256Base64(payload + merchantKey);
  return expected === fields.hash;
}
