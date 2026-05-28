import { escapeHtml, safeAttr } from '../core/dom-safe.js';
import { fetchAdminTable, collectAdminWarnings, renderAdminWarningBanner } from './admin-query.js';
import { setAdminRootLoading } from './admin-page-routing.js';

const HOUSING_SETTING_KEYS = [
  'housing_payment_weight',
  'housing_location_weight',
  'housing_risk_factor',
  'housing_investment_weight',
  'housing_total_cost_weight',
  'housing_ai_prompt_template'
];

const HOUSING_SETTING_DEFAULTS = {
  housing_payment_weight: '0.25',
  housing_location_weight: '0.2',
  housing_risk_factor: '0.25',
  housing_investment_weight: '0.15',
  housing_total_cost_weight: '0.15',
  housing_ai_prompt_template: 'Tahmini analiz diliyle kısa karar yorumu üret.'
};

function renderLoadError(el, res, label) {
  const msg = res?.error?.message || res?.error || 'Veri yüklenemedi';
  el.innerHTML = `<p class="empty">${escapeHtml(label)}: ${escapeHtml(String(msg))}</p>`;
}

export function initHousingAdmin(ctx) {
  const { sb, adminAction, toast } = ctx;
  return {
    loadHousingLeads: () => loadHousingLeads(sb, adminAction, toast),
    loadHousingLocations: () => loadHousingLocations(sb),
    loadHousingPartners: () => loadHousingPartners(sb),
    loadHousingSettings: () => loadHousingSettings(sb),
    handleHousingAction: (event, el) => handleHousingAction(event, el, { sb, adminAction, toast })
  };
}

