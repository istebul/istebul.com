const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = new Set([
  "admin", "warehouse_manager", "supervisor", "inventory_controller",
  "receiver", "quality_controller", "forklift_operator", "picker",
  "packer", "dispatcher", "driver", "operator", "viewer",
]);
const PERMISSIONS = new Set([
  "receiving", "putaway", "picking", "packing", "shipping", "cycle_count", "quality_control",
]);
const STATUSES = new Set(["invited", "active", "suspended", "inactive"]);
const MAX_BODY_BYTES = 32 * 1024;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      Vary: "Authorization",
    },
  });
}

function errorResponse(status, code, message) {
  return json({ ok: false, error: { code, message } }, status);
}

function tokenFrom(request) {
  const value = request.headers.get("Authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function readJson(response) {
  try { return await response.json(); } catch { return null; }
}

async function readBody(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return { ok: false, reason: "body_too_large" };
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return { ok: false, reason: "body_too_large" };
  }
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { ok: false, reason: "body_invalid" };
    }
    return { ok: true, body };
  } catch {
    return { ok: false, reason: "body_invalid" };
  }
}

async function authenticate(request, env, fetchImpl) {
  const token = tokenFrom(request);
  if (!token) return { ok: false, status: 401, code: "unauthorized", message: "WarehouseIQ oturumu gerekli." };
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return { ok: false, status: 503, code: "server_misconfigured", message: "WarehouseIQ kimlik doğrulama yapılandırması eksik." };
  }
  let response;
  try {
    response = await fetchImpl(new URL("/auth/v1/user", env.SUPABASE_URL), {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
  } catch {
    return { ok: false, status: 502, code: "auth_unavailable", message: "Kimlik doğrulama servisine ulaşılamadı." };
  }
  const user = await readJson(response);
  if (!response.ok || !user?.id) {
    return { ok: false, status: 401, code: "unauthorized", message: "Oturum geçersiz veya süresi dolmuş." };
  }
  return { ok: true, token, user };
}

async function rpc(env, token, name, args, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(new URL(`/rest/v1/rpc/${name}`, env.SUPABASE_URL), {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept-Profile": "public",
        "Content-Profile": "public",
      },
      body: JSON.stringify(args),
    });
  } catch {
    return { ok: false, status: 502, payload: null };
  }
  const payload = await readJson(response);
  return { ok: response.ok, status: response.status, payload };
}

function mapRpcError(result, fallback = "WarehouseIQ kullanıcı işlemi tamamlanamadı.") {
  const raw = String(result?.payload?.message || result?.payload?.details || result?.payload?.error || "");
  const code = String(result?.payload?.code || "");
  if (result?.status === 401 || code === "42501" && raw.includes("admin_required")) {
    return { status: 403, code: "admin_required", message: "Bu işlem için aktif WarehouseIQ admin yetkisi gerekir." };
  }
  if (raw.includes("warehouse_admin_required")) return { status: 403, code: "admin_required", message: "Bu işlem için aktif WarehouseIQ admin yetkisi gerekir." };
  if (raw.includes("warehouse_admin_cannot_disable_self")) return { status: 409, code: "cannot_disable_self", message: "Kendi admin hesabınızı pasifleştiremez veya admin rolünden çıkaramazsınız." };
  if (raw.includes("warehouse_last_active_admin")) return { status: 409, code: "last_active_admin", message: "Hesapta en az bir aktif admin kalmalıdır." };
  if (raw.includes("warehouse_assignment_out_of_account")) return { status: 400, code: "warehouse_assignment_invalid", message: "Seçilen depolardan biri bu hesaba ait değil." };
  if (raw.includes("warehouse_user_not_found")) return { status: 404, code: "user_not_found", message: "Kullanıcı bu hesapta bulunamadı." };
  if (raw.includes("warehouse_user_role_invalid")) return { status: 400, code: "role_invalid", message: "Seçilen rol geçersiz. owner rolü atanamaz." };
  if (raw.includes("warehouse_user_status_invalid")) return { status: 400, code: "status_invalid", message: "Kullanıcı durumu geçersiz." };
  if (raw.includes("warehouse_user_permission_invalid") || raw.includes("warehouse_user_permission_duplicate")) return { status: 400, code: "permissions_invalid", message: "Modül izinleri geçersiz veya yineleniyor." };
  if (raw.includes("warehouse_assignment_duplicate")) return { status: 400, code: "warehouse_assignment_duplicate", message: "Aynı depo birden fazla seçilmiş." };
  if (raw.includes("warehouse_user_email_required")) return { status: 400, code: "email_required", message: "E-posta adresi gerekli." };
  if (result?.status >= 500 || !result?.payload) return { status: 502, code: "database_unavailable", message: "WarehouseIQ veri servisine ulaşılamadı." };
  return { status: result?.status === 403 ? 403 : 400, code: "user_operation_failed", message: fallback };
}

