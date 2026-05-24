/**
 * P2.2 — Partner API reference (webhook, auth, retry, errors). Shared by docs UI + tests.
 */
import { SAMPLE_WEBHOOK_PAYLOAD, computeHmacSha256Hex } from './partner-funnel.js';

export const PARTNER_WEBHOOK_HEADERS = Object.freeze([
  { name: 'Content-Type', value: 'application/json', required: true, note: 'Gövde UTF-8 JSON' },
  { name: 'x-istebul-signature', value: '<hmac_sha256_hex>', required: true, note: 'HMAC-SHA256(raw body, shared_secret)' },
  { name: 'x-istebul-dispatch-id', value: '<uuid>', required: true, note: 'Teslimat denemesi; idempotency anahtarı' }
]);

export const RETRY_SCHEDULE = Object.freeze([
  { attempt: 1, delay: '15 dakika', note: 'İlk başarısızlık sonrası' },
  { attempt: 2, delay: '1 saat', note: '' },
  { attempt: 3, delay: '6 saat', note: '' },
  { attempt: 4, delay: '24 saat', note: '4. ve 5. deneme' },
  { attempt: 5, delay: '24 saat', note: 'Son deneme; sonra dispatch_dead' }
]);

export const PARTNER_ROUTES = Object.freeze([
  'dealer_partner',
  'finance_partner',
  'insurance_partner',
  'premium_report',
  'general_sales'
]);

export const CALLBACK_STATUSES = Object.freeze([
  'accepted',
  'won',
  'lost',
  'paid',
  'closed',
  'funded',
  'delivered',
  'rejected'
]);

/** Fields included in outbound webhook JSON (before dispatch metadata). */
export const PARTNER_LEAD_PAYLOAD_FIELDS = Object.freeze([
  { field: 'email', type: 'string | null', description: 'Müşteri e-posta (normalize edilmiş)' },
  { field: 'phone', type: 'string', description: 'E.164 benzeri rakamlar (örn. 905551112233)' },
  { field: 'contact_name', type: 'string | null', description: 'İletişim adı' },
  { field: 'budget', type: 'number', description: 'Bütçe (TRY)' },
  { field: 'usage', type: 'string', description: 'Kullanım profili (family, commute, …)' },
  { field: 'body', type: 'string', description: 'Kasa tipi (suv, sedan, …)' },
  { field: 'fuel', type: 'string', description: 'Yakıt tercihi' },
  { field: 'km', type: 'number | null', description: 'Yıllık km' },
  { field: 'loan', type: 'string | null', description: 'Finansman niyeti' },
  { field: 'interest_type', type: 'string', description: 'vehicle_offer | finance | insurance | …' },
  { field: 'vehicle', type: 'string | null', description: 'Önerilen / ilgi araç' },
  { field: 'lead_score', type: 'number', description: 'Karar skoru (hot eşiği genelde 120+)' },
  { field: 'priority', type: 'string', description: 'hot | very_hot (düşük öncelik dispatch edilmez)' },
  { field: 'partner_route', type: 'string', description: 'Route tipi (bkz. partner_route listesi)' },
  { field: 'estimated_revenue', type: 'number', description: 'Tahmini komisyon / gelir (TRY)' },
  { field: 'source', type: 'string', description: 'Kaynak (örn. auto)' },
  { field: 'lead_id', type: 'uuid', description: 'isteBul lead kimliği (dispatch sırasında eklenir)' },
  { field: 'partner_endpoint_id', type: 'uuid', description: 'Hedef endpoint id' },
  { field: 'partner_endpoint_name', type: 'string', description: 'Endpoint görünen adı' },
  { field: 'dispatch_attempt_id', type: 'uuid', description: 'x-istebul-dispatch-id ile aynı değer' },
  { field: 'manual_dispatch', type: 'boolean', description: 'Admin manuel gönderim bayrağı' }
]);

