import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Supabase environment variables missing" }, 500);
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return json({ error: "Authorization header missing" }, 401);
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
    return json({ error: "Unauthorized" }, 401);
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

    console.log("AUTH USER:", user.id);
    console.log("PROFILE:", profile);
    console.log("PROFILE ERROR:", profileError);

  if (profileError || !profile) {
    return json({ error: "Profile not found" }, 403);
  }

  if (profile.role !== "admin") {
    return json({ error: "Forbidden: admin only" }, 403);
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { action, table, id, values } = body;

  const allowedTables = [
    "announcements",
    "faqs",
    "posts",
    "listings",
    "profiles",
  ];

  if (!action || !allowedTables.includes(table)) {
    return json({ error: "Invalid action or table" }, 400);
  }

  if (!id) {
    return json({ error: "Missing id" }, 400);
  }

  try {
    if (action === "delete") {
      if (table === "profiles") {
        return json({ error: "Deleting profiles is not allowed here" }, 400);
      }

      const { error } = await adminClient
        .from(table)
        .delete()
        .eq("id", id);

      if (error) throw error;

      return json({ ok: true });
    }

    if (action === "update") {
      if (!values || typeof values !== "object") {
        return json({ error: "Missing update values" }, 400);
      }

      const allowedUpdates: Record<string, string[]> = {
        announcements: ["is_active"],
        faqs: ["is_active"],
        posts: ["is_published"],
        listings: ["is_featured"],
        profiles: ["role", "is_banned"],
      };

      const keys = Object.keys(values);
      const allowedKeys = allowedUpdates[table] || [];

      const invalidKey = keys.find((key) => !allowedKeys.includes(key));
      if (invalidKey) {
        return json({ error: `Invalid update field: ${invalidKey}` }, 400);
      }

      if (
        table === "profiles" &&
        values.role &&
        !["admin", "moderator", "user"].includes(values.role)
     ) {
        return json({ error: "Invalid role value" }, 400);
      }

      if (table === "profiles" && id === user.id && values.role === "user") {
        return json({ error: "You cannot remove your own admin role" }, 400);
      }

      if (table === "profiles" && id === user.id && values.is_banned === true) {
         return json({ error: "You cannot ban your own account" }, 400);
      }

      const { error } = await adminClient
        .from(table)
        .update(values)
        .eq("id", id);

      if (error) throw error;

      return json({ ok: true });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: err?.message || "Server error" }, 500);
  }
});