function normalizeInput(body, accountId, targetUserId = null) {
  const role = String(body.role || "").trim();
  const status = String(body.status || (targetUserId ? "" : "invited")).trim();
  const permissions = body.permissions === undefined ? [] : body.permissions;
  const warehouseIds = body.warehouseIds === undefined ? [] : body.warehouseIds;
  const email = String(body.email || "").trim().toLowerCase();
  const displayName = body.displayName == null ? null : String(body.displayName).trim();

  if (!UUID_RE.test(accountId || "")) return { ok: false, status: 400, code: "account_id_invalid", message: "Hesap seçimi geçersiz." };
  if (!ROLES.has(role)) return { ok: false, status: 400, code: "role_invalid", message: "Seçilen rol geçersiz. owner rolü atanamaz." };
  if (!STATUSES.has(status)) return { ok: false, status: 400, code: "status_invalid", message: "Kullanıcı durumu geçersiz." };
  if (targetUserId && !UUID_RE.test(targetUserId)) return { ok: false, status: 400, code: "user_id_invalid", message: "Kullanıcı kimliği geçersiz." };
  if (!Array.isArray(permissions) || permissions.some((item) => typeof item !== "string" || !PERMISSIONS.has(item))) {
    return { ok: false, status: 400, code: "permissions_invalid", message: "Modül izinleri geçersiz." };
  }
  if (new Set(permissions).size !== permissions.length) return { ok: false, status: 400, code: "permissions_duplicate", message: "Modül izinleri yineleniyor." };
  if (!Array.isArray(warehouseIds) || warehouseIds.some((item) => typeof item !== "string" || !UUID_RE.test(item))) {
    return { ok: false, status: 400, code: "warehouse_ids_invalid", message: "Depo atamaları geçersiz." };
  }
  if (new Set(warehouseIds).size !== warehouseIds.length) return { ok: false, status: 400, code: "warehouse_ids_duplicate", message: "Depo atamaları yineleniyor." };
  if (displayName && displayName.length > 120) return { ok: false, status: 400, code: "display_name_invalid", message: "Görünen ad en fazla 120 karakter olabilir." };
  if (!targetUserId && (!EMAIL_RE.test(email) || email.length > 254)) return { ok: false, status: 400, code: "email_invalid", message: "Geçerli bir e-posta adresi girin." };
  return {
    ok: true,
    args: {
      requested_account_id: accountId,
      target_user_id: targetUserId,
      target_email: email || null,
      target_display_name: displayName,
      target_role: role,
      target_status: targetUserId ? status : "invited",
      requested_permissions: [...new Set(permissions)],
      requested_warehouse_ids: [...new Set(warehouseIds)],
    },
  };
}

