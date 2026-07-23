import type { SupabaseClient } from '@supabase/supabase-js';
import { formatCurrencyTry } from '@/lib/format';
import { isTableAvailableForSelection } from '@/lib/journey';
import {
  createReservationAccessToken,
  getSupabaseClientWithReservationToken,
} from '@/lib/supabase';

export class CxDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CxDataError';
  }
}

export interface RestaurantProfile {
  id: string;
  slug: string;
  name: string;
  description: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  workingHours: Record<string, string>;
  socialLinks: Record<string, string>;
  campaigns: string[];
}

export interface CxTable {
  id: string;
  name: string;
  salon: string;
  capacity: number;
  status: string;
  active: boolean;
}

export interface CxMenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface CxMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceLabel: string;
  categoryId: string | null;
  categoryName: string;
}

export interface GuaranteePolicyInfo {
  id: string | null;
  summaryLabel: string;
  amount: number;
  amountLabel: string;
  notes: string | null;
  fixedEnabled: boolean;
  perGuestEnabled: boolean;
  perGuestAmount: number;
  cancelDeadlineHours: number;
  noShowPolicy: string;
}

export interface CxRestaurantBundle {
  restaurant: RestaurantProfile;
  tables: CxTable[];
  availableTables: CxTable[];
  salons: string[];
  categories: CxMenuCategory[];
  menuItems: CxMenuItem[];
  guarantee: GuaranteePolicyInfo;
}

export interface PreorderCartItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  note: string;
}

export interface SubmitReservationInput {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  guestCount: number;
  salon: string;
  tableId: string;
  notes?: string;
  cart: PreorderCartItem[];
  guaranteeAmount: number;
  guaranteePolicyId: string | null;
}

export interface SubmitReservationResult {
  reservationId: string;
  preorderId: string | null;
}

function requireClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) throw new CxDataError('Supabase yapılandırılmamış.');
  return client;
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string' && entry.trim()) out[key] = entry;
  }
  return out;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function toNumber(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function computeGuaranteeAmount(
  policy: {
    fixed_guarantee_enabled?: boolean;
    fixed_guarantee_amount?: number | string;
    per_guest_guarantee_enabled?: boolean;
    per_guest_guarantee_amount?: number | string;
  } | null,
  guestCount: number,
): number {
  if (!policy) return 0;
  if (policy.fixed_guarantee_enabled) return toNumber(policy.fixed_guarantee_amount);
  if (policy.per_guest_guarantee_enabled) {
    return toNumber(policy.per_guest_guarantee_amount) * Math.max(1, guestCount);
  }
  return 0;
}

function mapGuarantee(
  policy: {
    id: string;
    fixed_guarantee_enabled: boolean;
    fixed_guarantee_amount: number | string;
    per_guest_guarantee_enabled: boolean;
    per_guest_guarantee_amount: number | string;
    cancel_deadline_hours: number;
    no_show_policy: string;
    notes: string | null;
  } | null,
  guestCount = 2,
): GuaranteePolicyInfo {
  const amount = computeGuaranteeAmount(policy, guestCount);
  const parts: string[] = [];
  if (policy?.fixed_guarantee_enabled) parts.push('Sabit provizyon');
  if (policy?.per_guest_guarantee_enabled) parts.push('Kişi başı provizyon');
  if (!parts.length) parts.push('Ücretsiz rezervasyon altyapısı');

  return {
    id: policy?.id || null,
    summaryLabel: parts.join(' · '),
    amount,
    amountLabel: formatCurrencyTry(amount),
    notes: policy?.notes || null,
    fixedEnabled: Boolean(policy?.fixed_guarantee_enabled),
    perGuestEnabled: Boolean(policy?.per_guest_guarantee_enabled),
    perGuestAmount: toNumber(policy?.per_guest_guarantee_amount),
    cancelDeadlineHours: Number(policy?.cancel_deadline_hours || 24),
    noShowPolicy: policy?.no_show_policy || 'none',
  };
}

export async function fetchRestaurantCxBySlug(
  client: SupabaseClient | null,
  slug: string,
): Promise<CxRestaurantBundle> {
  const db = requireClient(client);
  const normalized = String(slug || '').trim();
  if (!normalized) throw new CxDataError('Restoran slug gerekli.');

  const { data: restaurant, error: restaurantError } = await db
    .from('restaurants')
    .select(
      `
      id, slug, name, description, phone, address, city,
      cover_image_url, logo_url, working_hours, social_links, campaigns, status
    `,
    )
    .eq('slug', normalized)
    .eq('status', 'active')
    .maybeSingle();

  if (restaurantError) {
    throw new CxDataError(restaurantError.message || 'Restoran yüklenemedi.');
  }
  if (!restaurant) {
    throw new CxDataError('Restoran bulunamadı veya aktif değil.');
  }

  const restaurantId = restaurant.id as string;

  const [tablesResult, categoriesResult, itemsResult, policyResult] = await Promise.all([
    db
      .from('restaurant_tables')
      .select('id, name, salon, capacity, status, active, sort_order')
      .eq('restaurant_id', restaurantId)
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    db
      .from('menu_categories')
      .select('id, name, sort_order')
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true }),
    db
      .from('menu_items')
      .select(
        'id, name, description, price, category, category_id, active, is_active, menu_categories(id, name)',
      )
      .eq('restaurant_id', restaurantId)
      .order('name', { ascending: true }),
    db
      .from('payment_policies')
      .select(
        `
        id, fixed_guarantee_enabled, fixed_guarantee_amount,
        per_guest_guarantee_enabled, per_guest_guarantee_amount,
        cancel_deadline_hours, no_show_policy, notes
      `,
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (tablesResult.error) {
    throw new CxDataError(tablesResult.error.message || 'Masalar yüklenemedi.');
  }
  if (categoriesResult.error) {
    throw new CxDataError(categoriesResult.error.message || 'Menü kategorileri yüklenemedi.');
  }
  if (itemsResult.error) {
    throw new CxDataError(itemsResult.error.message || 'Menü ürünleri yüklenemedi.');
  }
  if (policyResult.error) {
    throw new CxDataError(policyResult.error.message || 'Provizyon politikası yüklenemedi.');
  }

  const tables: CxTable[] = (tablesResult.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    salon: row.salon || 'Ana Salon',
    capacity: Number(row.capacity || 2),
    status: String(row.status || 'empty'),
    active: Boolean(row.active),
  }));

  const availableTables = tables.filter((table) =>
    isTableAvailableForSelection(table.status, table.active),
  );

  const salons = [...new Set(tables.map((table) => table.salon).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  );

  const categories: CxMenuCategory[] = (categoriesResult.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    sortOrder: Number(row.sort_order || 0),
  }));
  const categoryNames = new Map(categories.map((item) => [item.id, item.name]));

  const menuItems: CxMenuItem[] = (itemsResult.data || [])
    .filter((row) => {
      if (typeof row.active === 'boolean') return row.active;
      if (typeof row.is_active === 'boolean') return row.is_active;
      return true;
    })
    .map((row) => {
      const nested = Array.isArray(row.menu_categories)
        ? row.menu_categories[0]
        : row.menu_categories;
      const price = toNumber(row.price);
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        price,
        priceLabel: formatCurrencyTry(price),
        categoryId: row.category_id,
        categoryName:
          nested?.name ||
          (row.category_id ? categoryNames.get(row.category_id) : null) ||
          String(row.category || 'Genel'),
      };
    });

  return {
    restaurant: {
      id: restaurantId,
      slug: restaurant.slug,
      name: restaurant.name,
      description:
        restaurant.description ||
        'GarsonAI ile rezervasyon, masa seçimi, dijital menü ve ön sipariş.',
      phone: restaurant.phone,
      address: restaurant.address,
      city: restaurant.city,
      coverImageUrl: restaurant.cover_image_url,
      logoUrl: restaurant.logo_url,
      workingHours: asRecord(restaurant.working_hours),
      socialLinks: asRecord(restaurant.social_links),
      campaigns: asStringArray(restaurant.campaigns),
    },
    tables,
    availableTables,
    salons,
    categories,
    menuItems,
    guarantee: mapGuarantee(policyResult.data, 2),
  };
}

