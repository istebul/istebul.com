/**
 * isteBul AI Listings — internal admin test panel (Sprint-7 QA workflow).
 *
 * INTERNAL TEST ONLY. Not linked from homepage, categories, or admin nav.
 * approved means internally approved only; public publishing remains disabled.
 *
 * Enable locally: localStorage.setItem('istebul_ai_listings_admin', 'on')
 * Set secret: localStorage.setItem('istebul_ai_listings_secret', '<AI_LISTINGS_EDGE_SECRET>')
 */

import {
  ADMIN_ENABLE_KEY,
  ADMIN_SECRET_KEY,
  buildEdgeRequestHeaders,
  buildImportPreviewHtml,
  buildListingBadgesHtml,
  buildPremiumDashboardHtml,
  buildStatusFilterChipsHtml,
  getAdminPanelState,
  getCategoryLabelTr,
  getEdgeSecret,
  getListingAnalyzePath,
  getStatusLabelTr,
  getSupabaseAnonKey,
  mapEdgeResponse,
  previewImportContent,
  resolveActiveStatusFilter,
  resolveEdgeBaseUrl,
  resolveImportAnalyzeFlag,
  safeRenderText,
  translateAdminErrorMessage,
  validateAttributesJson,
  validateSourceUrl
} from './ai-listings-admin-core.js';

/** @type {Record<string, unknown>|null} */
let selectedListing = null;

/** @type {string} */
let activeStatusFilter = '';

/** @type {number} */
let importValidRowCount = 0;

function $(id) {
  return document.getElementById(id);
}

function env() {
  return typeof window !== 'undefined' ? window.__env || {} : {};
}

function storage() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function setStatus(message, type = 'info') {
  const el = $('ai-listings-status');
  if (!el) return;
  el.className = `ai-listings-admin__status ai-listings-admin__status--${type}`;
  el.textContent = message;
}

async function edgeRequest(path, { method = 'GET', body } = {}) {
  const base = resolveEdgeBaseUrl(env());
  const secret = getEdgeSecret(storage());
  const anonKey = getSupabaseAnonKey(env());

  if (!base) {
    return { ok: false, status: 0, message: 'env.js içinde SUPABASE_URL yapılandırılmamış' };
  }
  if (!anonKey) {
    return { ok: false, status: 0, message: 'Supabase anon key eksik' };
  }
  if (!secret) {
    return {
      ok: false,
      status: 0,
      message: 'Edge secret eksik — localStorage istebul_ai_listings_secret ayarlayın'
    };
  }

  const response = await fetch(`${base}${path}`, {
    method,
    headers: buildEdgeRequestHeaders({ secret, anonKey, hasBody: body !== undefined }),
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const json = await response.json().catch(() => ({}));
  const mapped = mapEdgeResponse(response, json);
  if (!mapped.ok) {
    return { ...mapped, message: translateAdminErrorMessage(mapped.message) };
  }
  return mapped;
}

function renderDisabledState() {
  const root = $('ai-listings-admin-root');
  if (!root) return;
  root.innerHTML = `
    <div class="ai-listings-admin__gate">
      <h2>Yapay Zeka Destekli İlanlar — Devre Dışı</h2>
      <p>Bu iç test paneli varsayılan olarak gizlidir.</p>
      <pre class="ai-listings-admin__code">localStorage.setItem('${ADMIN_ENABLE_KEY}', 'on')</pre>
      <p>Etkinleştirdikten sonra sayfayı yenileyin. Bkz. docs/ai-listings/ADMIN_TEST_PANEL.md</p>
    </div>`;
}

function renderSecretWarning() {
  const warn = $('ai-listings-secret-warning');
  if (!warn) return;
  warn.hidden = false;
  warn.innerHTML = `
    <strong>Kurulum gerekli:</strong>
    <code>localStorage.${ADMIN_SECRET_KEY}</code> değerini
    <code>AI_LISTINGS_EDGE_SECRET</code> ile ayarlayın, ardından yenileyin.
    <pre class="ai-listings-admin__code">localStorage.setItem('${ADMIN_SECRET_KEY}', '&lt;secret&gt;')</pre>`;
}

function renderStatusFilterChips() {
  const container = $('ai-listings-status-filters');
  if (!container) return;
  container.innerHTML = buildStatusFilterChipsHtml(activeStatusFilter);
  container.querySelectorAll('[data-status-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      activeStatusFilter = resolveActiveStatusFilter(chip.getAttribute('data-status-filter'));
      renderStatusFilterChips();
      loadListings();
    });
  });
}

