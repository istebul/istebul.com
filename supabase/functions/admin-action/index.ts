import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  hashPlainIpForAdmin,
} from "../_shared/analytics-traffic.ts";
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

const ALLOWED_PARTNER_ROUTE_TYPES = new Set([
  "dealer_partner",
  "finance_partner",
  "insurance_partner",
  "premium_report",
  "general_sales",
  "housing",
  "finance",
  "vacation",
  "insurance",
  "kasko",
]);

function assertAllowedPartnerRouteType(routeType: unknown) {
  const key = String(routeType || "").trim();
  if (!ALLOWED_PARTNER_ROUTE_TYPES.has(key)) {
    throw new Error(`invalid_route_type:${key}`);
  }
  return key;
}

const PARTNER_APP_ACTIONS = new Set([
  "listPartnerApplications",
  "createPartnerApplication",
  "updatePartnerApplication",
  "archivePartnerApplication",
  "togglePartnerApplicationActive",
]);

const PARTNER_APP_ID_ACTIONS = new Set([
  "updatePartnerApplication",
  "archivePartnerApplication",
  "togglePartnerApplicationActive",
]);

const ANALYTICS_ADMIN_ACTIONS = new Set([
  "list_analytics_exclusions",
  "add_analytics_ip_exclusion",
  "register_analytics_device_exclusion",
  "delete_analytics_exclusion",
]);

const PARTNER_APP_STATUSES = new Set([
  "lead",
  "qualified",
  "demo",
  "pilot",
  "negotiation",
  "won",
  "lost",
  "inactive",
  "new",
  "contacted",
  "integrating",
  "live",
  "rejected",
]);

const PARTNER_APP_CATEGORIES = new Set([
  "auto",
  "housing",
  "finance",
  "travel",
  "insurance",
  "general",
  "dealer_partner",
  "finance_partner",
  "insurance_partner",
  "premium_report",
  "general_sales",
]);

/** Only columns present on partner_applications (CRM V1 + core). */
const PARTNER_APP_ALLOWED_FIELDS = [
  "id",
  "company_name",
  "contact_name",
  "email",
  "phone",
  "website",
  "city",
  "category",
  "lead_capacity",
  "webhook_ready",
  "status",
  "notes",
  "source_channel",
  "next_action",
  "contacted_at",
  "follow_up_at",
  "is_active",
  "is_archived",
  "archived_at",
] as const;

const PARTNER_APP_DATE_FIELDS = new Set([
  "contacted_at",
  "follow_up_at",
  "archived_at",
]);

