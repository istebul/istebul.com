/**
 * Resilient admin data access — direct Supabase + admin-action fallback.
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
 * @param {{ table: string, select?: string, limit?: number, order?: { column: string, ascending?: boolean }, direct?: () => Promise<{ data?: unknown[], error?: { message?: string } | null }> }} options
 */
export async function fetchAdminTable(sb, options) {
  const { table, select, limit = 500, order, direct } = options;
  let directError = null;

  if (typeof direct === 'function') {
    const runDirect = (expr) => {
      if (expr === undefined || expr === null) {
        return direct();
      }
      return direct(expr);
    };

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
      return {
        data: res.data || [],
        error: null,
        source: 'direct',
        table
      };
    }
    directError = res?.error || directError;
  }

  const fallbackSelect = select && select !== '*' ? '*' : select;

  try {
    const data = await adminList(sb, { table, select: fallbackSelect, limit, order });
    return {
      data,
      error: null,
      source: 'admin-action',
      table,
      directError: directError?.message || null
    };
  } catch (adminError) {
    return {
      data: [],
      error: directError || adminError,
      source: 'failed',
      table
    };
  }
}

/**
 * @param {Array<{ table: string, error?: { message?: string } | null, source?: string }>} results
 */
export function collectAdminWarnings(results) {
  const lines = [];
  for (const r of results) {
    if (r.error) {
      lines.push(`${r.table}: ${r.error.message || r.error}`);
    } else if (r.source === 'admin-action' && r.directError) {
      lines.push(`${r.table}: direct query unavailable — loaded via admin-action`);
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

function escapeHtmlAdmin(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
