import { mountCorporatePage } from '../runtime/corporate-page-mount.js';
import { PARTNER_FUNNEL_EVENTS, trackPartnerFunnel } from '../features/partner/partner-platform.js';
import {
  PARTNER_WEBHOOK_HEADERS,
  PARTNER_ROUTES,
  CALLBACK_STATUSES,
  SECRET_MODEL,
  EXAMPLE_PRODUCTION_PAYLOAD,
  SAMPLE_WEBHOOK_PAYLOAD,
  buildExamplePayloadJson,
  renderPayloadFieldsTable,
  renderRetryTable,
  renderErrorTable,
  verifyWebhookSignature,
  escapeHtml
} from '../features/partner/partner-api-docs.js';

const DOC_SECTIONS = [
  { id: 'overview', label: 'Genel bakış' },
  { id: 'quickstart', label: 'Hızlı başlangıç' },
  { id: 'auth', label: 'Kimlik doğrulama' },
  { id: 'payload', label: 'Lead payload' },
  { id: 'signature', label: 'İmza doğrulama' },
  { id: 'errors', label: 'Hata yönetimi' },
  { id: 'retry', label: 'Retry & failover' },
  { id: 'callback', label: 'Callback API' },
  { id: 'test-workflow', label: 'Test akışı' },
  { id: 'console', label: 'Test konsolu' }
];

function renderNav() {
  return `
    <nav class="ib-partner-docs-nav" aria-label="Dokümantasyon içeriği">
      <p class="ib-partner-docs-nav-title">İçindekiler</p>
      <ol>
        ${DOC_SECTIONS.map((s) => `<li><a href="#${s.id}">${escapeHtml(s.label)}</a></li>`).join('')}
      </ol>
      <p class="ib-partner-docs-nav-cta">
        <a class="btn primary btn-sm" href="/partner-basvuru.html">Self-serve onboarding</a>
      </p>
    </nav>`;
}