function sanitizePartnerField(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizePartnerAppStatus(status: unknown, fallback = "lead") {
  const normalized = sanitizePartnerField(status, 40).toLowerCase();
  return PARTNER_APP_STATUSES.has(normalized) ? normalized : fallback;
}

function normalizePartnerAppCategory(category: unknown) {
  const normalized = sanitizePartnerField(category, 40).toLowerCase();
  return PARTNER_APP_CATEGORIES.has(normalized) ? normalized : null;
}

function normalizePartnerAppEmail(email: unknown) {
  return sanitizePartnerField(email, 320).toLowerCase();
}

function normalizePartnerAppPhone(phone: unknown) {
  return String(phone ?? "").replace(/\D/g, "").slice(0, 20);
}

function normalizePartnerAppTimestamp(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stripPartnerAppPayload(raw: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const key of PARTNER_APP_ALLOWED_FIELDS) {
    if (raw[key] !== undefined) payload[key] = raw[key];
  }
  for (const key of PARTNER_APP_DATE_FIELDS) {
    if (payload[key] === "" || payload[key] === undefined) {
      payload[key] = null;
    }
  }
  if (payload.website === "") {
    payload.website = null;
  }
  return payload;
}

function extractActionError(err: unknown) {
  const e =
    err && typeof err === "object" ? (err as Record<string, unknown>) : {};
  const message =
    typeof e.message === "string"
      ? e.message
      : err instanceof Error
        ? err.message
        : String(err);
  return {
    code: typeof e.code === "string" ? e.code : null,
    message: message || "Unknown error",
    details: typeof e.details === "string" ? e.details : null,
    hint: typeof e.hint === "string" ? e.hint : null,
    stack: typeof e.stack === "string" ? e.stack : null,
  };
}

function logActionError(action: string, payload: unknown, err: unknown) {
  const info = extractActionError(err);
  console.error(
    JSON.stringify(
      {
        action,
        payload,
        code: info.code,
        message: info.message,
        details: info.details,
        hint: info.hint,
        stack: info.stack,
      },
      null,
      2
    )
  );
}

function partnerActionFailure(
  action: string,
  err: unknown,
  origin: string | null
) {
  const { code, message, details, hint } = extractActionError(err);
  return json(
    {
      ok: false,
      action,
      code,
      message,
      details,
      hint,
      error: message,
    },
    500,
    origin
  );
}

function buildPartnerApplicationRow(raw: Record<string, unknown>, mode: "create" | "update") {
  const payload = stripPartnerAppPayload(raw);
  if (mode === "create") {
    delete payload.id;
  }

  if (payload.company_name !== undefined) {
    payload.company_name = sanitizePartnerField(payload.company_name, 200);
  }
  if (payload.contact_name !== undefined) {
    payload.contact_name = sanitizePartnerField(payload.contact_name, 200);
  }
  if (payload.phone !== undefined) {
    payload.phone = normalizePartnerAppPhone(payload.phone);
  }
  if (payload.email !== undefined) {
    payload.email = normalizePartnerAppEmail(payload.email);
  }
  if (payload.website !== undefined) {
    payload.website = sanitizePartnerField(payload.website, 500) || null;
  }
  if (payload.city !== undefined) {
    payload.city = sanitizePartnerField(payload.city, 120) || null;
  }
  if (payload.category !== undefined) {
    const category = normalizePartnerAppCategory(payload.category);
    if (!category) {
      return { error: "Invalid category" };
    }
    payload.category = category;
  }
  if (payload.source_channel !== undefined) {
    payload.source_channel = sanitizePartnerField(payload.source_channel, 80) || "manual";
  }
  if (payload.status !== undefined) {
    payload.status = normalizePartnerAppStatus(payload.status);
  }
  if (payload.notes !== undefined) {
    payload.notes = sanitizePartnerField(payload.notes, 5000);
  }
  if (payload.next_action !== undefined) {
    payload.next_action = sanitizePartnerField(payload.next_action, 500) || null;
  }
  if (payload.lead_capacity !== undefined) {
    payload.lead_capacity = sanitizePartnerField(payload.lead_capacity, 120) || null;
  }
  if (payload.contacted_at !== undefined) {
    payload.contacted_at = normalizePartnerAppTimestamp(payload.contacted_at);
  }
  if (payload.follow_up_at !== undefined) {
    payload.follow_up_at = normalizePartnerAppTimestamp(payload.follow_up_at);
  }
  if (payload.is_active !== undefined) {
    payload.is_active = payload.is_active === true || payload.is_active === "true";
  }
  if (payload.webhook_ready !== undefined) {
    payload.webhook_ready = payload.webhook_ready === true || payload.webhook_ready === "true";
  }
  if (payload.is_archived !== undefined) {
    payload.is_archived = payload.is_archived === true || payload.is_archived === "true";
  }
  if (payload.archived_at !== undefined) {
    payload.archived_at = normalizePartnerAppTimestamp(payload.archived_at);
  }

  if (mode === "create") {
    const company = String(payload.company_name || "");
    const contact = String(payload.contact_name || "");
    const phone = String(payload.phone || "");
    const email = String(payload.email || "");
    const category = payload.category ? String(payload.category) : "";

    if (company.length < 2 || contact.length < 2 || phone.length < 10 || !email.includes("@") || !category) {
      return { error: "company_name, contact_name, phone, email and category are required" };
    }
  }

  return { payload };
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

  const role = String(profile.role ?? "").toLowerCase();
  const isAdminActor =
    (role === "admin" || role === "super_admin") && profile.is_banned !== true;

  if (!isAdminActor) {
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
    "vacation_leads",
    "vacation_scenarios",
    "vacation_destinations",
    "vacation_partners",
    "vacation_scoring_configs",
    "housing_leads",
    "housing_locations",
    "housing_partners",
    "housing_settings",
    "finance_leads",
    "finance_partners",
    "sigorta_leads",
    "sigorta_events",
    "kasko_leads",
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
    "vacation_events",
    "vacation_leads",
    "vacation_scenarios",
    "vacation_destinations",
    "vacation_partners",
    "vacation_scoring_configs",
    "vertical_events",
    "vertical_leads",
    "housing_events",
    "housing_leads",
    "housing_locations",
    "housing_partners",
    "housing_settings",
    "finance_events",
    "finance_leads",
    "finance_partners",
    "finance_settings",
    "sigorta_events",
    "sigorta_leads",
    "kasko_leads",
    "analytics_exclusion_rules",
    "lifecycle_contacts",
    "lifecycle_enrollments",
    "lifecycle_messages",
  ];

  if (action === "upsert_settings") {
    if (table !== "site_settings") {
      return json({ error: "Invalid settings table" }, 400, origin);
    }
  } else if (action === "upload_post_cover") {
    /* multipart cover upload — no table/id */
  } else if (action === "list") {
    if (!table || !listTables.includes(table)) {
      return json({ error: "Invalid action or table" }, 400, origin);
    }
  } else if (PARTNER_APP_ACTIONS.has(action)) {
    /* partner CRM actions — validated in handler */
  } else if (ANALYTICS_ADMIN_ACTIONS.has(action)) {
    /* internal traffic exclusion — no table field on request */
  } else if (!allowedTables.includes(table)) {
    return json({ error: "Invalid action or table" }, 400, origin);
  }

  if (
    action !== "upsert_settings" &&
    action !== "upload_post_cover" &&
    action !== "list" &&
    action !== "listPartnerApplications" &&
    action !== "createPartnerApplication" &&
    !ANALYTICS_ADMIN_ACTIONS.has(action) &&
    !id
  ) {
    return json({ error: "Missing id" }, 400, origin);
  }

  if (PARTNER_APP_ID_ACTIONS.has(action) && !id) {
    return json({ error: "Missing id" }, 400, origin);
  }

  const COVER_BUCKET = "content-covers";
  const MAX_COVER_BYTES = 5 * 1024 * 1024;
  const COVER_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ]);

  async function ensureContentCoversBucket() {
    const { data: buckets, error: listError } = await adminClient.storage.listBuckets();
    if (listError) throw listError;
    const exists = (buckets || []).some(
      (bucket) => bucket.id === COVER_BUCKET || bucket.name === COVER_BUCKET
    );
    if (exists) return;

    const { error: createError } = await adminClient.storage.createBucket(COVER_BUCKET, {
      public: true,
      fileSizeLimit: MAX_COVER_BYTES,
      allowedMimeTypes: [...COVER_MIME_TYPES],
    });
    if (createError && !/already exists|duplicate/i.test(createError.message)) {
      throw createError;
    }
  }

  try {
    if (action === "upload_post_cover") {
      const payload = values && typeof values === "object" ? values : body;
      const folderRaw = String(payload?.folder || "news").trim().toLowerCase();
      const folder = /^[a-z0-9_-]{1,32}$/.test(folderRaw) ? folderRaw : "news";
      const contentType = String(payload?.contentType || payload?.mime || "image/jpeg").trim();
      const fileName = String(payload?.fileName || "cover.jpg")
        .replace(/[^a-zA-Z0-9._-]/g, "")
        .slice(0, 120);
      const base64Raw = String(payload?.base64 || "").trim();

      if (!base64Raw) {
        return json({ error: "Missing image data" }, 400, origin);
      }
      if (!COVER_MIME_TYPES.has(contentType)) {
        return json({ error: "Invalid image type" }, 400, origin);
      }

      const base64 = base64Raw.replace(/^data:[^;]+;base64,/, "");
      let bytes: Uint8Array;
      try {
        const binary = atob(base64);
        bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
      } catch {
        return json({ error: "Invalid image encoding" }, 400, origin);
      }

      if (bytes.length > MAX_COVER_BYTES) {
        return json({ error: "Kapak görseli en fazla 5 MB olabilir" }, 400, origin);
      }
      if (!bytes.length) {
        return json({ error: "Empty image file" }, 400, origin);
      }

      await ensureContentCoversBucket();

      const ext = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
      const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const { error: uploadError } = await adminClient.storage.from(COVER_BUCKET).upload(path, bytes, {
        contentType,
        upsert: false,
        cacheControl: "3600",
      });
      if (uploadError) throw uploadError;

      const { data: urlData } = adminClient.storage.from(COVER_BUCKET).getPublicUrl(path);
      const publicUrl = String(urlData?.publicUrl || "").trim();
      if (!publicUrl) {
        return json({ error: "Public URL could not be resolved" }, 500, origin);
      }

      await writeAdminAudit(adminClient, user, {
        action: "upload_post_cover",
        entity_table: "storage.objects",
        summary: `Uploaded post cover to ${COVER_BUCKET}/${path}`,
        metadata: { folder, contentType, bytes: bytes.length },
      });

      return json({ ok: true, publicUrl, path }, 200, origin);
    }

    if (action === "list_analytics_exclusions") {
      const { data, error } = await adminClient
        .from("analytics_exclusion_rules")
        .select("id, type, value_hash, label, is_active, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return json({ ok: true, data: data ?? [] }, 200, origin);
    }

    if (action === "add_analytics_ip_exclusion") {
      const ip = String(values?.ip || "").trim();
      const label = sanitizeText(values?.label || "Admin IP");
      if (!ip) return json({ error: "IP required" }, 400, origin);
      const value_hash = await hashPlainIpForAdmin(ip);
      const { error } = await adminClient.from("analytics_exclusion_rules").insert({
        type: "ip_hash",
        value_hash,
        label,
        is_active: true,
        created_by: user.id,
      });
      if (error && error.code !== "23505") throw error;
      return json({ ok: true, value_hash }, 200, origin);
    }

    if (action === "register_analytics_device_exclusion") {
      const value_hash = String(values?.device_hash || "").trim();
      const label = sanitizeText(values?.label || "Test cihazı");
      if (!value_hash || value_hash.length < 32) {
        return json({ error: "Invalid device_hash" }, 400, origin);
      }
      const { error } = await adminClient.from("analytics_exclusion_rules").insert({
        type: "device_hash",
        value_hash: value_hash.slice(0, 128),
        label,
        is_active: true,
        created_by: user.id,
      });
      if (error) throw error;
      return json({ ok: true }, 200, origin);
    }

    if (action === "delete_analytics_exclusion") {
      if (!id) return json({ error: "Missing id" }, 400, origin);
      const { error } = await adminClient
        .from("analytics_exclusion_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return json({ ok: true }, 200, origin);
    }

    if (action === "listPartnerApplications") {
      const includeArchived = body.includeArchived === true;
      const limit = Math.min(Math.max(Number(body.limit) || 500, 1), 1000);

      let query = adminClient
        .from("partner_applications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!includeArchived) {
        query = query.eq("is_archived", false);
      }

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

    if (action === "createPartnerApplication") {
      try {
        if (!values || typeof values !== "object") {
          return json({ error: "Missing create values" }, 400, origin);
        }

        console.log(
          "createPartnerApplication payload",
          JSON.stringify(values, null, 2)
        );

        const built = buildPartnerApplicationRow(
          values as Record<string, unknown>,
          "create"
        );
        if (built.error) {
          return json({ error: built.error }, 400, origin);
        }

        const insertPayload = {
          ...built.payload,
          status: normalizePartnerAppStatus(built.payload?.status, "lead"),
          source_channel: built.payload?.source_channel || "manual",
          is_active: built.payload?.is_active !== false,
          is_archived: false,
          webhook_ready: built.payload?.webhook_ready === true,
        };

        console.log(
          "createPartnerApplication insert",
          JSON.stringify(insertPayload, null, 2)
        );

        const { data, error } = await adminClient
          .from("partner_applications")
          .insert(insertPayload)
          .select("*")
          .single();

        if (error) throw error;

        await writeAdminAudit(adminClient, user, {
          action: "createPartnerApplication",
          entity_table: "partner_applications",
          entity_id: data?.id,
          summary: `Created partner application ${insertPayload.company_name}`,
        });

        return json({ ok: true, data }, 200, origin);
      } catch (err) {
        logActionError(action, { values }, err);
        return partnerActionFailure(action, err, origin);
      }
    }

    if (action === "updatePartnerApplication") {
      try {
        if (!values || typeof values !== "object") {
          return json({ error: "Missing update values" }, 400, origin);
        }

        console.log(
          "updatePartnerApplication payload",
          JSON.stringify({ id, values }, null, 2)
        );

        const built = buildPartnerApplicationRow(
          values as Record<string, unknown>,
          "update"
        );
        if (built.error) {
          return json({ error: built.error }, 400, origin);
        }

        if (!Object.keys(built.payload || {}).length) {
          return json({ error: "No valid fields to update" }, 400, origin);
        }

        const updatePayload = built.payload;

        console.log(
          "updatePartnerApplication update",
          JSON.stringify(updatePayload, null, 2)
        );

        const { data, error } = await adminClient
          .from("partner_applications")
          .update(updatePayload)
          .eq("id", id)
          .select("*")
          .single();

        if (error) throw error;

        await writeAdminAudit(adminClient, user, {
          action: "updatePartnerApplication",
          entity_table: "partner_applications",
          entity_id: id,
          summary: `Updated partner application`,
          metadata: { fields: Object.keys(updatePayload || {}) },
        });

        return json({ ok: true, data }, 200, origin);
      } catch (err) {
        logActionError(action, { id, values }, err);
        return partnerActionFailure(action, err, origin);
      }
    }

    if (action === "archivePartnerApplication") {
      const { data, error } = await adminClient
        .from("partner_applications")
        .update({
          is_archived: true,
          is_active: false,
          archived_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      await writeAdminAudit(adminClient, user, {
        action: "archivePartnerApplication",
        entity_table: "partner_applications",
        entity_id: id,
        summary: "Archived partner application",
      });

      return json({ ok: true, data }, 200, origin);
    }

    if (action === "togglePartnerApplicationActive") {
      const { data: current, error: readError } = await adminClient
        .from("partner_applications")
        .select("id, is_active, is_archived")
        .eq("id", id)
        .maybeSingle();

      if (readError) throw readError;
      if (!current) {
        return json({ error: "Partner application not found" }, 404, origin);
      }
      if (current.is_archived) {
        return json({ error: "Archived applications cannot be toggled active" }, 400, origin);
      }

      const nextActive = !current.is_active;
      const patch: Record<string, unknown> = { is_active: nextActive };
      if (!nextActive) {
        patch.status = "inactive";
      }

      const { data, error } = await adminClient
        .from("partner_applications")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      await writeAdminAudit(adminClient, user, {
        action: "togglePartnerApplicationActive",
        entity_table: "partner_applications",
        entity_id: id,
        summary: nextActive ? "Activated partner application" : "Deactivated partner application",
      });

      return json({ ok: true, data }, 200, origin);
    }

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
        vacation_events: "*",
        vacation_leads: "*",
        vacation_scenarios: "*",
        vacation_destinations: "*",
        vacation_partners: "*",
        vacation_scoring_configs: "*",
        vertical_events: "*",
        vertical_leads: "*",
        housing_events: "*",
        housing_leads: "*",
        housing_locations: "*",
        housing_partners: "*",
        housing_settings: "*",
        finance_events: "*",
        finance_leads: "*",
        finance_partners: "*",
        finance_settings: "*",
        sigorta_events: "*",
        sigorta_leads: "*",
        kasko_leads: "*",
        lifecycle_contacts: "*",
        lifecycle_enrollments: "*",
        lifecycle_messages: "*",
      };

      const allowedOrderColumns: Record<string, string[]> = {
        auto_leads: ["created_at", "lead_score", "follow_up_at"],
        vacation_events: ["created_at", "event_type"],
        vacation_leads: ["created_at", "decision_score", "follow_up_at", "status"],
        vacation_scenarios: ["sort_order", "created_at", "title"],
        vacation_destinations: ["created_at", "season_score", "risk_score"],
        vacation_partners: ["created_at", "name"],
        vacation_scoring_configs: ["created_at"],
        vertical_events: ["created_at", "event_type"],
        vertical_leads: ["created_at", "decision_score", "status"],
        housing_events: ["created_at", "event_type"],
        housing_leads: ["created_at", "decision_score", "status"],
        housing_locations: ["created_at", "city", "district"],
        housing_partners: ["created_at", "partner_name"],
        housing_settings: ["key", "updated_at"],
        finance_events: ["created_at", "event_type"],
        finance_leads: ["created_at", "decision_score", "status"],
        finance_partners: ["created_at", "institution_name"],
        sigorta_events: ["created_at", "event_type"],
        sigorta_leads: ["created_at", "decision_score", "status", "interest_type"],
        kasko_leads: ["created_at", "decision_score", "status"],
        finance_settings: ["key", "updated_at"],
        auto_events: ["created_at"],
        analytics_events: ["created_at"],
        announcements: ["created_at"],
        faqs: ["order_num", "created_at"],
        posts: ["created_at"],
        listings: ["created_at"],
        profiles: ["created_at"],
        partner_endpoints: ["created_at", "priority_weight"],
        partner_applications: ["created_at"],
        partner_lead_dispatch_logs: ["created_at"],
        operational_events: ["created_at", "severity"],
        admin_audit_logs: ["created_at"],
        site_settings: ["key"],
        subscriptions: ["created_at"],
        lifecycle_contacts: ["created_at", "last_active_at"],
        lifecycle_enrollments: ["enrolled_at", "flow_id", "status"],
        lifecycle_messages: ["created_at", "scheduled_at", "status"],
      };

      const defaultOrderColumn: Record<string, string> = {
        lifecycle_enrollments: "enrolled_at",
        lifecycle_contacts: "last_active_at",
      };
      const orderColumn =
        body.order?.column || defaultOrderColumn[table] || "created_at";
      const orderAscending = body.order?.ascending === true;
      const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 1000);
      const selectExpr = String(body.select || selectColumns[table] || "*").slice(0, 500);

      if (!allowedOrderColumns[table]?.includes(orderColumn)) {
        return json(
          {
            error: "Invalid order column",
            allowed: allowedOrderColumns[table] || ["created_at"],
          },
          400,
          origin
        );
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

      let rows = data ?? [];
      if (table === "partner_endpoints" && Array.isArray(rows)) {
        rows = rows.map((row: Record<string, unknown>) => {
          const secret = row.shared_secret;
          const { shared_secret: _omit, ...rest } = row;
          return {
            ...rest,
            has_auth_secret: Boolean(secret && String(secret).length > 0),
          };
        });
      }

      return json({ ok: true, data: rows }, 200, origin);
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
        posts: ["title", "slug", "content", "excerpt", "category", "content_type", "cover_image_url", "source_label", "source_url", "is_published", "is_featured"],
        partner_endpoints: ["name", "route_type", "webhook_url", "shared_secret", "is_active", "priority_weight", "daily_cap", "notes", "failover_route", "min_lead_priority"],
        partner_applications: ["status", "notes", "webhook_url_draft", "partner_endpoint_id", "billing_plan", "company_name", "contact_name", "phone", "email", "website", "city", "category", "source_channel", "is_active", "next_action", "contacted_at", "follow_up_at", "lead_capacity", "webhook_ready"],
        vacation_scenarios: [
          "title",
          "slug",
          "description",
          "image_url",
          "is_active",
          "sort_order",
          "config",
        ],
        vacation_destinations: [
          "city",
          "country",
          "vacation_type",
          "season_score",
          "risk_score",
          "avg_cost",
          "family_fit_score",
          "child_friendly",
          "is_active",
        ],
        vacation_partners: ["name", "partner_type", "affiliate_link", "notes", "is_active"],
        vacation_scoring_configs: ["risk_factor", "cost_factor", "family_weight", "prompt_template"],
        housing_locations: ["city", "district", "avg_price_level", "transport_score", "life_quality_score", "investment_score", "risk_score", "is_active", "notes"],
        housing_partners: ["partner_name", "partner_type", "city", "district", "contact_link", "commission_note", "is_active", "notes"],
        finance_partners: ["institution_name", "product_type", "min_amount", "max_amount", "min_term", "max_term", "rate_range", "affiliate_link", "is_active", "notes"],
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

      if (table === "partner_endpoints") {
        if (typeof values.route_type === "string") {
          try {
            values.route_type = assertAllowedPartnerRouteType(values.route_type);
          } catch (routeError) {
            return json({
              error: routeError instanceof Error ? routeError.message : "Invalid route type",
            }, 400, origin);
          }
        }
        if (typeof values.webhook_url === "string") {
          try {
            values.webhook_url = assertSafePartnerWebhookUrl(values.webhook_url);
          } catch (urlError) {
            return json({
              error: urlError instanceof Error ? urlError.message : "Invalid webhook URL",
            }, 400, origin);
          }
        }
      }

      const { error } = await adminClient
        .from(table)
        .insert(values);

      if (error) throw error;

      const auditKeys = Object.keys(values).filter((k) => k !== "shared_secret");

      await writeAdminAudit(adminClient, user, {
        action: "insert",
        entity_table: table,
        summary: `Inserted ${table} record`,
        metadata: {
          keys: auditKeys,
          has_auth_secret: Boolean(values.shared_secret),
        },
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
        "auto_whatsapp_phone","maintenance","public_campaigns",
        "home_category_auto_enabled","home_category_konut_enabled",
        "home_category_tatil_enabled","home_category_finans_enabled",
        "home_category_sigorta_enabled","home_category_kasko_enabled",
        "vacation_enabled","vacation_ai_enabled","vacation_partner_cta_enabled",
        "vacation_default_budget_note","vacation_disclaimer_text",
        "housing_payment_weight","housing_location_weight","housing_risk_factor",
        "housing_investment_weight","housing_total_cost_weight","housing_ai_prompt_template",
        "finance_payment_comfort_weight","finance_total_cost_weight","finance_risk_factor",
        "finance_cashflow_weight",        "finance_ai_prompt_template",
        "analytics_clean_start_at",
        "live_providers_enabled",
        "live_finance_feed_url",
        "ai_listings_public_enabled"
      ];

      for (const row of values) {
        if (!row || typeof row !== "object") {
          return json({ error: "Invalid settings row" }, 400, origin);
        }

        if (!allowedSettingKeys.includes(String(row.key || ""))) {
          return json({ error: `Invalid settings key: ${row.key}` }, 400, origin);
        }
      }

      const settingsByKey = Object.fromEntries(
        values.map((row: Record<string, unknown>) => [String(row.key || "").trim(), String(row.value ?? "")])
      );
      const liveEnabled = String(settingsByKey.live_providers_enabled || "").toLowerCase() === "true";
      const liveFeedUrl = String(settingsByKey.live_finance_feed_url || "").trim();
      if (liveEnabled && !liveFeedUrl) {
        return json(
          {
            error:
              "Canlı sağlayıcı modu açılamaz: live_finance_feed_url boş. Önce geçerli bir feed URL kaydedin.",
          },
          400,
          origin
        );
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
        posts: ["is_published", "is_featured", "category", "content_type", "excerpt", "cover_image_url", "source_label", "source_url", "title", "slug", "content"],
        listings: ["is_featured"],
        profiles: ["role", "is_banned"],
        auto_leads: ["status", "notes", "follow_up_at", "follow_up_done", "partner_status", "estimated_revenue", "actual_revenue", "commission_notes", "dispatch_retry_count", "last_dispatch_at", "next_retry_at", "last_dispatch_error"],
        vacation_leads: ["status", "notes", "follow_up_at", "follow_up_done"],
        vacation_scenarios: [
          "title",
          "slug",
          "description",
          "image_url",
          "is_active",
          "sort_order",
          "config",
        ],
        vacation_destinations: [
          "city",
          "country",
          "vacation_type",
          "season_score",
          "risk_score",
          "avg_cost",
          "family_fit_score",
          "child_friendly",
          "is_active",
        ],
        vacation_partners: ["name", "partner_type", "affiliate_link", "notes", "is_active"],
        vacation_scoring_configs: ["risk_factor", "cost_factor", "family_weight", "prompt_template"],
        housing_leads: ["status", "notes", "follow_up_at"],
        housing_locations: ["city", "district", "avg_price_level", "transport_score", "life_quality_score", "investment_score", "risk_score", "is_active", "notes"],
        housing_partners: ["partner_name", "partner_type", "city", "district", "contact_link", "commission_note", "is_active", "notes"],
        housing_settings: ["value"],
        finance_leads: ["status", "notes"],
        sigorta_leads: ["status", "notes"],
        kasko_leads: ["status", "notes"],
        finance_partners: ["institution_name", "product_type", "min_amount", "max_amount", "min_term", "max_term", "rate_range", "affiliate_link", "is_active", "notes"],
        finance_settings: ["value"],
        partner_endpoints: ["name", "route_type", "webhook_url", "shared_secret", "is_active", "priority_weight", "daily_cap", "notes", "failover_route", "min_lead_priority", "health_status"],
        partner_applications: ["status", "notes", "webhook_url_draft", "partner_endpoint_id", "billing_plan", "company_name", "contact_name", "phone", "email", "website", "city", "category", "source_channel", "is_active", "next_action", "contacted_at", "follow_up_at", "lead_capacity", "webhook_ready"],
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

      if (table === "partner_endpoints") {
        if (typeof values.route_type === "string") {
          try {
            values.route_type = assertAllowedPartnerRouteType(values.route_type);
          } catch (routeError) {
            return json({
              error: routeError instanceof Error ? routeError.message : "Invalid route type",
            }, 400, origin);
          }
        }
        if (typeof values.webhook_url === "string") {
          try {
            values.webhook_url = assertSafePartnerWebhookUrl(values.webhook_url);
          } catch (urlError) {
            return json({
              error: urlError instanceof Error ? urlError.message : "Invalid webhook URL",
            }, 400, origin);
          }
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

      const auditFields = Object.keys(values).filter((k) => k !== "shared_secret");

      await writeAdminAudit(adminClient, user, {
        action: "update",
        entity_table: table,
        entity_id: id,
        summary: `Updated ${table}`,
        metadata: {
          fields: auditFields,
          auth_secret_rotated: Object.prototype.hasOwnProperty.call(values, "shared_secret"),
        },
      });

      return json({ ok: true }, 200, origin);
    }

    return json({ error: "Unsupported action" }, 400, origin);
  } catch (err) {
    logActionError(action, body, err);
    return partnerActionFailure(action, err, origin);
  }
});
