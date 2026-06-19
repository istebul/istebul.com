/**
 * Record operational event from Cloudflare Pages functions (Stripe, checkout).
 */
export async function recordOpsEvent(supabase, input) {
  if (!supabase) return;

  const row = {
    severity: input.severity || 'error',
    category: input.category,
    event_name: input.event_name,
    source: input.source || 'pages_function',
    fingerprint: input.fingerprint || `${input.category}:${input.event_name}`,
    idempotency_key: input.idempotency_key || null,
    properties: input.properties || {},
    http_status: input.http_status ?? null,
    duration_ms: input.duration_ms ?? null
  };

  const { error } = await supabase.from('operational_events').insert(row);
  if (error && error.code !== '23505') {
    console.error('operational_events insert failed:', error.message);
  }
}
