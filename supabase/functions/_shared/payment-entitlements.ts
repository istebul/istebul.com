import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getPaymentProduct,
  isPartnerProduct,
  isSubscriptionProduct,
} from "./payment-products.ts";

type OrderRow = {
  id: string;
  user_id: string | null;
  product_code: string;
  metadata?: Record<string, unknown>;
};

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function subscriptionPeriodEnd(productCode: string, start: Date): Date {
  if (productCode === "pro_yearly") return addYears(start, 1);
  return addMonths(start, 1);
}

/**
 * Idempotent grant after successful payment (paid order only).
 */
export async function grantEntitlementsForPaidOrder(
  sb: SupabaseClient,
  order: OrderRow,
  provider: "iyzico" | "paytr" | "stripe",
): Promise<void> {
  const product = getPaymentProduct(order.product_code);
  if (!product || !order.user_id) return;

  const now = new Date();
  const meta = (order.metadata || {}) as Record<string, unknown>;
  const partnerId = (meta.partner_id as string) || null;

  if (isSubscriptionProduct(order.product_code)) {
    const periodEnd = subscriptionPeriodEnd(order.product_code, now);
    const { data: existing } = await sb
      .from("subscriptions")
      .select("id")
      .eq("user_id", order.user_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      user_id: order.user_id,
      provider,
      plan_code: order.product_code,
      status: "active",
      started_at: now.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      source_order_id: order.id,
      updated_at: now.toISOString(),
    };

    if (existing?.id) {
      await sb.from("subscriptions").update(payload).eq("id", existing.id);
    } else {
      await sb.from("subscriptions").insert(payload);
    }

    await sb
      .from("profiles")
      .update({
        plan: "pro",
        subscription_status: "active",
        updated_at: now.toISOString(),
      })
      .eq("id", order.user_id);
  }

  if (order.product_code === "premium_report") {
    await sb.from("user_entitlements").insert({
      user_id: order.user_id,
      entitlement_code: "premium_report",
      source_order_id: order.id,
      status: "active",
    });
  }

  if (isPartnerProduct(order.product_code) && partnerId) {
    if (order.product_code === "partner_monthly") {
      const { data: billing } = await sb
        .from("partner_billing")
        .select("id, lead_credit_balance")
        .eq("partner_id", partnerId)
        .maybeSingle();

      const patch = {
        partner_id: partnerId,
        provider,
        plan_code: order.product_code,
        status: "active",
        monthly_quota: 100,
        updated_at: now.toISOString(),
      };

      if (billing?.id) {
        await sb.from("partner_billing").update(patch).eq("id", billing.id);
      } else {
        await sb.from("partner_billing").insert({
          ...patch,
          lead_credit_balance: billing?.lead_credit_balance ?? 0,
        });
      }
    }

    const credits = product.leadCredits ?? 0;
    if (credits > 0) {
      await sb.from("partner_lead_credits").insert({
        partner_id: partnerId,
        source_order_id: order.id,
        credit_amount: credits,
        used_amount: 0,
      });

      const { data: billingRow } = await sb
        .from("partner_billing")
        .select("id, lead_credit_balance")
        .eq("partner_id", partnerId)
        .maybeSingle();

      const nextBalance = (billingRow?.lead_credit_balance ?? 0) + credits;
      if (billingRow?.id) {
        await sb
          .from("partner_billing")
          .update({
            lead_credit_balance: nextBalance,
            updated_at: now.toISOString(),
          })
          .eq("id", billingRow.id);
      } else {
        await sb.from("partner_billing").insert({
          partner_id: partnerId,
          provider,
          plan_code: "lead_credits",
          status: "active",
          lead_credit_balance: nextBalance,
          monthly_quota: 0,
        });
      }
    }
  }
}

export async function markOrderPaid(
  sb: SupabaseClient,
  orderId: string,
  providerPaymentId?: string | null,
): Promise<{ alreadyPaid: boolean }> {
  const { data: order, error } = await sb
    .from("payment_orders")
    .select("id, status, user_id, product_code, metadata")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) throw new Error("order_not_found");
  if (order.status === "paid") return { alreadyPaid: true };

  await sb
    .from("payment_orders")
    .update({
      status: "paid",
      provider_payment_id: providerPaymentId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  return { alreadyPaid: false };
}

export async function findOrderByConversationId(
  sb: SupabaseClient,
  conversationId: string,
) {
  const { data, error } = await sb
    .from("payment_orders")
    .select("id, status, user_id, product_code, metadata, provider")
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