function renderListingRow(listing) {
  const id = safeRenderText(listing.id);
  const title = safeRenderText(listing.title);
  const category = safeRenderText(getCategoryLabelTr(listing.category));
  const status = safeRenderText(getStatusLabelTr(listing.status));
  const sourceType = safeRenderText(listing.source_type ?? '—');

  return `
    <button type="button" class="ai-listings-admin__list-item" data-listing-id="${id}">
      <span class="ai-listings-admin__list-title">${title}</span>
      <span class="ai-listings-admin__list-badges">${buildListingBadgesHtml(listing)}</span>
      <span class="ai-listings-admin__list-meta">${category} · ${status} · ${sourceType}</span>
    </button>`;
}

async function autoAnalyzeListing(listing) {
  const listingId = String(listing?.id ?? '').trim();
  if (!listingId) return { ok: false, message: 'İlan kimliği bulunamadı.' };

  setStatus('Analiz çalıştırılıyor…', 'info');
  const result = await edgeRequest(getListingAnalyzePath(listingId), { method: 'POST' });
  if (!result.ok) {
    setStatus(result.message, 'error');
    return result;
  }

  setStatus('Analiz tamamlandı.', 'success');
  await loadListings();
  await showListingDetail(listing);
  return result;
}

function handlePdfExport(listing, analysis) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    setStatus('PDF penceresi açılamadı. Pop-up engelleyiciyi kontrol edin.', 'error');
    return;
  }

  const title = String(listing.title ?? 'İlan Raporu');
  const summary = String(analysis?.summary ?? 'Analiz özeti mevcut değil.');
  const aiScore = analysis?.ai_score ?? '—';
  const riskScore = analysis?.risk_score ?? '—';

  printWindow.document.write(`<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>${title} — AI Rapor</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 2rem; color: #111; }
  h1 { font-size: 1.5rem; } .meta { color: #666; font-size: 0.875rem; }
  .scores { display: flex; gap: 1.5rem; margin: 1rem 0; }
  .score { font-size: 1.25rem; font-weight: 600; }
</style></head><body>
<h1>${title}</h1>
<p class="meta">isteBul AI Listings — İç Rapor</p>
<div class="scores">
  <div class="score">AI Skoru: ${aiScore}</div>
  <div class="score">Risk: ${riskScore}</div>
</div>
<p>${summary}</p>
<p class="meta">Oluşturulma: ${new Date().toLocaleString('tr-TR')}</p>
<script>window.onload = () => { window.print(); }<\/script>
</body></html>`);
  printWindow.document.close();
  setStatus('PDF raporu hazırlandı.', 'success');
}

async function loadListings() {
  const listEl = $('ai-listings-list');
  if (!listEl) return;

  const params = new URLSearchParams();
  const category = $('ai-listings-filter-category')?.value?.trim();
  const sourceType = $('ai-listings-filter-source')?.value?.trim();
  const limit = $('ai-listings-filter-limit')?.value?.trim();
  if (category) params.set('category', category);
  if (activeStatusFilter) params.set('status', activeStatusFilter);
  if (sourceType) params.set('source_type', sourceType);
  if (limit) params.set('limit', limit);

  const query = params.toString() ? `?${params.toString()}` : '';
  listEl.innerHTML = '<p class="ai-listings-admin__muted">Yükleniyor…</p>';

  const result = await edgeRequest(`/listings${query}`);
  if (!result.ok) {
    listEl.innerHTML = `<p class="ai-listings-admin__error">${safeRenderText(result.message)}</p>`;
    setStatus(result.message, 'error');
    return;
  }

  const listings = /** @type {Array<Record<string, unknown>>} */ (result.data?.listings ?? []);
  if (!listings.length) {
    listEl.innerHTML = '<p class="ai-listings-admin__muted">İlan bulunamadı.</p>';
    return;
  }

  listEl.innerHTML = listings.map(renderListingRow).join('');
  listEl.querySelectorAll('[data-listing-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-listing-id');
      const listing = listings.find((item) => String(item.id) === id);
      if (listing) showListingDetail(listing);
    });
  });
  setStatus(`${listings.length} ilan yüklendi.`, 'success');
}

