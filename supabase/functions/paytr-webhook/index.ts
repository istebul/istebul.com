import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isPaytrConfigured } from "../_shared/payment-env.ts";
import {
  findOrderByConversationId,
  grantEntitlementsForPaidOrder,
  markOrderPaid,
} from "../_shared/payment-entitlements.ts";
import { verifyPaytrCallbackHash } from "../_shared/paytr-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function parsePaytrBody(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await req.json();
    return Object.fromEntries(
      Object.entries(json).map(([k, v]) => [k, String(v ?? "")]),
    );
  }
  const text = await req.text();
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("FAIL", { status: 405 });
  }

  if (!isPaytrConfigured()) {
    return new Response("FAIL", { status: 503 });
  }

  const fields = await parsePaytrBody(req);
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const merchantOid = String(fields.merchant_oid || "");
  const status = String(fields.status || "");
  const totalAmount = String(fields.total_amount || "");
  const hash = String(fields.hash || "");

  const signatureValid = await verifyPaytrCallbackHash({
    merchantOid,
    status,
    totalAmount,
    hash,
  });

  const logBase = {
    provider: "paytr",
    event_type: status || "callback",
    raw_payload: fields,
    signature_valid: signatureValid,
    processed: false,
  };

  if (!signatureValid) {
    await sb.from("payment_webhook_logs").insert({
      ...logBase,
      error_message: "invalid_signature",
    });
    return new Response("FAIL", { status: 200 });
  }

  if (!merchantOid) {
    await sb.from("payment_webhook_logs").insert({
      ...logBase,
      error_message: "missing_merchant_oid",
    });
    return new Response("FAIL", { status: 200 });
  }

  try {
    const order = await findOrderByConversationId(sb, merchantOid);
    if (!order) {
      await sb.from("payment_webhook_logs").insert({
        ...logBase,
        error_message: "order_not_found",
      });
      return new Response("FAIL", { status: 200 });
    }

    if (status === "success") {
      const { alreadyPaid } = await markOrderPaid(sb, order.id, merchantOid);
      if (!alreadyPaid) {
        await grantEntitlementsForPaidOrder(sb, order, "paytr");
      }
      await sb.from("payment_webhook_logs").insert({ ...logBase, processed: true });
      return new Response("OK", { status: 200 });
    }

    await sb
      .from("payment_orders")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", order.id);

    await sb.from("payment_webhook_logs").insert({
      ...logBase,
      processed: true,
      error_message: `status_${status}`,
    });
    return new Response("OK", { status: 200 });
  } catch (err) {
    await sb.from("payment_webhook_logs").insert({
      ...logBase,
      error_message: err instanceof Error ? err.message : "processing_error",
    });
    return new Response("FAIL", { status: 200 });
  }
});
