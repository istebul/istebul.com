/**
 * Active partner pool — live partner_endpoints with static fallback.
 */
import { DEFAULT_PARTNER_POOL, mapPartnerEndpointRow } from './partner-match-engine.js';

/**
 * @param {import('@supabase/supabase-js').SupabaseClient|null|undefined} sb
 * @returns {Promise<{ partners: Array<object>, source: 'live'|'static' }>}
 */
export async function fetchActivePartnerPool(sb) {
  if (!sb) {
    return { partners: DEFAULT_PARTNER_POOL, source: 'static' };
  }

  try {
    const { data, error } = await sb
      .from('partner_endpoints')
      .select('id,name,route_type,is_active,priority_weight,health_status')
      .eq('is_active', true)
      .order('priority_weight', { ascending: false })
      .limit(25);

    if (error || !Array.isArray(data) || !data.length) {
      return { partners: DEFAULT_PARTNER_POOL, source: 'static' };
    }

    const partners = data.map(mapPartnerEndpointRow).filter(Boolean);
    if (!partners.length) {
      return { partners: DEFAULT_PARTNER_POOL, source: 'static' };
    }

    return { partners, source: 'live' };
  } catch {
    return { partners: DEFAULT_PARTNER_POOL, source: 'static' };
  }
}