async function showListingDetail(listing) {
  selectedListing = listing;
  const detailEl = $('ai-listings-detail');
  if (!detailEl) return;

  const id = String(listing.id);
  detailEl.innerHTML = '<p class="ai-listings-admin__muted">Detay yükleniyor…</p>';

  const [detailRes, eventsRes] = await Promise.all([
    edgeRequest(`/listings/${id}`),
    edgeRequest(`/listings/${id}/events`)
  ]);

  if (!detailRes.ok) {
    detailEl.innerHTML = `<p class="ai-listings-admin__error">${safeRenderText(detailRes.message)}</p>`;
    return;
  }

  const data = /** @type {Record<string, unknown>} */ (detailRes.data ?? {});
  const listingData = /** @type {Record<string, unknown>} */ (data.listing ?? listing);
  const latest = /** @type {Record<string, unknown>|null} */ (data.latest_analysis ?? null);
  const events = /** @type {Array<Record<string, unknown>>} */ (
    eventsRes.ok ? eventsRes.data?.events ?? [] : []
  );
  const status = String(listingData.status ?? 'draft');

  detailEl.innerHTML = `
    ${buildPremiumDashboardHtml(listingData, latest, events, status)}
    <div id="ai-listings-reject-form" class="ai-listings-admin__reject-form" hidden>
      <label>
        Red nedeni
        <textarea id="ai-listings-reject-reason" rows="3" placeholder="Bu ilanın neden reddedildiğini açıklayın"></textarea>
      </label>
      <button type="button" id="ai-listings-confirm-reject-btn" class="ai-listings-admin__btn ai-listings-admin__btn--warn">Reddi onayla</button>
      <button type="button" id="ai-listings-cancel-reject-btn" class="ai-listings-admin__btn ai-listings-admin__btn--ghost">İptal</button>
    </div>`;

  detailEl.querySelectorAll('[data-qa-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-qa-action');
      if (!action) return;
      if (action === 'reject') {
        $('ai-listings-reject-form')?.removeAttribute('hidden');
        return;
      }
      if (action === 'pdf') {
        handlePdfExport(listingData, latest);
        return;
      }
      runQaAction(id, action);
    });
  });
  $('ai-listings-confirm-reject-btn')?.addEventListener('click', () => {
    const reason = $('ai-listings-reject-reason')?.value?.trim() ?? '';
    if (!reason) {
      setStatus('Red nedeni zorunludur.', 'error');
      return;
    }
    runQaAction(id, 'reject', { reason });
  });
  $('ai-listings-cancel-reject-btn')?.addEventListener('click', () => {
    $('ai-listings-reject-form')?.setAttribute('hidden', '');
    const reasonEl = $('ai-listings-reject-reason');
    if (reasonEl) reasonEl.value = '';
  });
}

async function runQaAction(id, action, body) {
  const labels = {
    'submit-review': 'İncelemeye gönderiliyor',
    approve: 'Onaylanıyor',
    reject: 'Reddediliyor',
    archive: 'Arşivleniyor',
    reanalyze: 'Yeniden analiz ediliyor'
  };
  setStatus(`${labels[action] ?? 'İşleniyor'}…`, 'info');

  const result = await edgeRequest(`/listings/${id}/${action}`, {
    method: 'POST',
    body
  });

  if (!result.ok) {
    setStatus(result.message, 'error');
    return;
  }

  setStatus(`${labels[action] ?? 'İşlem'} tamamlandı.`, 'success');
  const updated = result.data?.listing;
  if (updated) {
    selectedListing = updated;
    await showListingDetail(updated);
  } else if (selectedListing) {
    await showListingDetail(selectedListing);
  }
  await loadListings();
}

