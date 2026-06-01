/**
 * Internal Traffic Exclusion — server-side classification & hashing.
 */

export type InternalReason =
  | "admin_user"
  | "known_ip"
  | "known_device"
  | "localhost"
  | "preview_domain"
  | "internal_param"
  | "unknown";

export type TrafficType = "real_user" | "internal" | "bot" | "unknown";

export type TrafficClassification = {
  is_internal: boolean;
  internal_reason: InternalReason | null;
  traffic_type: TrafficType;
  ip_hash: string | null;
  device_hash: string | null;
  user_agent_hash: string | null;
};

const INTERNAL_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /^0\.0\.0\.0$/,
  /\.pages\.dev$/i,
  /^preview\./i,
  /-preview\./i,
];

let exclusionCache: {
  loadedAt: number;
  ipHashes: Set<string>;
  deviceHashes: Set<string>;
  userIds: Set<string>;
} | null = null;

const CACHE_TTL_MS = 60_000;

function getHashSalt(): string {
  const salt = Deno.env.get("ANALYTICS_HASH_SALT");
  if (salt && salt.trim()) return salt.trim();
  if (
    Deno.env.get("CI") === "true" ||
    Deno.env.get("GITHUB_ACTIONS") === "true"
  ) {
    return "isteBul-analytics-dev-salt";
  }
  console.warn(
    "[analytics-traffic] ANALYTICS_HASH_SALT is not set — using ephemeral fallback (set in production)."
  );
  return `isteBul-fallback-${Deno.env.get("SUPABASE_URL") || "local"}`;
}

