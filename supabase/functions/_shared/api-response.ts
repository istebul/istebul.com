/**
 * Consistent JSON API envelope for Supabase Edge Functions.
 */

export const API_ERROR_CODES = {
  BAD_REQUEST: "bad_request",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  METHOD_NOT_ALLOWED: "method_not_allowed",
  CONFLICT: "conflict",
  RATE_LIMITED: "rate_limited",
  SERVER_MISCONFIGURED: "server_misconfigured",
  UPSTREAM_ERROR: "upstream_error",
  INTERNAL_ERROR: "internal_error",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export type ApiErrorBody = {
  ok: false;
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: unknown;
  };
};

export type ApiSuccessBody<T = Record<string, unknown>> = {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
};

export function logApiEvent(
  level: "debug" | "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown> = {}
) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function apiErrorBody(
  code: ApiErrorCode | string,
  message: string,
  details?: unknown
): ApiErrorBody {
  const error: ApiErrorBody["error"] = { code, message };
  if (details !== undefined && details !== null) {
    error.details = details;
  }
  return { ok: false, error };
}

export function apiSuccessBody<T extends Record<string, unknown>>(
  data: T,
  meta?: Record<string, unknown>
): ApiSuccessBody<T> {
  const body: ApiSuccessBody<T> = { ok: true, data };
  if (meta !== undefined && meta !== null) {
    body.meta = meta;
  }
  return body;
}

export function jsonApiResponse(
  body: ApiErrorBody | ApiSuccessBody | Record<string, unknown>,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

export function jsonApiError(
  status: number,
  code: ApiErrorCode | string,
  message: string,
  headers: Record<string, string> = {},
  details?: unknown
): Response {
  return jsonApiResponse(apiErrorBody(code, message, details), status, headers);
}

export function jsonApiSuccess<T extends Record<string, unknown>>(
  data: T,
  status = 200,
  headers: Record<string, string> = {},
  meta?: Record<string, unknown>
): Response {
  return jsonApiResponse(apiSuccessBody(data, meta), status, headers);
}