async function loadHousingLeads(sb, adminAction, toast) {
  const el = document.getElementById('housing-leads-list');
  if (!el) return;
  setAdminRootLoading('housing-leads-list');
  const res = await fetchAdminTable(sb, {
    table: 'housing_leads',
    limit: 1200,
    order: { column: 'created_at', ascending: false },
    direct: () => sb.from('housing_leads').select('*').order('created_at', { ascending: false }).limit(1200)
  });
  if (res.error && !res.data?.length) return renderLoadError(el, res, 'Konut leadleri');
  const banner = renderAdminWarningBanner(collectAdminWarnings([res]));
  const search = (document.getElementById('housing-leads-search')?.value || '').toLowerCase().trim();
  const status = document.getElementById('housing-leads-status-filter')?.value || '';
  const rows = (res.data || []).filter((row) => {
    if (status && row.status !== status) return false;
    if (!search) return true;
    return [row.full_name, row.email, row.phone, row.location_text, row.housing_purpose, row.housing_type]
      .filter(Boolean).join(' ').toLowerCase().includes(search);
  });
  if (!rows.length) {
    el.innerHTML = `${banner}<p class="empty">Filtreye uygun kayıt bulunamadı.</p>`;
    return;
  }
  el.innerHTML = `${banner}<table class="table"><thead><tr>
    <th>Tarih</th><th>Ad</th><th>Telefon</th><th>E-posta</th><th>Amaç</th><th>Tip</th><th>Bütçe</th>
    <th>Peşinat</th><th>Kredi</th><th>Gelir</th><th>Vade</th><th>Lokasyon</th><th>Öncelikler</th><th>AI sonucu</th><th>Skor</th><th>Durum</th>
  </tr></thead><tbody>${
    rows.map((row) => `<tr>
      <td class="cell-nowrap">${new Date(row.created_at).toLocaleString('tr-TR')}</td>
      <td>${escapeHtml(row.full_name || '—')}</td>
      <td>${escapeHtml(row.phone || '—')}</td>
      <td>${escapeHtml(row.email || '—')}</td>
      <td>${escapeHtml(row.housing_purpose || '—')}</td>
      <td>${escapeHtml(row.housing_type || '—')}</td>
      <td>${escapeHtml(String(row.total_budget || '—'))}</td>
      <td>${escapeHtml(String(row.down_payment || '—'))}</td>
      <td>${escapeHtml(String(row.loan_amount || '—'))}</td>
      <td>${escapeHtml(String(row.monthly_income || '—'))}</td>
      <td>${escapeHtml(String(row.term_months || '—'))}</td>
      <td>${escapeHtml(row.location_text || '—')}</td>
      <td>${escapeHtml(row.priorities || '—')}</td>
      <td>${escapeHtml((row.ai_summary || '—').slice(0, 120))}</td>
      <td><strong>${escapeHtml(String(row.decision_score || '—'))}</strong></td>
      <td><select class="status-select" data-action="housing-update-status" data-id="${safeAttr(row.id)}">
        ${['new', 'incelendi', 'arandi', 'uygun', 'partnere_yonlendirildi', 'kapandi', 'reddedildi'].map((opt) => `<option value="${opt}" ${row.status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
      </select></td>
    </tr>`).join('')
  }</tbody></table>`;
  el.querySelectorAll('[data-action="housing-update-status"]').forEach((select) => {
    select.addEventListener('change', async () => {
      await adminAction({ action: 'update', table: 'housing_leads', id: select.dataset.id, values: { status: select.value } });
      toast('Konut lead durumu güncellendi');
    });
  });
}

async function loadHousingLocations(sb) {
  const el = document.getElementById('housing-locations-list');
  if (!el) return;
  setAdminRootLoading('housing-locations-list');
  const res = await fetchAdminTable(sb, {
    table: 'housing_locations',
    limit: 600,
    order: { column: 'created_at', ascending: false },
    direct: () => sb.from('housing_locations').select('*').order('created_at', { ascending: false }).limit(600)
  });
  if (res.error && !res.data?.length) return renderLoadError(el, res, 'Konut lokasyonları');
  const banner = renderAdminWarningBanner(collectAdminWarnings([res]));
  el.innerHTML = `${banner}<table class="table"><thead><tr><th>Şehir</th><th>İlçe/Semt</th><th>Fiyat seviyesi</th><th>Ulaşım</th><th>Yaşam kalitesi</th><th>Yatırım</th><th>Risk</th><th>Durum</th></tr></thead><tbody>${
    (res.data || []).map((row) => `<tr>
      <td>${escapeHtml(row.city || '—')}</td>
      <td>${escapeHtml(row.district || '—')}</td>
      <td>${escapeHtml(String(row.avg_price_level || '—'))}</td>
      <td>${escapeHtml(String(row.transport_score || '—'))}</td>
      <td>${escapeHtml(String(row.life_quality_score || '—'))}</td>
      <td>${escapeHtml(String(row.investment_score || '—'))}</td>
      <td>${escapeHtml(String(row.risk_score || '—'))}</td>
      <td>${row.is_active ? 'Aktif' : 'Pasif'}</td>
    </tr>`).join('')
  }</tbody></table>`;
}

async function loadHousingPartners(sb) {
  const el = document.getElementById('housing-partners-list');
  if (!el) return;
  setAdminRootLoading('housing-partners-list');
  const res = await fetchAdminTable(sb, {
    table: 'housing_partners',
    limit: 500,
    order: { column: 'created_at', ascending: false },
    direct: () => sb.from('housing_partners').select('*').order('created_at', { ascending: false }).limit(500)
  });
  if (res.error && !res.data?.length) return renderLoadError(el, res, 'Konut partnerleri');
  const banner = renderAdminWarningBanner(collectAdminWarnings([res]));
  el.innerHTML = `${banner}<table class="table"><thead><tr><th>Partner</th><th>Tip</th><th>Şehir</th><th>İlçe</th><th>Link</th><th>Komisyon notu</th><th>Durum</th></tr></thead><tbody>${
    (res.data || []).map((row) => `<tr>
      <td>${escapeHtml(row.partner_name || '—')}</td>
      <td>${escapeHtml(row.partner_type || '—')}</td>
      <td>${escapeHtml(row.city || '—')}</td>
      <td>${escapeHtml(row.district || '—')}</td>
      <td>${row.contact_link ? `<a href="${safeAttr(row.contact_link)}" target="_blank" rel="noopener">link</a>` : '—'}</td>
      <td>${escapeHtml(row.commission_note || '—')}</td>
      <td>${row.is_active ? 'Aktif' : 'Pasif'}</td>
    </tr>`).join('')
  }</tbody></table>`;
}

async function loadHousingSettings(sb) {
  const res = await fetchAdminTable(sb, {
    table: 'site_settings',
    limit: 600,
    direct: () => sb.from('site_settings').select('key,value')
  });
  const map = { ...HOUSING_SETTING_DEFAULTS };
  (res.data || []).forEach((row) => {
    if (HOUSING_SETTING_KEYS.includes(row.key)) map[row.key] = row.value;
  });
  HOUSING_SETTING_KEYS.forEach((key) => {
    const input = document.getElementById(`hs-${key}`);
    if (input) input.value = map[key] || '';
  });
}

async function saveHousingSettings(adminAction, toast) {
  const values = HOUSING_SETTING_KEYS.map((key) => ({ key, value: document.getElementById(`hs-${key}`)?.value || '' }));
  await adminAction({ action: 'upsert_settings', table: 'site_settings', id: 'housing-settings', values });
  toast('Konut scoring ayarları kaydedildi');
}

async function handleHousingAction(_event, el, ctx) {
  const { action } = el.dataset;
  const { adminAction, toast, sb } = ctx;
  if (action === 'save-housing-settings') {
    await saveHousingSettings(adminAction, toast);
    return true;
  }
  if (action === 'housing-save-location') {
    await adminAction({
      action: 'insert',
      table: 'housing_locations',
      id: 'new',
      values: {
        city: document.getElementById('housing-location-city')?.value?.trim() || '',
        district: document.getElementById('housing-location-district')?.value?.trim() || '',
        avg_price_level: Number(document.getElementById('housing-location-price')?.value) || 0,
        transport_score: Number(document.getElementById('housing-location-transport')?.value) || 0,
        life_quality_score: Number(document.getElementById('housing-location-life')?.value) || 0,
        investment_score: Number(document.getElementById('housing-location-invest')?.value) || 0,
        risk_score: Number(document.getElementById('housing-location-risk')?.value) || 0,
        is_active: document.getElementById('housing-location-active')?.checked ?? true,
        notes: document.getElementById('housing-location-notes')?.value?.trim() || ''
      }
    });
    toast('Konut lokasyonu kaydedildi');
    loadHousingLocations(sb);
    return true;
  }
  if (action === 'housing-save-partner') {
    await adminAction({
      action: 'insert',
      table: 'housing_partners',
      id: 'new',
      values: {
        partner_name: document.getElementById('housing-partner-name')?.value?.trim() || '',
        partner_type: document.getElementById('housing-partner-type')?.value?.trim() || '',
        city: document.getElementById('housing-partner-city')?.value?.trim() || '',
        district: document.getElementById('housing-partner-district')?.value?.trim() || '',
        contact_link: document.getElementById('housing-partner-link')?.value?.trim() || '',
        commission_note: document.getElementById('housing-partner-commission')?.value?.trim() || '',
        notes: document.getElementById('housing-partner-notes')?.value?.trim() || '',
        is_active: document.getElementById('housing-partner-active')?.checked ?? true
      }
    });
    toast('Konut partneri kaydedildi');
    loadHousingPartners(sb);
    return true;
  }
  return false;
}
