import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertSafePartnerWebhookUrl } from "../_shared/webhook-url.ts";
import {
  mapCrmLeadUpdateSignals,
  recordOutcomeSignals,
} from "../_shared/outcome-capture.ts";
import { resolveCorsOrigin } from "../_shared/cors-origins.ts";

async function writeAdminAudit(
  adminClient: ReturnType<typeof createClient>,
  actor: { id: string; email?: string | null },
  entry: {
    action: string;
    entity_table: string;
    entity_id?: string | null;
    summary?: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await adminClient.from("admin_audit_logs").insert({
      actor_id: actor.id,
      actor_email: actor.email || null,
      action: entry.action,
      entity_table: entry.entity_table,
      entity_id: entry.entity_id || null,
      summary: entry.summary || null,
      metadata: entry.metadata || {},
    });
  } catch (err) {
    console.error("admin audit log failed", err);
  }
}

const adminRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkAdminActorRateLimit(actorId: string, limit = 120, windowMs = 60_000) {
  const now = Date.now();
  const entry = adminRateLimit.get(actorId);

  if (!entry || now > entry.resetAt) {
    adminRateLimit.set(actorId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

function corsHeaders(origin: string | null) {
  const allowedOrigin = resolveCorsOrigin(origin, "https://istebul.com");

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req.headers.get("origin")) });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Supabase environment variables missing" }, 500, origin);
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return json({ error: "Authorization header missing" }, 401, origin);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json({ error: "Unauthorized" }, 401, origin);
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role, is_banned")
    .eq("id", user.id)
    .single();


  if (profileError || !profile) {
    return json({ error: "Profile not found" }, 403, origin);
  }

  if (profile.role !== "admin" || profile.is_banned === true) {
    return json({ error: "Forbidden" }, 403, origin);
  }

  if (!checkAdminActorRateLimit(user.id)) {
    return json({ error: "Too many requests" }, 429, origin);
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }

  const { action, table, id, values } = body;

  const sanitizeText = (value: unknown) =>
    String(value ?? "")
      .replace(/[<>]/g, "")
      .slice(0, 5000);

  const allowedTables = [
    "announcements",
    "faqs",
    "posts",
    "listings",
    "profiles",
    "auto_leads",
    "partner_endpoints",
    "partner_applications",
  ];

  if (!action) {
    return json({ error: "Missing action" }, 400, origin);
  }

  const listTables = [
    "announcements",
    "faqs",
    "posts",
    "listings",
    "profiles",
    "auto_leads",
    "auto_events",
    "analytics_events",
    "partner_endpoints",
    "partner_applications",
    "partner_lead_dispatch_logs",
    "operational_events",
    "admin_audit_logs",
    "site_settings",
    "subscriptions",
  ];

  if (action === "upsert_settings") {
    if (table !== "site_settings") {
      return json({ error: "Invalid settings table" }, 400, origin);
    }
  } else if (action === "list") {
    if (!table || !listTables.includes(table)) {
      return json({ error: "Invalid action or table" }, 400, origin);
    }
  } else if (!allowedTables.includes(table)) {
    return json({ error: "Invalid action or table" }, 400, origin);
  }

  if (action !== "upsert_settings" && action !== "list" && !id) {
    return json({ error: "Missing id" }, 400, origin);
  }

  try {
    if (action === "list") {
      const selectColumns: Record<string, string> = {
        auto_leads: "*",
        auto_events: "*",
        analytics_events: "*",
        announcements: "*",
        faqs: "*",
        posts: "*",
        listings: "*",
        profiles: "*",
        partner_endpoints: "*",
        partner_applications: "*",
        partner_lead_dispatch_logs: "*",
        operational_events: "created_at, severity, category, event_name, source, fingerprint, properties, http_status, duration_ms",
        admin_audit_logs: "created_at, actor_email, action, entity_table, summary",
        site_settings: "*",
        subscriptions: "*",
      };

      const allowedOrderColumns: Record<string, string[]> = {
        auto_leads: ["created_at", "lead_score", "follow_up_at"],
        auto_events: ["created_at"],
        analytics_events: ["created_at"],
        announcements: ["created_at"],
        faqs: ["order_num", "created_at"],
        posts: ["created_at"],
        listings: ["created_at"],
        profiles: ["created_at"],
        partner_endpoints: ["created_at"],
        partner_applications: ["created_at"],
        partner_lead_dispatch_logs: ["created_at"],
        operational_events: ["created_at", "severity"],
        admin_audit_logs: ["created_at"],
        site_settings: ["key"],
        subscriptions: ["created_at"],
      };

      const orderColumn = body.order?.column || "created_at";
      const orderAscending = body.order?.ascending === true;
      const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 1000);
      const selectExpr = String(body.select || selectColumns[table] || "*").slice(0, 500);

      if (!allowedOrderColumns[table]?.includes(orderColumn)) {
        return json({ error: "Invalid order column" }, 400, origin);
      }

      let query = adminClient
        .from(table)
        .select(selectExpr)
        .order(orderColumn, { ascending: orderAscending })
        .limit(limit);

      const { data, error } = await query;

      if (error) {
        const msg = String(error.message || "");
        const code = String((error as { code?: string }).code || "");
        if (
          code === "42P01" ||
          msg.includes("does not exist") ||
          msg.includes("schema cache")
        ) {
          return json({ ok: true, data: [] }, 200, origin);
        }
        throw error;
      }

      return json({ ok: true, data: data ?? [] }, 200, origin);
    }

    if (action === "delete") {
      const deletableTables = ["announcements", "faqs", "posts", "listings"];

      if (!deletableTables.includes(table)) {
        return json({ error: "Delete not allowed for this table" }, 400, origin);
      }

      const { error } = await adminClient
        .from(table)
        .delete()
        .eq("id", id);

      if (error) throw error;

      await writeAdminAudit(adminClient, user, {
        action: "delete",
        entity_table: table,
        entity_id: id,
        summary: `Deleted ${table} record`,
      });

      return json({ ok: true }, 200, origin);
    }

    if (action === "insert") {
      if (!values || typeof values !== "object") {
        return json({ error: "Missing insert values" }, 400, origin);
      }

      const allowedInserts: Record<string, string[]> = {
        announcements: ["title", "content", "is_active"],
        faqs: ["question", "answer", "order_num", "is_active"],
        posts: ["title", "slug", "content", "is_published"],
        partner_endpoints: ["name", "route_type", "webhook_url", "shared_secret", "is_active", "priority_weight", "daily_cap", "notes", "failover_route", "min_lead_priority"],
        partner_applications: ["status", "notes", "webhook_url_draft", "partner_endpoint_id", "billing_plan"],
      };

      const allowedKeys = allowedInserts[table] || [];
      const keys = Object.keys(values);
      const invalidKey = keys.find((key) => !allowedKeys.includes(key));

      if (!allowedKeys.length) {
        return json({ error: "Insert not allowed for this table" }, 400, origin);
      }

      if (invalidKey) {
        return json({ error: `Invalid insert field: ${invalidKey}` }, 400, origin);
      }

      if (table === "partner_endpoints" && typeof values.webhook_url === "string") {
        try {
          values.webhook_url = assertSafePartnerWebhookUrl(values.webhook_url);
        } catch (urlError) {
          return json({
            error: urlError instanceof Error ? urlError.message : "Invalid webhook URL",
          }, 400, origin);
        }
      }

      const { error } = await adminClient
        .from(table)
        .insert(values);

      if (error) throw error;

      await writeAdminAudit(adminClient, user, {
        action: "insert",
        entity_table: table,
        summary: `Inserted ${table} record`,
        metadata: { keys: Object.keys(values) },
      });

      return json({ ok: true }, 200, origin);
    }

    if (action === "upsert_settings") {
      if (!Array.isArray(values)) {
        return json({ error: "Settings payload must be an array" }, 400, origin);
      }

      const allowedSettingKeys = [
        "phone","email","address","instagram","twitter","facebook",
        "linkedin","youtube","tiktok","site-name","site-subtitle",
        "hero-eyebrow","hero-title","hero-desc","title","description",
        "auto_whatsapp_phone","maintenance","public_campaigns"
      ];

      for (const row of values) {
        if (!row || typeof row !== "object") {
          return json({ error: "Invalid settings row" }, 400, origin);
        }

        if (!allowedSettingKeys.includes(String(row.key || ""))) {
          return json({ error: `Invalid settings key: ${row.key}` }, 400, origin);
        }
      }

      const normalizedSettings = values.map((row: Record<string, unknown>) => ({
        key: String(row.key || "").trim(),
        value: String(row.value ?? ""),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await adminClient
        .from("site_settings")
        .upsert(normalizedSettings, { onConflict: "key" });

      if (error) {
        return json({ error: "Settings update failed" }, 500, origin);
      }

      await writeAdminAudit(adminClient, user, {
        action: "upsert_settings",
        entity_table: "site_settings",
        summary: `Updated ${normalizedSettings.length} settings`,
      });

      return json({ ok: true }, 200, origin);
    }

    if (action === "update") {
      if (!values || typeof values !== "object") {
        return json({ error: "Missing update values" }, 400, origin);
      }

      const allowedUpdates: Record<string, string[]> = {
        announcements: ["is_active"],
        faqs: ["is_active"],
        posts: ["is_published"],
        listings: ["is_featured"],
        profiles: ["role", "is_banned"],
        auto_leads: ["status", "notes", "follow_up_at", "follow_up_done", "partner_status", "estimated_revenue", "actual_revenue", "commission_notes", "dispatch_retry_count", "last_dispatch_at", "next_retry_at", "last_dispatch_error"],
        partner_endpoints: ["name", "route_type", "webhook_url", "shared_secret", "is_active", "priority_weight", "daily_cap", "notes", "failover_route", "min_lead_priority", "health_status"],
        partner_applications: ["status", "notes", "webhook_url_draft", "partner_endpoint_id", "billing_plan"],
      };

      const keys = Object.keys(values);
      const allowedKeys = allowedUpdates[table] || [];

      const invalidKey = keys.find((key) => !allowedKeys.includes(key));
      if (invalidKey) {
        return json({ error: `Invalid update field: ${invalidKey}` }, 400, origin);
      }

      if (
        table === "profiles" &&
        values.role &&
        !["admin", "user"].includes(values.role)
     ) {
        return json({ error: "Invalid role value" }, 400, origin);
      }

      if (table === "profiles" && values.role === "admin") {
        return json({
          error: "Admin role cannot be granted via the panel; use Supabase dashboard or a controlled bootstrap process",
        }, 403, origin);
      }

      if (table === "profiles" && id === user.id && values.role === "user") {
        return json({ error: "You cannot remove your own admin role" }, 400, origin);
      }

      if (table === "profiles" && id === user.id && values.is_banned === true) {
         return json({ error: "You cannot ban your own account" }, 400, origin);
      }
      if (table === "profiles" && (values.role === "user" || values.is_banned === true)) {
        const { count } = await adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");

        if ((count || 0) <= 1) {
          return json({ error: "At least one admin account must remain" }, 400, origin);
        }
      }


      if (table === "auto_leads" && typeof values.notes === "string") {
        values.notes = sanitizeText(values.notes);
      }

      if (table === "auto_leads" && typeof values.partner_status === "string") {
        const realizedStatuses = ["paid", "closed", "won", "delivered", "funded", "purchased"];

        if (realizedStatuses.includes(values.partner_status) && values.actual_revenue === undefined) {
          const { data: lead } = await adminClient
            .from("auto_leads")
            .select("estimated_revenue, actual_revenue")
            .eq("id", id)
            .single();

          values.actual_revenue = Number(
            lead?.actual_revenue || lead?.estimated_revenue || 0
          );
        }
      }

      if (table === "partner_endpoints" && typeof values.webhook_url === "string") {
        try {
          values.webhook_url = assertSafePartnerWebhookUrl(values.webhook_url);
        } catch (urlError) {
          return json({
            error: urlError instanceof Error ? urlError.message : "Invalid webhook URL",
          }, 400, origin);
        }
      }

      const { error } = await adminClient
        .from(table)
        .update(values)
        .eq("id", id);

      if (error) throw error;

      if (table === "auto_leads") {
        const crmSignals = mapCrmLeadUpdateSignals(values);
        if (crmSignals.length) {
          try {
            const { data: leadMeta } = await adminClient
              .from("auto_leads")
              .select("decision_session_id, segment_key")
              .eq("id", id)
              .maybeSingle();

            await recordOutcomeSignals(adminClient, crmSignals, {
              lead_id: id,
              decision_session_id: leadMeta?.decision_session_id ?? null,
              segment_key: leadMeta?.segment_key ?? null,
              idempotency_prefix: `crm:${id}:${Object.keys(values).sort().join(",")}`,
            });
          } catch {
            /* non-blocking */
          }
        }
      }

      await writeAdminAudit(adminClient, user, {
        action: "update",
        entity_table: table,
        entity_id: id,
        summary: `Updated ${table}`,
        metadata: { fields: Object.keys(values) },
      });

      return json({ ok: true }, 200, origin);
    }

    return json({ error: "Unsupported action" }, 400, origin);
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error && err.message ? err.message : "Server error";
    return json({ error: message }, 500, origin);
  }
});
