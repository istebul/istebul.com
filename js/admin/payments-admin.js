/**
 * Admin Payments sekmesi — ödeme tabloları + sağlayıcı durumu.
 */
import { getSupabaseClient } from '../core/supabase.js';
import { fetchAdminTable } from './admin-query.js';

const TABLES = [
  { key: 'orders', table: 'payment_orders', label: 'Son ödeme siparişleri', limit: 50 },
  { key: 'subscriptions', table: 'subscriptions', label: 'Aktif abonelikler', limit: 50 },
  { key: 'entitlements', table: 'user_entitlements', label: 'Kullanıcı hakları', limit: 50 },
  { key: 'partnerBilling', table: 'partner_billing', label: 'Partner faturalama', limit: 50 },
  { key: 'partnerCredits', table: 'partner_lead_credits', label: 'Partner kontörleri', limit: 50 },
  { key: 'webhooks', table: 'payment_webhook_logs', label: 'Webhook logları', limit: 50 }
];

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatRow(row) {
  if (!row || typeof row !== 'object') return '';
  const keys = Object.keys(row).slice(0, 8);
  return keys
    .map((k) => `<td>${esc(typeof row[k] === 'object' ? JSON.stringify(row[k]) : row[k])}</td>`)
    .join('');
}

async function fetchTable(sb, table, limit) {
  const res = await fetchAdminTable(sb, {
    table,
    limit,
    order: { column: 'created_at', ascending: false },
    direct: () => sb.from(table).select('*').order('created_at', { ascending: false }).limit(limit)
  });
  if (res.error && !(res.data || []).length) {
    const message = res.error?.message || String(res.error);
    return { error: message, rows: [], schemaMissing: res.schemaMissing };
  }
  return { rows: res.data || [], schemaMissing: res.schemaMissing };
}

async function fetchProviderStatus(sb) {
  try {
    const { data, error } = await sb.functions.invoke('payment-provider-status', { method: 'GET' });
    if (error || !data?.providers) {
      return fallbackProviderStatus();
    }
    return data.providers;
  } catch {
    return fallbackProviderStatus();
  }
}

function fallbackProviderStatus() {
  return {
    iyzico: { status: 'pending' },
    paytr: { status: 'pending' }
  };
}

function renderProviderCards(providers) {
  const items = [
    { id: 'iyzico', label: 'iyzico (birincil)' },
    { id: 'paytr', label: 'PayTR (yedek)' }
  ];
  return items
    .map(({ id, label }) => {
      const p = providers[id] || { status: 'pending' };
      const statusLabel =
        p.status === 'configured'
          ? 'Yapılandırıldı'
          : p.status === 'passive'
            ? 'Pasif / global hazırlık'
            : 'Beklemede';
      return `
        <article class="admin-payment-provider-card admin-payment-provider-card--${esc(p.status)}">
          <h4>${esc(label)}</h4>
          <p class="admin-payment-provider-status">${esc(statusLabel)}</p>
          ${p.scope ? `<p class="text-muted-sm">${esc(p.scope)}</p>` : ''}
        </article>`;
    })
    .join('');
}

function renderTableSection(label, rows, error, schemaMissing) {
  if (error) {
    const hint = schemaMissing
      ? ' Tablo şemada yok — <code>supabase db push</code> çalıştırın.'
      : '';
    return `<section class="admin-payment-section"><h3>${esc(label)}</h3><p class="empty">${esc(error)}${hint}</p></section>`;
  }
  if (!rows.length) {
    return `<section class="admin-payment-section"><h3>${esc(label)}</h3><p class="empty">Kayıt yok.</p></section>`;
  }
  const headKeys = Object.keys(rows[0]).slice(0, 8);
  return `
    <section class="admin-payment-section">
      <h3>${esc(label)} <span class="text-muted-sm">(${rows.length})</span></h3>
      <div class="table-scroll">
        <table class="admin-table admin-table--compact">
          <thead><tr>${headKeys.map((k) => `<th>${esc(k)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((row) => `<tr>${formatRow(row)}</tr>`).join('')}</tbody>
        </table>
      </div>
    </section>`;
}

/**
 * Admin Payments page loader.
 */
export async function loadPaymentsAdminPage() {
  const root = document.getElementById('payments-admin-root');
  if (!root) return;

  const sb = getSupabaseClient();
  if (!sb) {
    root.innerHTML = '<p class="empty">Supabase yapılandırması eksik.</p>';
    return;
  }

  root.innerHTML = '<p class="empty">Ödeme verileri yükleniyor…</p>';

  const [providers, ...tableResults] = await Promise.all([
    fetchProviderStatus(sb),
    ...TABLES.map((t) => fetchTable(sb, t.table, t.limit))
  ]);

  const sections = TABLES.map((t, i) =>
    renderTableSection(
      t.label,
      tableResults[i].rows,
      tableResults[i].error,
      tableResults[i].schemaMissing
    )
  ).join('');

  root.innerHTML = `
    <div class="admin-payment-providers" role="region" aria-label="Sağlayıcı durumu">
      ${renderProviderCards(providers)}
    </div>
    <p class="text-muted admin-payment-note">Secret değerleri burada gösterilmez. Yapılandırma: Supabase Edge Function Secrets (<code>docs/payments-env.md</code>).</p>
    ${sections}
    <p class="text-muted-sm">TODO: partner_id ↔ auth eşlemesi netleşince partner self-serve kontör satın alma paneli açılacak.</p>
  `;
}
