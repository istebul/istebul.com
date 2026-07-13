import type { SupabaseClient } from '@supabase/supabase-js';
import type { RestaurantTenant } from '@/contexts/TenantContext';
import { DashboardDataError } from '@/data/dashboard-api';

export interface TenantMembershipRow {
  restaurant_id: string;
  role: string;
  restaurants:
    | {
        id: string;
        name: string;
        slug: string;
        plan: string | null;
        address: string | null;
      }
    | {
        id: string;
        name: string;
        slug: string;
        plan: string | null;
        address: string | null;
      }[]
    | null;
}

function normalizePlan(plan: string | null | undefined): RestaurantTenant['plan'] {
  const key = String(plan || 'starter').trim().toLowerCase();
  if (key === 'enterprise' || key === 'pro' || key === 'starter') return key;
  if (key === 'growth' || key === 'pilot') return 'pro';
  return 'starter';
}

export function mapMembershipToTenant(row: TenantMembershipRow): RestaurantTenant | null {
  const restaurant = Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants;
  const restaurantId = String(row.restaurant_id || restaurant?.id || '').trim();
  if (!restaurantId) return null;

  return {
    restaurant_id: restaurantId,
    name: String(restaurant?.name || 'Restoran'),
    slug: String(restaurant?.slug || ''),
    city: String(restaurant?.address || '—'),
    plan: normalizePlan(restaurant?.plan),
    role: String(row.role || ''),
  };
}

export async function fetchRestaurantTenants(client: SupabaseClient | null): Promise<RestaurantTenant[]> {
  if (!client) {
    throw new DashboardDataError('Supabase bağlantısı yapılandırılmamış.');
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  const userId = userData?.user?.id;

  if (userError || !userId) {
    throw new DashboardDataError('Oturum bulunamadı. Lütfen GarsonAI paneline giriş yapın.');
  }

  const { data, error } = await client
    .from('restaurant_users')
    .select('restaurant_id, role, restaurants(id, name, slug, plan, address)')
    .eq('user_id', userId)
    .limit(20);

  if (error) {
    throw new DashboardDataError(error.message || 'Restoran listesi alınamadı.');
  }

  const tenants = (data || [])
    .map((row) => mapMembershipToTenant(row as TenantMembershipRow))
    .filter((tenant): tenant is RestaurantTenant => Boolean(tenant));

  if (!tenants.length) {
    throw new DashboardDataError('Bu hesap için tanımlı restoran bulunamadı.');
  }

  return tenants;
}