async function handleCreateSubmit(event) {
  event.preventDefault();
  const category = $('ai-listings-create-category')?.value?.trim();
  const title = $('ai-listings-create-title')?.value?.trim();
  const description = $('ai-listings-create-description')?.value?.trim();
  const priceRaw = $('ai-listings-create-price')?.value?.trim();
  const currency = $('ai-listings-create-currency')?.value?.trim() || 'TRY';
  const sourceUrl = $('ai-listings-create-source-url')?.value?.trim();
  const attributesText = $('ai-listings-create-attributes')?.value ?? '';

  if (!category || !title) {
    setStatus('Kategori ve başlık zorunludur.', 'error');
    return;
  }

  if (!validateSourceUrl(sourceUrl)) {
    setStatus('Geçersiz URL', 'error');
    return;
  }

  const attrs = validateAttributesJson(attributesText);
  if (!attrs.ok) {
    setStatus(attrs.message, 'error');
    return;
  }

  /** @type {Record<string, unknown>} */
  const body = { category, title, currency, attributes: attrs.value };
  if (description) body.description = description;
  if (priceRaw) body.price = Number(priceRaw);
  if (sourceUrl) body.source_url = sourceUrl;

  setStatus('İlan oluşturuluyor…', 'info');
  const result = await edgeRequest('/listings', { method: 'POST', body });
  if (!result.ok) {
    setStatus(result.message, 'error');
    return;
  }

  event.target.reset();
  const listing = result.data?.listing;
  if (!listing) {
    setStatus('İlan oluşturuldu.', 'success');
    await loadListings();
    return;
  }

  setStatus('İlan oluşturuldu. Analiz başlatılıyor…', 'success');
  await autoAnalyzeListing(listing);
}

function updateImportButtonState() {
  const importBtn = $('ai-listings-import-run-btn');
  if (!importBtn) return;
  importBtn.disabled = importValidRowCount <= 0;
}

function handleImportPreview() {
  const format = /** @type {'csv'|'json'} */ (
    $('ai-listings-import-format')?.value === 'json' ? 'json' : 'csv'
  );
  const content = $('ai-listings-import-content')?.value ?? '';
  const previewEl = $('ai-listings-import-preview');

  const result = previewImportContent(format, content);
  if (!result.ok) {
    importValidRowCount = 0;
    updateImportButtonState();
    if (previewEl) previewEl.innerHTML = `<p class="ai-listings-admin__error">${safeRenderText(result.message)}</p>`;
    setStatus(result.message, 'error');
    return;
  }

  importValidRowCount = result.preview.valid_rows;
  updateImportButtonState();
  if (previewEl) previewEl.innerHTML = buildImportPreviewHtml(result.preview);
  setStatus(
    `Önizleme hazır: ${result.preview.valid_rows} geçerli, ${result.preview.invalid_rows} geçersiz.`,
    'success'
  );
}

async function handleImportRun() {
  if (importValidRowCount <= 0) {
    setStatus('İçe aktarılacak geçerli satır yok. Önce önizleme yapın.', 'error');
    return;
  }

  const format = /** @type {'csv'|'json'} */ (
    $('ai-listings-import-format')?.value === 'json' ? 'json' : 'csv'
  );
  const content = $('ai-listings-import-content')?.value ?? '';
  const analyze = resolveImportAnalyzeFlag($('ai-listings-import-analyze')?.checked);

  setStatus('İlanlar içe aktarılıyor…', 'info');
  const result = await edgeRequest('/listings/import', {
    method: 'POST',
    body: { format, content, analyze }
  });

  if (!result.ok) {
    setStatus(result.message, 'error');
    return;
  }

  const summary = result.data ?? {};
  setStatus(
    `İçe aktarım tamamlandı: ${summary.created_count ?? 0} oluşturuldu, ${summary.invalid_count ?? 0} geçersiz, ${summary.analyzed_count ?? 0} analiz edildi.`,
    'success'
  );
  importValidRowCount = 0;
  updateImportButtonState();
  await loadListings();
}

function bindEvents() {
  $('ai-listings-create-form')?.addEventListener('submit', handleCreateSubmit);
  $('ai-listings-refresh-list-btn')?.addEventListener('click', () => loadListings());
  $('ai-listings-import-preview-btn')?.addEventListener('click', handleImportPreview);
  $('ai-listings-import-run-btn')?.addEventListener('click', handleImportRun);
  $('ai-listings-import-content')?.addEventListener('input', () => {
    importValidRowCount = 0;
    updateImportButtonState();
  });
  $('ai-listings-import-format')?.addEventListener('change', () => {
    importValidRowCount = 0;
    updateImportButtonState();
  });
}

export function initAiListingsAdmin() {
  const state = getAdminPanelState(storage());

  if (state === 'disabled') {
    renderDisabledState();
    return;
  }

  if (state === 'no-secret') {
    renderSecretWarning();
  }

  renderStatusFilterChips();
  bindEvents();
  updateImportButtonState();
  loadListings();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAiListingsAdmin);
} else {
  initAiListingsAdmin();
}
