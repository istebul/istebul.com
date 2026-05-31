/**
 * Resilient admin data access — admin-action first, direct Supabase fallback.
 */
import { adminList } from '../core/admin-client.js';

export function isSchemaMissingError(error) {
  if (!error) return false;
  const msg = String(error.message || error.details || '').toLowerCase();
  return (
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    (msg.includes('does not exist') &&
      (msg.includes('relation') ||
        msg.includes('table') ||
        msg.includes('column')))
  );
}

function isMissingColumnInSelect(error) {
  if (!error) return false;
  const msg = String(error.message || error.details || '').toLowerCase();
  return msg.includes('column') && msg.includes('does not exist');
}

const ADMIN_DIRECT_FETCH_MS = 12_000;

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} [ms]
 */
async function withAdminFetchTimeout(promise, ms = ADMIN_DIRECT_FETCH_MS) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('Supabase isteği zaman aşımına uğradı')),
      ms
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Columns guaranteed by 20260518_partner_applications.sql */
export const PARTNER_APPLICATIONS_BASE_SELECT =
  'id, created_at, company_name, contact_name, phone, email, city, category, lead_capacity, webhook_ready, status, notes';

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {{ table: string, select?: string, limit?: number, order?: { column: string, ascending?: boolean }, direct?: (selectExpr?: string) => Promise<{ data?: unknown[] | unknown | null, error?: { message?: string } | null }>, preferDirect?: boolean }} options
 */
export async function fetchAdminTable(sb, options) {
  const { table, select, limit = 500, order, direct, preferDirect = false } = options;
  let adminError = null;

  if (!preferDirect) {
    try {
      const data = await adminList(sb, { table, select, limit, order });
      return {
        data: data || [],
        error: null,
        source: 'admin-action',
        table
      };
    } catch (err) {
      adminError = err;
    }
  }

  if (typeof direct !== 'function') {
    return {
      data: [],
      error: adminError,
      source: 'failed',
      table,
      schemaMissing: isSchemaMissingError(adminError)
    };
  }

  const runDirect = (expr) => {
    if (expr === undefined || expr === null) {
      return direct();
    }
    return direct(expr);
  };

  let directError = adminError;
  let res;
  try {
    res =
      select && select !== '*'
        ? await withAdminFetchTimeout(runDirect(select))
        : await withAdminFetchTimeout(runDirect());
  } catch (timeoutErr) {
    directError = timeoutErr;
    res = { data: [], error: timeoutErr };
  }

  if (res?.error && isMissingColumnInSelect(res.error)) {
    res = await withAdminFetchTimeout(runDirect('*'));
  }
  if (res?.error && isMissingColumnInSelect(res.error) && table === 'partner_applications') {
    res = await withAdminFetchTimeout(runDirect(PARTNER_APPLICATIONS_BASE_SELECT));
  }

  if (res && !res.error) {
    const rows = Array.isArray(res.data) ? res.data : res.data ? [res.data] : [];
    return {
      data: rows,
      error: null,
      source: 'direct',
      table,
      adminError: adminError?.message || null
    };
  }

  directError = res?.error || directError;

  return {
    data: [],
    error: directError || adminError,
    source: 'failed',
    table,
    schemaMissing: isSchemaMissingError(directError || adminError),
    adminError: adminError?.message || null,
    directError: directError?.message || String(directError || '')
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {{ table: string, id: string, select?: string, limit?: number }} options
 */
export async function fetchAdminRowById(sb, options) {
  const { table, id, select = '*', limit = 5000 } = options;
  const res = await fetchAdminTable(sb, {
    table,
    select,
    limit,
    direct: (expr) =>
      sb.from(table).select(expr || select).eq('id', id).maybeSingle()
  });
  if (res.error) {
    return { data: null, error: res.error, source: res.source, table };
  }
  const row = (res.data || []).find((entry) => entry?.id === id) || null;
  return { data: row, error: row ? null : res.error, source: res.source, table };
}

/**
 * Critical issues only (failed reads or missing schema with no data).
 * @param {Array<{ table: string, error?: { message?: string } | null, source?: string, data?: unknown[], schemaMissing?: boolean, directError?: string | null, adminError?: string | null }>} results
 */
export function collectAdminWarnings(results) {
  const lines = [];
  for (const r of results) {
    if (r.error) {
      const detail = r.error.message || r.error;
      const hint = r.adminError ? ` (admin-action: ${r.adminError})` : '';
      lines.push(`${r.table}: ${detail}${hint}`);
      continue;
    }
    if (
      r.schemaMissing &&
      (!r.data || r.data.length === 0) &&
      r.source !== 'direct'
    ) {
      lines.push(
        `${r.table}: tablo şemada yok — supabase db push (20260617_lifecycle_crm_schema_repair.sql)`
      );
    }
  }
  return lines;
}

/**
 * Successful fallback reads — informational, not an error.
 * @param {Array<{ table: string, error?: unknown, source?: string, data?: unknown[], adminError?: string | null, directError?: string | null, schemaMissing?: boolean }>} results
 */
export function collectAdminFallbackNotes(results) {
  const lines = [];
  for (const r of results) {
    if (r.error) continue;
    if (
      r.source === 'admin-action' &&
      r.directError &&
      !r.schemaMissing &&
      r.data?.length
    ) {
      lines.push(`${r.table}: direct query unavailable — loaded via admin-action`);
    }
    if (r.source === 'direct' && r.adminError && !r.schemaMissing) {
      lines.push(`${r.table}: doğrudan Supabase okuması kullanıldı`);
    }
  }
  return lines;
}

export function renderAdminWarningBanner(warnings = []) {
  if (!warnings.length) return '';
  return `
    <div class="admin-schema-banner" role="alert" style="margin:0 0 16px;padding:12px 14px;border-radius:8px;background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.35);font-size:13px;line-height:1.5">
      <strong>Veri kaynağı uyarısı</strong>
      <ul style="margin:8px 0 0;padding-left:18px">
        ${warnings.map((w) => `<li>${escapeHtmlAdmin(w)}</li>`).join('')}
      </ul>
      <p style="margin:8px 0 0" class="text-muted-sm">Eksik tablolar için: <code>supabase db push</code> (migrations) ve <code>admin-action</code> edge deploy.</p>
    </div>
  `;
}

export function renderAdminFallbackInfoBanner(notes = []) {
  if (!notes.length) return '';
  return `
    <div class="admin-schema-banner" role="status" style="margin:0 0 16px;padding:12px 14px;border-radius:8px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);font-size:13px;line-height:1.5">
      <strong>Veri kaynağı</strong>
      <ul style="margin:8px 0 0;padding-left:18px">
        ${notes.map((n) => `<li>${escapeHtmlAdmin(n)}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * Warning + informational banners for a batch of fetchAdminTable results.
 * @param {Parameters<typeof collectAdminWarnings>[0]} results
 */
export function renderAdminDataSourceNotices(results) {
  return (
    renderAdminWarningBanner(collectAdminWarnings(results)) +
    renderAdminFallbackInfoBanner(collectAdminFallbackNotes(results))
  );
}

function escapeHtmlAdmin(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
