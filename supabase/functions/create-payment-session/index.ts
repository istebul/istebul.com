import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { paymentJson, paymentCorsHeaders } from "../_shared/cors.ts";
import { assertPaymentProduct } from "../_shared/payment-products.ts";
import {
  generateConversationId,
  isIyzicoConfigured,
  isPaytrConfigured,
} from "../_shared/payment-env.ts";
import { initializeIyzicoCheckout } from "../_shared/iyzico-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function getUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
  });
  if (!res.ok) return null;
  return res.json();
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: paymentCorsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return paymentJson({ ok: false, error: "method_not_allowed" }, 405, origin);
  }

  const user = await getUser(req);
  if (!user?.id) {
    return paymentJson({ ok: false, code: "UNAUTHORIZED", message: "Giriş gerekli." }, 401, origin);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return paymentJson({ ok: false, code: "INVALID_JSON" }, 400, origin);
  }

  const productCode = String(body.product_code || "").trim();
  const provider = String(body.provider || "iyzico").toLowerCase();

  if (provider !== "iyzico") {
    return paymentJson(
      { ok: false, code: "INVALID_PROVIDER", message: "Use paytr-create-payment-session for PayTR." },
      400,
      origin,
    );
  }

  let product;
  try {
    product = assertPaymentProduct(productCode);
  } catch {
    return paymentJson(
      { ok: false, code: "INVALID_PRODUCT", message: "Geçersiz ürün kodu." },
      400,
      origin,
    );
  }

  if (!isIyzicoConfigured()) {
    return paymentJson(
      {
        ok: false,
        code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
        message: "Ödeme sağlayıcı yapılandırması bekleniyor.",
        fallbackAvailable: isPaytrConfigured(),
      },
      503,
      origin,
    );
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const conversationId = generateConversationId();
  const metadata = (body.metadata && typeof body.metadata === "object")
    ? body.metadata as Record<string, unknown>
    : {};

  const { data: order, error: orderError } = await sb
    .from("payment_orders")
    .insert({
      user_id: user.id,
      provider: "iyzico",
      product_code: product.code,
      amount: product.amount,
      currency: product.currency,
      status: "pending",
      conversation_id: conversationId,
      metadata,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return paymentJson(
      { ok: false, code: "ORDER_CREATE_FAILED", message: "Sipariş oluşturulamadı." },
      500,
      origin,
    );
  }

  const init = await initializeIyzicoCheckout({
    conversationId,
    amount: product.amount,
    currency: product.currency,
    productLabel: product.label,
    buyerEmail: user.email,
    buyerName: user.user_metadata?.full_name || user.email,
  });

  if (!init.ok) {
    await sb
      .from("payment_orders")
      .update({ status: "failed", metadata: { ...metadata, init_error: init.message } })
      .eq("id", order.id);

    return paymentJson(
      {
        ok: false,
        provider: "iyzico",
        code: "CHECKOUT_INIT_FAILED",
        message: init.message,
        fallbackAvailable: isPaytrConfigured(),
      },
      502,
      origin,
    );
  }

  await sb
    .from("payment_orders")
    .update({ provider_token: init.token })
    .eq("id", order.id);

  return paymentJson(
    {
      ok: true,
      provider: "iyzico",
      paymentPageUrl: init.paymentPageUrl,
      conversationId,
      orderId: order.id,
    },
    200,
    origin,
  );
});
