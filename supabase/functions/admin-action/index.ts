import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://istebul.com",
  "https://www.istebul.com",
  "https://istebul-com.pages.dev"
];

function corsHeaders(origin: string | null) {
  const allowedOrigin = allowedOrigins.includes(origin || "")
    ? origin
    : "https://istebul.com";

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
  ];

  if (!action || !allowedTables.includes(table)) {
    return json({ error: "Invalid action or table" }, 400, origin);
  }

  if (action !== "upsert_settings" && !id) {
    return json({ error: "Missing id" }, 400, origin);
  }

  try {
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
        partner_endpoints: ["name", "route_type", "webhook_url", "shared_secret", "is_active", "priority_weight", "daily_cap", "notes"],
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

      const { error } = await adminClient
        .from(table)
        .insert(values);

      if (error) throw error;

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
        "maintenance"
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
        return json({ error: error.message }, 500, origin);
      }

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
        partner_endpoints: ["name", "route_type", "webhook_url", "shared_secret", "is_active", "priority_weight", "daily_cap", "notes"],
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

      if (table === "auto_leads" && typeof values.partner_status === "string") {
        const realized = ["paid", "closed", "won", "delivered", "funded", "purchased"].includes(values.partner_status);

        if (realized && values.actual_revenue === undefined) {
          const { data: lead } = await adminClient
            .from("auto_leads")
            .select("estimated_revenue, actual_revenue")
            .eq("id", id)
            .single();

          values.actual_revenue = Number(lead?.actual_revenue || lead?.estimated_revenue || 0);
        }
      }

      const { error } = await adminClient
        .from(table)
        .update(values)
        .eq("id", id);

      if (error) throw error;

      return json({ ok: true }, 200, origin);
    }

    return json({ error: "Unsupported action" }, 400, origin);
  } catch (err) {
    console.error(err);
    return json({ error: err?.message || "Server error" }, 500, origin);
  }
});