export async function sha256Hex(input: string): Promise<string> {
  const salt = getHashSalt();
  const data = new TextEncoder().encode(`${salt}:${input}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getClientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

export async function hashIp(ip: string): Promise<string> {
  const normalized = String(ip || "unknown").trim().toLowerCase();
  return sha256Hex(`ip:${normalized}`);
}

export async function hashUserAgent(ua: string): Promise<string> {
  return sha256Hex(`ua:${String(ua || "unknown").slice(0, 500)}`);
}

export async function hashPlainIpForAdmin(ip: string): Promise<string> {
  return hashIp(ip);
}

async function loadExclusionSets(
  adminClient: { from: (table: string) => any }
): Promise<{ ipHashes: Set<string>; deviceHashes: Set<string>; userIds: Set<string> }> {
  const now = Date.now();
  if (exclusionCache && now - exclusionCache.loadedAt < CACHE_TTL_MS) {
    return exclusionCache;
  }

  const { data, error } = await adminClient
    .from("analytics_exclusion_rules")
    .select("type, value_hash")
    .eq("is_active", true)
    .limit(500);

  if (error) {
    console.warn("[analytics-traffic] exclusion rules load failed", error.message);
    return exclusionCache || {
      ipHashes: new Set(),
      deviceHashes: new Set(),
      userIds: new Set(),
    };
  }

  const ipHashes = new Set<string>();
  const deviceHashes = new Set<string>();
  const userIds = new Set<string>();

  for (const row of data || []) {
    const type = String(row.type || "");
    const hash = String(row.value_hash || "");
    if (!hash) continue;
    if (type === "ip_hash") ipHashes.add(hash);
    if (type === "device_hash") deviceHashes.add(hash);
    if (type === "user_id") userIds.add(hash);
  }

  exclusionCache = {
    loadedAt: now,
    ipHashes,
    deviceHashes,
    userIds,
  };

  return exclusionCache;
}

function hostFromUrlish(value: string): string {
  try {
    if (value.startsWith("http")) return new URL(value).hostname;
    return value.split("/")[0]?.split(":")[0] || value;
  } catch {
    return value;
  }
}

function isInternalHost(host: string): boolean {
  const h = String(host || "").toLowerCase();
  if (!h) return false;
  return INTERNAL_HOST_PATTERNS.some((re) => re.test(h));
}

function readClientFlags(event: Record<string, unknown>) {
  const props =
    event.properties && typeof event.properties === "object"
      ? (event.properties as Record<string, unknown>)
      : {};
  const traffic =
    props.traffic_context && typeof props.traffic_context === "object"
      ? (props.traffic_context as Record<string, unknown>)
      : props;
  return {
    client_is_internal: traffic.client_is_internal === true,
    client_internal_reason: traffic.client_internal_reason
      ? String(traffic.client_internal_reason)
      : null,
    device_hash: traffic.device_hash ? String(traffic.device_hash) : null,
    page_host: traffic.page_host ? String(traffic.page_host) : null,
    internal_param: traffic.internal_param === true,
    local_storage_flag: traffic.local_storage_flag === true,
    admin_panel: traffic.admin_panel === true,
  };
}

async function isStaffUser(
  adminClient: { from: (table: string) => any },
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;
  const { data } = await adminClient
    .from("profiles")
    .select("role, is_banned")
    .eq("id", userId)
    .maybeSingle();
  if (!data || data.is_banned === true) return false;
  return data.role === "admin" || data.role === "moderator";
}

export async function classifyAnalyticsTraffic(
  adminClient: { from: (table: string) => any },
  req: Request,
  event: Record<string, unknown>
): Promise<TrafficClassification> {
  const ip = getClientIp(req);
  const ip_hash = ip !== "unknown" ? await hashIp(ip) : null;
  const ua = req.headers.get("user-agent") || "";
  const user_agent_hash = await hashUserAgent(ua);

  const flags = readClientFlags(event);
  const device_hash =
    flags.device_hash && flags.device_hash.length >= 32
      ? flags.device_hash.slice(0, 128)
      : null;

  const pagePath = event.page_path ? String(event.page_path) : "";
  const pageHost =
    flags.page_host ||
    hostFromUrlish(
      (event.attribution && typeof event.attribution === "object"
        ? (event.attribution as Record<string, unknown>).landing_path
        : null) as string || pagePath
    );

  const userId = event.user_id ? String(event.user_id) : null;
  const exclusions = await loadExclusionSets(adminClient);

  let is_internal = false;
  let internal_reason: InternalReason | null = null;

  if (flags.admin_panel || pagePath.includes("admin-panel")) {
    is_internal = true;
    internal_reason = "admin_user";
  } else if (userId && exclusions.userIds.has(userId)) {
    is_internal = true;
    internal_reason = "admin_user";
  } else if (userId && (await isStaffUser(adminClient, userId))) {
    is_internal = true;
    internal_reason = "admin_user";
  } else if (ip_hash && exclusions.ipHashes.has(ip_hash)) {
    is_internal = true;
    internal_reason = "known_ip";
  } else if (device_hash && exclusions.deviceHashes.has(device_hash)) {
    is_internal = true;
    internal_reason = "known_device";
  } else if (flags.client_is_internal) {
    is_internal = true;
    internal_reason =
      (flags.client_internal_reason as InternalReason) || "unknown";
  } else if (flags.internal_param || flags.local_storage_flag) {
    is_internal = true;
    internal_reason = "internal_param";
  } else if (isInternalHost(pageHost) || /localhost|127\.0\.0\.1/i.test(pagePath)) {
    is_internal = true;
    internal_reason = pageHost.includes("pages.dev")
      ? "preview_domain"
      : "localhost";
  }

  const traffic_type: TrafficType = is_internal ? "internal" : "real_user";

  return {
    is_internal,
    internal_reason,
    traffic_type,
    ip_hash,
    device_hash,
    user_agent_hash,
  };
}

export function extractAttributionFields(
  event: Record<string, unknown>,
  sessionMeta: Record<string, unknown> | null
) {
  const attribution =
    event.attribution && typeof event.attribution === "object"
      ? (event.attribution as Record<string, unknown>)
      : {};
  const session = sessionMeta || {};
  return {
    utm_source: String(
      attribution.utm_source || session.utm_source || ""
    ).slice(0, 120) || null,
    utm_medium: String(
      attribution.utm_medium || session.utm_medium || ""
    ).slice(0, 120) || null,
    utm_campaign: String(
      attribution.utm_campaign || session.utm_campaign || ""
    ).slice(0, 120) || null,
    referrer: String(attribution.referrer || session.referrer || "").slice(
      0,
      500
    ) || null,
    landing_page: String(
      attribution.landing_path ||
        attribution.landing_page ||
        session.page_path ||
        event.page_path ||
        ""
    ).slice(0, 200) || null,
  };
}
