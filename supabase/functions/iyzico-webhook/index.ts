import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isIyzicoConfigured } from "../_shared/payment-env.ts";
import {
  findOrderByConversationId,
  grantEntitlementsForPaidOrder,
  markOrderPaid,
} from "../_shared/payment-entitlements.ts";
import { verifyIyzicoWebhookSignature } from "../_shared/iyzico-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405 });
  }

  if (!isIyzicoConfigured()) {
    return new Response(JSON.stringify({ ok: false, code: "NOT_CONFIGURED" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = { raw: rawBody };
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const signatureValid = await verifyIyzicoWebhookSignature(rawBody, req.headers);
  const eventType = String(payload?.paymentStatus || payload?.status || "unknown");
  const conversationId = String(
    payload?.conversationId || payload?.conversation_id || "",
  ).trim();

  const logBase = {
    provider: "iyzico",
    event_type: eventType,
    raw_payload: payload,
    signature_valid: signatureValid,
    processed: false,
  };

  if (!signatureValid) {
    await sb.from("payment_webhook_logs").insert({
      ...logBase,
      error_message: "invalid_signature",
    });
    return new Response(JSON.stringify({ ok: false, rejected: true }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!conversationId) {
    await sb.from("payment_webhook_logs").insert({
      ...logBase,
      error_message: "missing_conversation_id",
    });
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }

  try {
    const order = await findOrderByConversationId(sb, conversationId);
    if (!order) {
      await sb.from("payment_webhook_logs").insert({
        ...logBase,
        error_message: "order_not_found",
      });
      return new Response(JSON.stringify({ ok: false }), { status: 404 });
    }

    const paymentStatus = String(payload?.paymentStatus || payload?.status || "")
      .toLowerCase();
    const success = paymentStatus === "success" || paymentStatus === "paid";

    if (success) {
      const { alreadyPaid } = await markOrderPaid(
        sb,
        order.id,
        String(payload?.paymentId || payload?.payment_id || ""),
      );
      if (!alreadyPaid) {
        await grantEntitlementsForPaidOrder(sb, order, "iyzico");
      }
      await sb.from("payment_webhook_logs").insert({
        ...logBase,
        processed: true,
      });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    await sb
      .from("payment_orders")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", order.id);

    await sb.from("payment_webhook_logs").insert({
      ...logBase,
      processed: true,
      error_message: `payment_${paymentStatus || "failed"}`,
    });

    return new Response(JSON.stringify({ ok: true, status: "failed_recorded" }), {
      status: 200,
    });
  } catch (err) {
    await sb.from("payment_webhook_logs").insert({
      ...logBase,
      error_message: err instanceof Error ? err.message : "processing_error",
    });
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
});