export function filterAvailableTables(
  tables: CxTable[],
  opts: { salon?: string; guestCount?: number },
): CxTable[] {
  return tables.filter((table) => {
    if (!isTableAvailableForSelection(table.status, table.active)) return false;
    if (opts.salon && table.salon !== opts.salon) return false;
    if (opts.guestCount && table.capacity < opts.guestCount) return false;
    return true;
  });
}

export function resolveGuaranteeForGuests(
  guarantee: GuaranteePolicyInfo,
  guestCount: number,
): GuaranteePolicyInfo {
  const amount = guarantee.fixedEnabled
    ? guarantee.amount
    : guarantee.perGuestEnabled
      ? guarantee.perGuestAmount * Math.max(1, guestCount)
      : 0;
  return {
    ...guarantee,
    amount,
    amountLabel: formatCurrencyTry(amount),
  };
}

export async function submitCustomerReservation(
  client: SupabaseClient | null,
  input: SubmitReservationInput,
): Promise<SubmitReservationResult> {
  requireClient(client);
  const restaurantId = String(input.restaurantId || '').trim();
  if (!restaurantId) throw new CxDataError('restaurant_id zorunlu.');
  if (!input.customerName.trim()) throw new CxDataError('Müşteri adı gerekli.');
  if (!input.tableId) throw new CxDataError('Masa seçimi gerekli.');

  // P7-KA: token-gated reservation read — client token + header for RLS SELECT/RETURNING.
  const accessToken = createReservationAccessToken();
  const requestToken = createReservationAccessToken();
  const scoped = getSupabaseClientWithReservationToken(accessToken);
  if (!scoped) throw new CxDataError('Supabase token istemcisi oluşturulamadı.');

  const { data: reservation, error: reservationError } = await scoped
    .from('reservations')
    .insert({
      restaurant_id: restaurantId,
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone.trim() || null,
      date: input.date,
      time: input.time,
      guest_count: input.guestCount,
      salon: input.salon,
      status: 'confirmed',
      arrival_status: 'expected',
      has_preorder: input.cart.length > 0,
      notes: input.notes || null,
      party_source: 'reservation',
      access_token: accessToken,
      reservation_request_token: requestToken,
    })
    .select('id')
    .maybeSingle();

  if (reservationError || !reservation) {
    throw new CxDataError(reservationError?.message || 'Rezervasyon oluşturulamadı.');
  }

  const reservationId = reservation.id as string;

  const { error: linkError } = await scoped.from('reservation_tables').insert({
    restaurant_id: restaurantId,
    reservation_id: reservationId,
    table_id: input.tableId,
  });
  if (linkError) {
    throw new CxDataError(linkError.message || 'Masa bağlantısı kaydedilemedi.');
  }

  let preorderId: string | null = null;
  if (input.cart.length > 0) {
    const lineItems = input.cart.map((item) => ({
      menu_item_id: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      note: item.note || null,
      line_total: item.unitPrice * item.quantity,
    }));
    const total = lineItems.reduce((sum, item) => sum + item.line_total, 0);

    const { error: preorderError } = await scoped.from('preorders').insert({
      restaurant_id: restaurantId,
      reservation_id: reservationId,
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone.trim() || null,
      status: 'submitted',
      kitchen_status: 'submitted',
      items: lineItems,
      line_items: lineItems,
      total,
      total_amount: total,
      notes: input.notes || null,
    });

    if (preorderError) {
      throw new CxDataError(preorderError.message || 'Ön sipariş kaydedilemedi.');
    }
    // No anon SELECT on preorders (P7-KA) — id intentionally omitted.
    preorderId = null;
  }

  const { error: guaranteeError } = await scoped.from('reservation_guarantees').insert({
    restaurant_id: restaurantId,
    reservation_id: reservationId,
    reservation_guarantee_amount: input.guaranteeAmount,
    reservation_guarantee_status: input.guaranteeAmount > 0 ? 'pending' : 'none',
    reservation_guarantee_refund_status: 'none',
    reservation_guarantee_policy: 'cx-p7j',
    payment_policy_id: input.guaranteePolicyId,
    currency: 'TRY',
    notes: 'P7-J CX foundation — ödeme alınmadı',
    provider_code: 'mock',
  });

  if (guaranteeError) {
    throw new CxDataError(guaranteeError.message || 'Provizyon kaydı oluşturulamadı.');
  }

  return { reservationId, preorderId };
}
