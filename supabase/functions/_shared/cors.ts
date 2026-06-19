import { resolveCorsOrigin } from "./cors-origins.ts";

export function paymentCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(origin, "https://www.istebul.com", {
      allowLocalDev: true,
    }),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export function paymentJson(
  body: unknown,
  status = 200,
  origin: string | null = null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...paymentCorsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}