export const EXAMPLE_PRODUCTION_PAYLOAD = Object.freeze({
  email: 'customer@example.com',
  phone: '905551112233',
  contact_name: 'Ayşe Yılmaz',
  budget: 2500000,
  usage: 'family',
  body: 'suv',
  fuel: 'hybrid',
  km: 15000,
  loan: 'yes',
  interest_type: 'vehicle_offer',
  vehicle: 'BMW X5',
  lead_score: 150,
  priority: 'very_hot',
  partner_route: 'dealer_partner',
  estimated_revenue: 7500,
  source: 'auto',
  lead_id: '550e8400-e29b-41d4-a716-446655440000',
  partner_endpoint_id: '660e8400-e29b-41d4-a716-446655440001',
  partner_endpoint_name: 'Örnek Galeri — Production',
  dispatch_attempt_id: '770e8400-e29b-41d4-a716-446655440002',
  manual_dispatch: false
});

export const DISPATCH_ERROR_CODES = Object.freeze([
  { code: 'HTTP 2xx', partnerAction: 'Başarı — retry durur', istebulAction: 'partner_status → dispatched' },
  { code: 'HTTP 4xx/5xx', partnerAction: 'Hata gövdesi loglanır (ilk 240 karakter)', istebulAction: 'Retry planına alınır' },
  { code: 'Timeout (8s)', partnerAction: 'Yanıt süresi aşımı', istebulAction: 'network_or_timeout — retry' },
  { code: 'all_endpoints_failed', partnerAction: 'Route’taki tüm endpoint’ler denendi', istebulAction: 'Failover route veya retry' },
  { code: 'dispatch_dead', partnerAction: '5 deneme tükendi', istebulAction: 'Manuel müdahale / admin retry' }
]);

export const SECRET_MODEL = Object.freeze({
  webhook: {
    title: 'Webhook imza secret',
    priority: 'Endpoint bazlı shared_secret, yoksa platform PARTNER_WEBHOOK_SIGNING_SECRET',
    storage: 'Secret yalnızca partner altyapınızda; isteBul onboarding adımında secret saklamaz',
    verify: 'Ham istek gövdesi (raw bytes) üzerinde HMAC-SHA256 hex'
  },
  callback: {
    title: 'Callback secret',
    priority: 'Ayrı PARTNER_CALLBACK_SECRET — webhook secret ile karıştırmayın',
    storage: 'Header: x-partner-callback-secret; operasyon ekibiyle güvenli kanaldan paylaşılır',
    verify: 'Sabit secret karşılaştırması (HMAC değil)'
  }
});

export function canonicalJsonStringify(value) {
  return JSON.stringify(value);
}

export function buildExamplePayloadJson(example = EXAMPLE_PRODUCTION_PAYLOAD) {
  return JSON.stringify(example, null, 2);
}

export function timingSafeEqualHex(a, b) {
  const left = String(a || '').toLowerCase();
  const right = String(b || '').toLowerCase();
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyWebhookSignature(secret, rawBody, signatureHex) {
  const expected = await computeHmacSha256Hex(secret, rawBody);
  const valid = timingSafeEqualHex(expected, signatureHex);
  return { valid, expected };
}

export { SAMPLE_WEBHOOK_PAYLOAD, computeHmacSha256Hex };

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderPayloadFieldsTable() {
  return `
    <div class="ib-partner-docs-table-wrap">
      <table class="ib-partner-docs-table">
        <thead><tr><th>Alan</th><th>Tip</th><th>Açıklama</th></tr></thead>
        <tbody>
          ${PARTNER_LEAD_PAYLOAD_FIELDS.map((row) => `
            <tr>
              <td><code>${escapeHtml(row.field)}</code></td>
              <td>${escapeHtml(row.type)}</td>
              <td>${escapeHtml(row.description)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

export function renderRetryTable() {
  return `
    <table class="ib-partner-docs-table">
      <thead><tr><th>Deneme #</th><th>Sonraki retry</th><th>Not</th></tr></thead>
      <tbody>
        ${RETRY_SCHEDULE.map((r) => `
          <tr>
            <td>${r.attempt}</td>
            <td>${escapeHtml(r.delay)}</td>
            <td>${escapeHtml(r.note)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

export function renderErrorTable() {
  return `
    <table class="ib-partner-docs-table">
      <thead><tr><th>Durum</th><th>Partner tarafı</th><th>isteBul</th></tr></thead>
      <tbody>
        ${DISPATCH_ERROR_CODES.map((r) => `
          <tr>
            <td><code>${escapeHtml(r.code)}</code></td>
            <td>${escapeHtml(r.partnerAction)}</td>
            <td>${escapeHtml(r.istebulAction)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}
