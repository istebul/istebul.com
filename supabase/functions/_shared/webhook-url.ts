/**
 * SSRF-safe partner webhook URL validation (HTTPS public hosts only).
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
]);

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

export function assertSafePartnerWebhookUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(String(raw || "").trim());
  } catch {
    throw new Error("Invalid webhook URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("Partner webhook must use HTTPS");
  }

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Partner webhook host is not allowed");
  }

  if (isPrivateIpv4(host)) {
    throw new Error("Partner webhook must not target private networks");
  }

  if (url.username || url.password) {
    throw new Error("Webhook URL must not include credentials");
  }

  return url.href;
}
