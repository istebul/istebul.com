/**
 * Resolve Stripe customer id for a user from subscription rows (server-only).
 * Never accept customer id from the client — always scope by authenticated user_id.
 *
 * @param {Array<{ stripe_customer_id?: string | null }>} rows
 * @returns {string | null}
 */
export function pickStripeCustomerIdFromRows(rows) {
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    const id = row?.stripe_customer_id;
    if (typeof id === 'string' && id.startsWith('cus_')) {
      return id;
    }
  }
  return null;
}

/**
 * @param {string} userId
 * @param {{ SUPABASE_URL: string, SUPABASE_SERVICE_ROLE_KEY: string }} env
 * @returns {Promise<string | null>}
 */
export async function fetchStripeCustomerIdForUser(userId, env) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !userId) {
    return null;
  }

  const query = new URLSearchParams({
    user_id: `eq.${userId}`,
    stripe_customer_id: 'not.is.null',
    select: 'stripe_customer_id',
    order: 'updated_at.desc',
    limit: '1'
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?${query}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!res.ok) return null;

  const rows = await res.json();
  return pickStripeCustomerIdFromRows(rows);
}
