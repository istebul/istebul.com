/**
 * Lightweight health check for uptime monitors (bypasses HTML bot challenge).
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store'
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      ok: true,
      service: 'istebul.com',
      ts: new Date().toISOString()
    }),
    { status: 200, headers: corsHeaders }
  );
}