function renderHeadersList() {
  return `
    <table class="ib-partner-docs-table">
      <thead><tr><th>Header</th><th>Değer</th><th>Zorunlu</th><th>Not</th></tr></thead>
      <tbody>
        ${PARTNER_WEBHOOK_HEADERS.map((h) => `
          <tr>
            <td><code>${escapeHtml(h.name)}</code></td>
            <td><code>${escapeHtml(h.value)}</code></td>
            <td>${h.required ? 'Evet' : 'Hayır'}</td>
            <td>${escapeHtml(h.note)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function renderSecretCards() {
  return `
    <div class="ib-partner-trust-grid">
      ${Object.values(SECRET_MODEL).map((m) => `
        <div class="ib-partner-trust-card">
          <strong>${escapeHtml(m.title)}</strong>
          <p><strong>Öncelik:</strong> ${escapeHtml(m.priority)}</p>
          <p><strong>Saklama:</strong> ${escapeHtml(m.storage)}</p>
          <p><strong>Doğrulama:</strong> ${escapeHtml(m.verify)}</p>
        </div>
      `).join('')}
    </div>`;
}

function renderMainContent() {
  const productionJson = escapeHtml(buildExamplePayloadJson(EXAMPLE_PRODUCTION_PAYLOAD));
  const onboardingJson = escapeHtml(buildExamplePayloadJson(SAMPLE_WEBHOOK_PAYLOAD));
  const routes = PARTNER_ROUTES.map((r) => `<code>${r}</code>`).join(', ');
  const callbackStatuses = CALLBACK_STATUSES.map((s) => `<code>${s}</code>`).join(', ');

  return `
    <header class="ib-partner-docs-hero">
      <p class="kicker">Partner platform · API reference</p>
      <h1>Webhook &amp; entegrasyon dokümantasyonu</h1>
      <p class="lead">Kurumsal B2B lead teslimatı: imzalı HTTPS webhook, ölçülebilir retry, failover ve callback. Bu sayfa production davranışını yansıtır; sahte metrik veya gevşetilmiş güvenlik içermez.</p>
    </header>

    <section id="overview" class="ib-partner-docs-section">
      <h2>Genel bakış</h2>
      <p>isteBul Auto, <strong>hot</strong> ve <strong>very_hot</strong> öncelikli lead’leri partner endpoint’lerine JSON POST ile gönderir. Başarılı teslimat için endpoint’iniz <strong>HTTP 2xx</strong> dönmelidir.</p>
      <ul>
        <li>Protokol: HTTPS (TLS 1.2+), SSRF-safe URL kaydı</li>
        <li>İstemci timeout: <strong>8 saniye</strong> (hedef yanıt &lt; 3 sn önerilir)</li>
        <li>İmza: HMAC-SHA256, ham gövde üzerinde</li>
        <li>Gözlemlenebilirlik: <code>partner_lead_dispatch_logs</code> + operasyonel event’ler</li>
      </ul>
    </section>

    <section id="quickstart" class="ib-partner-docs-section">
      <h2>Hızlı başlangıç</h2>
      <ol class="ib-partner-docs-steps">
        <li><a href="/partner-basvuru.html">Self-serve başvuru</a> — firma, uygunluk, lead ihtiyaçları</li>
        <li>HTTPS webhook URL kaydı (onboarding adım 4)</li>
        <li>Örnek payload ile HMAC doğrulama (onboarding adım 5 — secret tarayıcıda kalır)</li>
        <li>Operasyon onayı sonrası endpoint’e <code>shared_secret</code> atanır</li>
        <li>Canlı hot lead dispatch</li>
      </ol>
      <pre class="ib-partner-docs-code"><code>POST https://api.sizin-domain.com/istebul/leads
Content-Type: application/json
x-istebul-signature: &lt;hmac_hex&gt;
x-istebul-dispatch-id: &lt;uuid&gt;

${productionJson}</code></pre>
    </section>

    <section id="auth" class="ib-partner-docs-section">
      <h2>Kimlik doğrulama &amp; güvenlik</h2>
      ${renderSecretCards()}
      <h3>İstek başlıkları</h3>
      ${renderHeadersList()}
      <p>Kurumsal güven çerçevesi: <a href="/partner-guven.html">Partner güven merkezi</a> (KVKK, SLA, destek — dürüst iddialar).</p>
      <div class="ib-partner-docs-callout ib-partner-docs-callout--warn">
        <strong>Güvenlik kuralları</strong>
        <ul>
          <li>Webhook secret’ı repoya, ticket’a veya istemci loglarına yazmayın.</li>
          <li>İmza doğrulamasında <strong>ham request body</strong> kullanın; JSON parse → tekrar stringify imzayı bozar.</li>
          <li><code>timingSafeEqual</code> (veya eşdeğeri) ile imza karşılaştırın.</li>
          <li>Callback için ayrı <code>x-partner-callback-secret</code> kullanın.</li>
        </ul>
      </div>
    </section>

    <section id="payload" class="ib-partner-docs-section">
      <h2>Lead payload</h2>
      <p>Canlı dispatch sırasında aşağıdaki alanlar gönderilir. Route listesi: ${routes}.</p>
      ${renderPayloadFieldsTable()}
      <h3>Örnek — canlı teslimat</h3>
      <pre class="ib-partner-docs-code" id="partner-docs-payload-production"><code>${productionJson}</code></pre>
      <h3>Örnek — onboarding self-test (metadata olmadan)</h3>
      <pre class="ib-partner-docs-code"><code>${onboardingJson}</code></pre>
    </section>

    <section id="signature" class="ib-partner-docs-section">
      <h2>İmza doğrulama</h2>
      <p>Algoritma: <code>HMAC_SHA256(raw_request_body, shared_secret)</code> → hex (küçük harf).</p>
      <pre class="ib-partner-docs-code"><code>// Node.js — ham body buffer/string
const crypto = require('crypto');

function verifyWebhook(rawBody, signatureHeader, secret) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signatureHeader, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}</code></pre>
      <pre class="ib-partner-docs-code"><code>// Deno / Workers
const key = await crypto.subtle.importKey(
  'raw', new TextEncoder().encode(secret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
const expected = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');</code></pre>
      <p><code>x-istebul-dispatch-id</code> ile <code>dispatch_attempt_id</code> aynı teslimat denemesini tanımlar; tekrarlayan POST’ları idempotent işleyin.</p>
    </section>

    <section id="errors" class="ib-partner-docs-section">
      <h2>Hata yönetimi</h2>
      ${renderErrorTable()}
      <p>Partner lifecycle: <code>pending</code> → <code>dispatched</code> | <code>dispatch_failed</code> → (retry) → <code>dispatch_dead</code> veya callback ile <code>won</code> / <code>lost</code>.</p>
    </section>

    <section id="retry" class="ib-partner-docs-section">
      <h2>Retry &amp; failover</h2>
      <p>Başarısız webhook’tan sonra <code>partner-retry</code> worker planlı tekrar dener (maks. 5).</p>
      ${renderRetryTable()}
      <h3>Failover routing</h3>
      <p>Birincil route’taki endpoint’ler tükendiğinde (circuit open, günlük cap, hepsi başarısız) isteBul yapılandırılmış failover route dener — örn. <code>dealer_partner</code> → <code>general_sales</code>.</p>
      <p>Test telefonları (<code>905551112233</code> vb.) production dispatch’ten <strong>bilerek hariç</strong> tutulur; metrikleri kirletmez.</p>
    </section>

    <section id="callback" class="ib-partner-docs-section">
      <h2>Callback API (kazanım bildirimi)</h2>
      <p>Satış sonucunu isteBul’a bildirmek için ayrı secret ile POST:</p>
      <pre class="ib-partner-docs-code"><code>POST {SUPABASE_URL}/functions/v1/partner-callback
Content-Type: application/json
apikey: &lt;SUPABASE_ANON_KEY&gt;
Authorization: Bearer &lt;SUPABASE_ANON_KEY&gt;
x-partner-callback-secret: &lt;PARTNER_CALLBACK_SECRET — operasyon tarafından&gt;

{
  "lead_id": "550e8400-e29b-41d4-a716-446655440000",
  "partner_status": "won",
  "actual_revenue": 5000,
  "notes": "Satış tamamlandı",
  "event_id": "optional-idempotency-key"
}</code></pre>
      <p>İzin verilen <code>partner_status</code>: ${callbackStatuses}. Rate limit: 60 istek / dakika / IP.</p>
      <p class="text-muted-sm">Callback secret webhook secret değildir. Gerçek secret değerleri yalnızca güvenli kanaldan paylaşılır — bu dokümanda placeholder kullanılır.</p>
    </section>

    <section id="test-workflow" class="ib-partner-docs-section">
      <h2>Test endpoint workflow</h2>
      <ol class="ib-partner-docs-steps">
        <li><strong>Staging webhook</strong> — Production’dan ayrı HTTPS URL (aynı imza mantığı).</li>
        <li><strong>Onboarding adım 5</strong> — <a href="/partner-basvuru.html">partner-basvuru</a> üzerinde örnek JSON + secret ile HMAC self-test (secret sunucuya gönderilmez).</li>
        <li><strong>Operasyon onayı</strong> — Admin endpoint’e <code>shared_secret</code> atar; canlı hot lead açılır.</li>
        <li><strong>2xx doğrulama</strong> — İlk canlı teslimatta loglarda <code>success: true</code> ve <code>partner_status: dispatched</code>.</li>
        <li><strong>Callback test</strong> — Kazanım / kayıp için <code>partner-callback</code> (secret ile).</li>
      </ol>
    </section>

    <section id="console" class="ib-partner-docs-section ib-partner-docs-console-section">
      <h2>Test konsolu (payload &amp; imza)</h2>
      <p class="lead">Yalnızca tarayıcınızda çalışır; secret veya payload üçüncü tarafa gönderilmez. Canlı URL’ye otomatik POST yapılmaz.</p>
      <div id="partner-docs-console-root"></div>
    </section>
  `;
}

function mountTestConsole(root) {
  if (!root) return;

  const defaultBody = buildExamplePayloadJson(EXAMPLE_PRODUCTION_PAYLOAD);

  root.innerHTML = `
    <div class="ib-partner-console">
      <label class="ib-partner-console-label">JSON gövde (imza bu metin üzerinden)
        <textarea id="partner-console-body" rows="14" spellcheck="false">${escapeHtml(defaultBody)}</textarea>
      </label>
      <label class="ib-partner-console-label">Webhook signing secret (local)
        <input id="partner-console-secret" type="password" autocomplete="off" placeholder="En az 8 karakter">
      </label>
      <div class="ib-partner-console-actions">
        <button type="button" class="btn primary" id="partner-console-compute">İmzayı hesapla</button>
        <button type="button" class="btn secondary" id="partner-console-validate-json">JSON doğrula</button>
        <button type="button" class="btn secondary" id="partner-console-reset">Örnek payload yükle</button>
      </div>
      <label class="ib-partner-console-label">Beklenen x-istebul-signature (hex)
        <input id="partner-console-expected" type="text" readonly>
      </label>
      <label class="ib-partner-console-label">Gelen imza (karşılaştır)
        <input id="partner-console-incoming" type="text" placeholder="64 karakter hex">
      </label>
      <p id="partner-console-result" class="ib-partner-console-result" role="status" aria-live="polite"></p>
      <p class="text-muted-sm">Uyarı: Sunucunuzda <code>req.raw()</code> / ham stream ile okunan body ile birebir aynı baytları imzalayın.</p>
    </div>
  `;

  const bodyEl = root.querySelector('#partner-console-body');
  const secretEl = root.querySelector('#partner-console-secret');
  const expectedEl = root.querySelector('#partner-console-expected');
  const incomingEl = root.querySelector('#partner-console-incoming');
  const resultEl = root.querySelector('#partner-console-result');

  root.querySelector('#partner-console-reset')?.addEventListener('click', () => {
    if (bodyEl) bodyEl.value = buildExamplePayloadJson(EXAMPLE_PRODUCTION_PAYLOAD);
    if (expectedEl) expectedEl.value = '';
    if (incomingEl) incomingEl.value = '';
    if (resultEl) resultEl.textContent = '';
  });

  root.querySelector('#partner-console-validate-json')?.addEventListener('click', () => {
    try {
      JSON.parse(bodyEl?.value || '');
      resultEl.textContent = 'JSON geçerli.';
      resultEl.className = 'ib-partner-console-result is-ok';
    } catch (err) {
      resultEl.textContent = `JSON hatası: ${err.message}`;
      resultEl.className = 'ib-partner-console-result is-error';
    }
  });

  root.querySelector('#partner-console-compute')?.addEventListener('click', async () => {
    const secret = secretEl?.value?.trim() || '';
    const raw = bodyEl?.value ?? '';
    if (secret.length < 8) {
      resultEl.textContent = 'Secret en az 8 karakter olmalı.';
      resultEl.className = 'ib-partner-console-result is-error';
      return;
    }
    try {
      JSON.parse(raw);
    } catch (err) {
      resultEl.textContent = `Önce geçerli JSON girin: ${err.message}`;
      resultEl.className = 'ib-partner-console-result is-error';
      return;
    }
    const { valid, expected } = await verifyWebhookSignature(
      secret,
      raw,
      incomingEl?.value?.trim() || ''
    );
    if (expectedEl) expectedEl.value = expected;
    if (incomingEl?.value?.trim()) {
      resultEl.textContent = valid ? 'İmza eşleşti.' : 'İmza eşleşmedi — body baytlarını kontrol edin.';
      resultEl.className = `ib-partner-console-result ${valid ? 'is-ok' : 'is-error'}`;
    } else {
      resultEl.textContent = 'İmza hesaplandı. Gelen imzayı yapıştırıp tekrar hesaplayın.';
      resultEl.className = 'ib-partner-console-result is-ok';
    }
    trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.DOCS_VIEW, { action: 'console_compute' }, { oncePerSession: false });
  });
}

function mountDocsPage() {
  const shell = document.getElementById('partner-docs-shell');
  if (!shell) return;

  shell.innerHTML = `
    <div class="ib-partner-docs-layout">
      ${renderNav()}
      <div class="ib-partner-docs-content">
        ${renderMainContent()}
        <footer class="ib-partner-docs-footer">
          <a class="btn primary" href="/partner-basvuru.html">Self-serve başvuru</a>
          <a class="btn secondary" href="/partner-olun.html">Program özeti</a>
          <a class="btn secondary" href="/docs/partner-webhook-integration.md">Markdown sürüm</a>
        </footer>
      </div>
    </div>
  `;

  mountTestConsole(document.getElementById('partner-docs-console-root'));
}

mountCorporatePage(() => {
  trackPartnerFunnel(PARTNER_FUNNEL_EVENTS.DOCS_VIEW, { path: '/partner-docs.html', version: 'p2.2' });
  mountDocsPage();
  document.querySelector('[data-partner-prerender]')?.remove();
}, { label: 'Partner API dokümantasyonu' });
