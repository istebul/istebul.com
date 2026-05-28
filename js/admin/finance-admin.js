import { escapeHtml, safeAttr } from '../core/dom-safe.js';
import { fetchAdminTable, collectAdminWarnings, renderAdminWarningBanner } from './admin-query.js';
import { setAdminRootLoading } from './admin-page-routing.js';

const FINANCE_SETTING_KEYS = [
  'finance_payment_comfort_weight',
  'finance_total_cost_weight',
  'finance_risk_factor',
  'finance_cashflow_weight',
  'finance_ai_prompt_template'
];

const FINANCE_SETTING_DEFAULTS = {
  finance_payment_comfort_weight: '0.30',
  finance_total_cost_weight: '0.23',
  finance_risk_factor: '0.20',
  finance_cashflow_weight: '0.27',
  finance_ai_prompt_template: 'Tahmini analiz dilinde finans karar yorumu üret.'
};

function renderError(el, res, label) {
  const msg = res?.error?.message || res?.error || 'Veri yüklenemedi';
  el.innerHTML = `<p class="empty">${escapeHtml(label)}: ${escapeHtml(String(msg))}</p>`;
}

export function initFinanceAdmin(ctx) {
  const { sb, adminAction, toast } = ctx;
  return {
    loadFinanceLeads: () => loadFinanceLeads(sb, adminAction, toast),
    loadFinancePartners: () => loadFinancePartners(sb),
    loadFinanceScoring: () => loadFinanceScoring(sb),
    handleFinanceAction: (event, el) => handleFinanceAction(event, el, { sb, adminAction, toast })
  };
}

async function loadFinanceLeads(sb, adminAction, toast) {
  const el = document.getElementById('finance-leads-list');
  if (!el) return;
  setAdminRootLoading('finance-leads-list');
  const res = await fetchAdminTable(sb, {
    table: 'finance_leads',
    limit: 1500,
    order: { column: 'created_at', ascending: false },
    direct: () => sb.from('finance_leads').select('*').order('created_at', { ascending: false }).limit(1500)
  });
  if (res.error && !res.data?.length) return renderError(el, res, 'Finans leadleri');
  const warnings = renderAdminWarningBanner(collectAdminWarnings([res]));
  const search = (document.getElementById('finance-leads-search')?.value || '').toLowerCase().trim();
  const status = document.getElementById('finance-leads-status-filter')?.value || '';
  const rows = (res.data || []).filter((row) => {
    if (status && row.status !== status) return false;
    if (!search) return true;
    return [row.full_name, row.email, row.phone, row.finance_purpose, row.ai_summary]
      .filter(Boolean).join(' ').toLowerCase().includes(search);
  });
  if (!rows.length) {
    el.innerHTML = `${warnings}<p class="empty">Filtreye uygun finans lead kaydı yok.</p>`;
    return;
  }
  el.innerHTML = `${warnings}<table class="table"><thead><tr>
    <th>Tarih</th><th>Amaç</th><th>Kredi</th><th>Peşinat</th><th>Vade</th><th>Gelir</th><th>Gider</th><th>Risk</th><th>Skor</th><th>AI sonucu</th><th>Durum</th>
  </tr></thead><tbody>${
    rows.map((r) => `<tr>
      <td class="cell-nowrap">${new Date(r.created_at).toLocaleString('tr-TR')}</td>
      <td>${escapeHtml(r.finance_purpose || '—')}</td>
      <td>${escapeHtml(String(r.loan_amount || '—'))}</td>
      <td>${escapeHtml(String(r.down_payment || '—'))}</td>
      <td>${escapeHtml(String(r.term_months || '—'))}</td>
      <td>${escapeHtml(String(r.monthly_income || '—'))}</td>
      <td>${escapeHtml(String(r.fixed_expenses || '—'))}</td>
      <td>${escapeHtml(r.risk_level || '—')}</td>
      <td><strong>${escapeHtml(String(r.decision_score || '—'))}</strong></td>
      <td>${escapeHtml((r.ai_summary || '—').slice(0, 120))}</td>
      <td><select class="status-select" data-action="finance-update-status" data-id="${safeAttr(r.id)}">
        ${['new', 'incelendi', 'arandi', 'uygun', 'partnere_yonlendirildi', 'kapandi', 'reddedildi'].map((s) => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select></td>
    </tr>`).join('')
  }</tbody></table>`;

  el.querySelectorAll('[data-action="finance-update-status"]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      await adminAction({ action: 'update', table: 'finance_leads', id: sel.dataset.id, values: { status: sel.value } });
      toast('Finans lead durumu güncellendi');
    });
  });
}

