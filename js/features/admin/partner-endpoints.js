/**
 * Partner Endpoints admin helpers — route types, validation, secret masking.
 */

export const PARTNER_ROUTE_TYPE_OPTIONS = Object.freeze([
  { value: 'dealer_partner', label: 'Auto — Bayi / Galeri', group: 'auto' },
  { value: 'finance_partner', label: 'Auto — Finansman', group: 'auto' },
  { value: 'insurance_partner', label: 'Auto — Sigorta', group: 'auto' },
  { value: 'premium_report', label: 'Auto — Premium Rapor', group: 'auto' },
  { value: 'general_sales', label: 'Auto — Genel Satış', group: 'auto' },
  { value: 'housing', label: 'Konut', group: 'vertical' },
  { value: 'finance', label: 'Finansman', group: 'vertical' },
  { value: 'vacation', label: 'Tatil', group: 'vertical' },
  { value: 'insurance', label: 'Sigorta', group: 'vertical' },
  { value: 'kasko', label: 'Kasko', group: 'vertical' }
]);

export const ALLOWED_PARTNER_ROUTE_TYPES = new Set(
  PARTNER_ROUTE_TYPE_OPTIONS.map((o) => o.value)
);

export function routeTypeLabel(routeType) {
  const hit = PARTNER_ROUTE_TYPE_OPTIONS.find((o) => o.value === routeType);
  return hit?.label || String(routeType || '—');
}

export function validateRouteType(routeType) {
  const key = String(routeType || '').trim();
  if (!ALLOWED_PARTNER_ROUTE_TYPES.has(key)) {
    return { ok: false, error: `invalid_route_type:${key}` };
  }
  return { ok: true, routeType: key };
}

export function maskAuthSecret(value) {
  if (!value) return '—';
  const s = String(value);
  if (s.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(8, s.length - 4))}${s.slice(-4)}`;
}

/** Strip shared_secret from API rows; never export to UI or CSV. */
const PARTNER_ENDPOINT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPartnerEndpointUuid(id) {
  return PARTNER_ENDPOINT_UUID_RE.test(String(id || '').trim());
}

export const PARTNER_ENDPOINT_TEST_ERRORS = Object.freeze({
  endpoint_not_found: 'Endpoint bulunamadı — kayıt silinmiş veya ID hatalı',
  endpoint_id_required: 'Endpoint ID gönderilmedi',
  webhook_failed: 'Webhook yanıt vermedi veya hata döndü',
  admin_required: 'Bu işlem için admin yetkisi gerekli'
});

export function formatPartnerEndpointTestError(payload) {
  const code = String(payload?.error || payload?.message || '').trim();
  if (!code) return 'Test başarısız';
  return PARTNER_ENDPOINT_TEST_ERRORS[code] || code;
}

export function sanitizePartnerEndpointRow(row) {
  if (!row || typeof row !== 'object') return row;
  const { shared_secret: _secret, ...rest } = row;
  const id = rest.id != null ? String(rest.id).trim() : rest.id;
  return {
    ...rest,
    id,
    has_auth_secret: Boolean(_secret && String(_secret).length > 0)
  };
}

export function renderRouteTypeOptions(selected = '') {
  const auto = PARTNER_ROUTE_TYPE_OPTIONS.filter((o) => o.group === 'auto');
  const vertical = PARTNER_ROUTE_TYPE_OPTIONS.filter((o) => o.group === 'vertical');
  const opt = (o) =>
    `<option value="${o.value}" ${selected === o.value ? 'selected' : ''}>${o.label}</option>`;
  return `
    <optgroup label="Auto">${auto.map(opt).join('')}</optgroup>
    <optgroup label="Dikey">${vertical.map(opt).join('')}</optgroup>`;
}

export function healthStatusBadge(status) {
  const s = String(status || 'healthy');
  if (s === 'healthy') return { label: 'Sağlıklı', badge: 'badge-green' };
  if (s === 'degraded') return { label: 'Bozuk', badge: 'badge-yellow' };
  return { label: 'Arızalı', badge: 'badge-red' };
}

export function endpointWithinDailyCap(endpoint) {
  if (endpoint?.daily_cap == null) return true;
  return Number(endpoint.sent_today || 0) < Number(endpoint.daily_cap);
}

export function isEndpointDispatchable(endpoint) {
  if (!endpoint?.is_active) return false;
  if (!endpoint?.webhook_url) return false;
  if (!endpointWithinDailyCap(endpoint)) return false;
  if (endpoint.circuit_open_until && new Date(endpoint.circuit_open_until).getTime() > Date.now()) {
    return false;
  }
  return true;
}