async function validateRequest(env, token, args, fetchImpl) {
  return rpc(env, token, "warehouse_admin_validate_user_request", {
    requested_account_id: args.requested_account_id,
    target_user_id: args.target_user_id,
    target_role: args.target_role,
    target_status: args.target_status,
    requested_permissions: args.requested_permissions,
    requested_warehouse_ids: args.requested_warehouse_ids,
  }, fetchImpl);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const fetchImpl = context.fetch || fetch;
  const auth = await authenticate(request, env, fetchImpl);
  if (!auth.ok) return errorResponse(auth.status, auth.code, auth.message);
  const accountId = new URL(request.url).searchParams.get("accountId") || "";
  if (!UUID_RE.test(accountId)) return errorResponse(400, "account_id_invalid", "Hesap seçimi geçersiz.");
  const result = await rpc(env, auth.token, "warehouse_admin_list_users", {
    requested_account_id: accountId,
  }, fetchImpl);
  if (!result.ok || result.payload?.ok !== true) {
    const mapped = mapRpcError(result, "Kullanıcı listesi alınamadı.");
    return errorResponse(mapped.status, mapped.code, mapped.message);
  }
  return json(result.payload);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const fetchImpl = context.fetch || fetch;
  const auth = await authenticate(request, env, fetchImpl);
  if (!auth.ok) return errorResponse(auth.status, auth.code, auth.message);
  const parsed = await readBody(request);
  if (!parsed.ok) return errorResponse(parsed.reason === "body_too_large" ? 413 : 400, parsed.reason, "İstek gövdesi geçersiz.");
  const accountId = String(parsed.body.accountId || "");
  if (parsed.body.action === "convert_own_legacy_owner") {
    if (!UUID_RE.test(accountId)) return errorResponse(400, "account_id_invalid", "Hesap seçimi geçersiz.");
    const converted = await rpc(env, auth.token, "warehouse_admin_convert_own_legacy_owner", {
      requested_account_id: accountId,
    }, fetchImpl);
    if (!converted.ok || converted.payload?.ok !== true) {
      const raw = String(converted.payload?.message || converted.payload?.error || "");
      if (raw.includes("warehouse_legacy_owner_required")) {
        return errorResponse(403, "legacy_owner_not_found", "Bu oturumda dönüştürülebilecek aktif eski owner rolü bulunamadı. Kullanıcı yönetimi için admin rolü gerekir.");
      }
      const mapped = mapRpcError(converted, "Eski rol admin rolüne dönüştürülemedi.");
      return errorResponse(mapped.status, mapped.code, mapped.message);
    }
    return json({ ok: true, role: "admin", message: "Eski rol admin olarak güncellendi." });
  }
  const normalized = normalizeInput({ ...parsed.body, status: "invited" }, accountId, null);
  if (!normalized.ok) return errorResponse(normalized.status, normalized.code, normalized.message);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return errorResponse(503, "invite_unconfigured", "Kullanıcı daveti için sunucu Auth yapılandırması eksik.");

  // First verify admin authority and avoid duplicate membership invitations.
  const listed = await rpc(env, auth.token, "warehouse_admin_list_users", {
    requested_account_id: accountId,
  }, fetchImpl);
  if (!listed.ok || listed.payload?.ok !== true) {
    const mapped = mapRpcError(listed, "Admin yetkisi doğrulanamadı.");
    return errorResponse(mapped.status, mapped.code, mapped.message);
  }
  const users = Array.isArray(listed.payload.users) ? listed.payload.users : [];
  if (users.some((user) => String(user.auth_email || "").toLowerCase() === normalized.args.target_email)) {
    return errorResponse(409, "membership_exists", "Bu e-posta zaten hesapta kayıtlı. Kullanıcıyı listeden düzenleyin.");
  }

  const validation = await validateRequest(env, auth.token, normalized.args, fetchImpl);
  if (!validation.ok) {
    const mapped = mapRpcError(validation, "Davet bilgileri doğrulanamadı.");
    return errorResponse(mapped.status, mapped.code, mapped.message);
  }

  let inviteResponse;
  try {
    inviteResponse = await fetchImpl(new URL("/auth/v1/invite", env.SUPABASE_URL), {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalized.args.target_email,
        data: { display_name: normalized.args.target_display_name || normalized.args.target_email },
      }),
    });
  } catch {
    return errorResponse(502, "invite_unavailable", "Supabase Auth davet servisine ulaşılamadı.");
  }
  const inviteUser = await readJson(inviteResponse);
  const invitedUserId = inviteUser?.id || inviteUser?.user?.id;
  if (!inviteResponse.ok || !UUID_RE.test(String(invitedUserId || ""))) {
    const inviteMessage = String(inviteUser?.msg || inviteUser?.message || inviteUser?.error_description || "").toLowerCase();
    if (inviteResponse.status === 422 || inviteMessage.includes("already") || inviteMessage.includes("registered")) {
      return errorResponse(409, "auth_user_exists", "Bu e-posta Supabase Auth üzerinde zaten kayıtlı. Mevcut kimliğin hesaba güvenli biçimde bağlanması ayrıca yapılmalı.");
    }
    return errorResponse(502, "invite_failed", "Kullanıcı daveti gönderilemedi. Supabase Auth yapılandırmasını kontrol edin.");
  }

  const upsertArgs = {
    ...normalized.args,
    target_user_id: invitedUserId,
    target_status: "invited",
  };
  const created = await rpc(env, auth.token, "warehouse_admin_upsert_user", upsertArgs, fetchImpl);
  if (!created.ok || created.payload?.ok !== true) {
    // Compensate only the Auth identity created by this successful invite request.
    try {
      await fetchImpl(new URL(`/auth/v1/admin/users/${encodeURIComponent(invitedUserId)}`, env.SUPABASE_URL), {
        method: "DELETE",
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
    } catch { /* Do not leak credentials or internal errors to the client. */ }
    const mapped = mapRpcError(created, "Davet veritabanına kaydedilemedi; işlem geri alınmaya çalışıldı.");
    return errorResponse(mapped.status, mapped.code, mapped.message);
  }
  return json({ ok: true, user: created.payload.user }, 201);
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const fetchImpl = context.fetch || fetch;
  const auth = await authenticate(request, env, fetchImpl);
  if (!auth.ok) return errorResponse(auth.status, auth.code, auth.message);
  const parsed = await readBody(request);
  if (!parsed.ok) return errorResponse(parsed.reason === "body_too_large" ? 413 : 400, parsed.reason, "İstek gövdesi geçersiz.");
  const accountId = String(parsed.body.accountId || "");
  const userId = String(parsed.body.userId || "");
  const normalized = normalizeInput(parsed.body, accountId, userId);
  if (!normalized.ok) return errorResponse(normalized.status, normalized.code, normalized.message);

  const validation = await validateRequest(env, auth.token, normalized.args, fetchImpl);
  if (!validation.ok) {
    const mapped = mapRpcError(validation, "Kullanıcı değişiklikleri doğrulanamadı.");
    return errorResponse(mapped.status, mapped.code, mapped.message);
  }
  const updated = await rpc(env, auth.token, "warehouse_admin_upsert_user", normalized.args, fetchImpl);
  if (!updated.ok || updated.payload?.ok !== true) {
    const mapped = mapRpcError(updated);
    return errorResponse(mapped.status, mapped.code, mapped.message);
  }
  return json({ ok: true, user: updated.payload.user });
}