async function loadFinancePartners(sb) {
  const el = document.getElementById('finance-partners-list');
  if (!el) return;
  setAdminRootLoading('finance-partners-list');
  const res = await fetchAdminTable(sb, {
    table: 'finance_partners',
    limit: 600,
    order: { column: 'created_at', ascending: false },
    direct: () => sb.from('finance_partners').select('*').order('created_at', { ascending: false }).limit(600)
  });
  if (res.error && !res.data?.length) return renderError(el, res, 'Finans partnerleri');
  const warnings = renderAdminWarningBanner(collectAdminWarnings([res]));
  el.innerHTML = `${warnings}<table class="table"><thead><tr><th>Kuruluş</th><th>Ürün tipi</th><th>Tutar aralığı</th><th>Vade aralığı</th><th>Oran aralığı</th><th>Link</th><th>Durum</th></tr></thead><tbody>${
    (res.data || []).map((r) => `<tr>
      <td>${escapeHtml(r.institution_name || '—')}</td>
      <td>${escapeHtml(r.product_type || '—')}</td>
      <td>${escapeHtml(String(r.min_amount || 0))} - ${escapeHtml(String(r.max_amount || 0))}</td>
      <td>${escapeHtml(String(r.min_term || 0))} - ${escapeHtml(String(r.max_term || 0))}</td>
      <td>${escapeHtml(r.rate_range || '—')}</td>
      <td>${r.affiliate_link ? `<a href="${safeAttr(r.affiliate_link)}" target="_blank" rel="noopener">link</a>` : '—'}</td>
      <td>${r.is_active ? 'Aktif' : 'Pasif'}</td>
    </tr>`).join('')
  }</tbody></table>`;
}

async function loadFinanceScoring(sb) {
  const res = await fetchAdminTable(sb, {
    table: 'site_settings',
    limit: 600,
    direct: () => sb.from('site_settings').select('key,value')
  });
  const map = { ...FINANCE_SETTING_DEFAULTS };
  (res.data || []).forEach((row) => {
    if (FINANCE_SETTING_KEYS.includes(row.key)) map[row.key] = row.value;
  });
  FINANCE_SETTING_KEYS.forEach((key) => {
    const input = document.getElementById(`fs-${key}`);
    if (input) input.value = map[key] || '';
  });
}

async function saveFinanceSettings(adminAction, toast) {
  const values = FINANCE_SETTING_KEYS.map((key) => ({ key, value: document.getElementById(`fs-${key}`)?.value || '' }));
  await adminAction({ action: 'upsert_settings', table: 'site_settings', id: 'finance-settings', values });
  toast('Finans scoring ayarları kaydedildi');
}

async function handleFinanceAction(_event, el, ctx) {
  const { action } = el.dataset;
  const { sb, adminAction, toast } = ctx;
  if (action === 'save-finance-settings') {
    await saveFinanceSettings(adminAction, toast);
    return true;
  }
  if (action === 'finance-save-partner') {
    await adminAction({
      action: 'insert',
      table: 'finance_partners',
      id: 'new',
      values: {
        institution_name: document.getElementById('finance-partner-name')?.value?.trim() || '',
        product_type: document.getElementById('finance-partner-product')?.value?.trim() || '',
        min_amount: Number(document.getElementById('finance-partner-min-amount')?.value) || 0,
        max_amount: Number(document.getElementById('finance-partner-max-amount')?.value) || 0,
        min_term: Number(document.getElementById('finance-partner-min-term')?.value) || 0,
        max_term: Number(document.getElementById('finance-partner-max-term')?.value) || 0,
        rate_range: document.getElementById('finance-partner-rate')?.value?.trim() || '',
        affiliate_link: document.getElementById('finance-partner-link')?.value?.trim() || '',
        is_active: document.getElementById('finance-partner-active')?.checked ?? true,
        notes: document.getElementById('finance-partner-notes')?.value?.trim() || ''
      }
    });
    toast('Finans partneri kaydedildi');
    loadFinancePartners(sb);
    return true;
  }
  return false;
}
