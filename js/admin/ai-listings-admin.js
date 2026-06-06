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
  buildQualityChecklistHtml,
  buildQaActionsHtml,
  buildStatusFilterChipsHtml,
  getAdminPanelState,
  getEdgeSecret,
  isListingPubliclyVisible,
  mapEdgeResponse,
  previewImportContent,
  resolveActiveStatusFilter,
  resolveEdgeBaseUrl,
  safeRenderText,
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

  if (!base) {
    return { ok: false, status: 0, message: 'SUPABASE_URL is not configured in env.js' };
  }
  if (!secret) {
    return { ok: false, status: 0, message: 'Edge secret missing — set localStorage istebul_ai_listings_secret' };
  }

  const response = await fetch(`${base}${path}`, {
    method,
    headers: buildEdgeRequestHeaders(secret),
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const json = await response.json().catch(() => ({}));
  return mapEdgeResponse(response, json);
}

function renderDisabledState() {
  const root = $('ai-listings-admin-root');
  if (!root) return;
  root.innerHTML = `
    <div class="ai-listings-admin__gate">
      <h2>AI Listings Admin — Disabled</h2>
      <p>This internal test panel is hidden by default.</p>
      <pre class="ai-listings-admin__code">localStorage.setItem('${ADMIN_ENABLE_KEY}', 'on')</pre>
      <p>Reload the page after enabling. See docs/ai-listings/ADMIN_TEST_PANEL.md</p>
    </div>`;
}

function renderSecretWarning() {
  const warn = $('ai-listings-secret-warning');
  if (!warn) return;
  warn.hidden = false;
  warn.innerHTML = `
    <strong>Setup required:</strong>
    Set <code>localStorage.${ADMIN_SECRET_KEY}</code> to your
    <code>AI_LISTINGS_EDGE_SECRET</code> value, then refresh.
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
  const status = safeRenderText(listing.status);
  return `
    <button type="button" class="ai-listings-admin__list-item" data-listing-id="${id}">
      <span class="ai-listings-admin__list-title">${title}</span>
      <span class="ai-listings-admin__list-badges">${buildListingBadgesHtml(listing)}</span>
      <span class="ai-listings-admin__list-meta">${status}</span>
    </button>`;
}

function renderAnalysis(analysis) {
  if (!analysis) return '<p class="ai-listings-admin__muted">No analysis yet.</p>';
  return `
    <div class="ai-listings-admin__analysis">
      <p><strong>AI score:</strong> ${safeRenderText(analysis.ai_score)}</p>
      <p><strong>Risk:</strong> ${safeRenderText(analysis.risk_score)}</p>
      <p><strong>Market:</strong> ${safeRenderText(analysis.market_score)}</p>
      <p><strong>Price:</strong> ${safeRenderText(analysis.price_score)}</p>
      <p><strong>Summary:</strong> ${safeRenderText(analysis.summary)}</p>
    </div>`;
}

function renderEvents(events) {
  if (!events?.length) return '<p class="ai-listings-admin__muted">No events.</p>';
  return `<ul class="ai-listings-admin__events">${events
    .map((event) => {
      const reason =
        event.event_type === 'listing_rejected' && event.payload?.reason
          ? ` — ${safeRenderText(event.payload.reason)}`
          : '';
      return `
      <li>
        <span class="ai-listings-admin__event-type">${safeRenderText(event.event_type)}</span>
        <span class="ai-listings-admin__event-time">${safeRenderText(event.created_at)}</span>${reason}
      </li>`;
    })
    .join('')}</ul>`;
}

function renderPublicVisibilityNote(status) {
  const visible = isListingPubliclyVisible(status);
  if (visible) {
    return '<p class="ai-listings-admin__error">Public visibility enabled — unexpected in Sprint-7.</p>';
  }
  return '<p class="ai-listings-admin__muted">Public publishing disabled. Approved status is internal QA only.</p>';
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
  listEl.innerHTML = '<p class="ai-listings-admin__muted">Loading…</p>';

  const result = await edgeRequest(`/listings${query}`);
  if (!result.ok) {
    listEl.innerHTML = `<p class="ai-listings-admin__error">${safeRenderText(result.message)}</p>`;
    setStatus(result.message, 'error');
    return;
  }

  const listings = /** @type {Array<Record<string, unknown>>} */ (result.data?.listings ?? []);
  if (!listings.length) {
    listEl.innerHTML = '<p class="ai-listings-admin__muted">No listings found.</p>';
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
  setStatus(`Loaded ${listings.length} listing(s).`, 'success');
}

async function showListingDetail(listing) {
  selectedListing = listing;
  const detailEl = $('ai-listings-detail');
  if (!detailEl) return;

  const id = String(listing.id);
  detailEl.innerHTML = '<p class="ai-listings-admin__muted">Loading detail…</p>';

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
    <h3>${safeRenderText(listingData.title ?? listing.title)}</h3>
    <dl class="ai-listings-admin__fields">
      <dt>ID</dt><dd>${safeRenderText(listingData.id ?? id)}</dd>
      <dt>Category</dt><dd>${safeRenderText(listingData.category)}</dd>
      <dt>Status</dt><dd>${safeRenderText(status)}</dd>
      <dt>Price</dt><dd>${safeRenderText(listingData.price)} ${safeRenderText(listingData.currency)}</dd>
      <dt>Location</dt><dd>${safeRenderText(listingData.location)}</dd>
      <dt>Source URL</dt><dd>${safeRenderText(listingData.source_url)}</dd>
    </dl>
    <h4>Quality checklist</h4>
    ${buildQualityChecklistHtml(listingData, latest)}
    ${renderPublicVisibilityNote(status)}
    <h4>Latest analysis</h4>
    ${renderAnalysis(latest)}
    <h4>Events</h4>
    ${renderEvents(events)}
    <div id="ai-listings-reject-form" class="ai-listings-admin__reject-form" hidden>
      <label>
        Rejection reason
        <textarea id="ai-listings-reject-reason" rows="3" placeholder="Explain why this listing was rejected"></textarea>
      </label>
      <button type="button" id="ai-listings-confirm-reject-btn" class="ai-listings-admin__btn ai-listings-admin__btn--warn">Confirm reject</button>
      <button type="button" id="ai-listings-cancel-reject-btn" class="ai-listings-admin__btn ai-listings-admin__btn--ghost">Cancel</button>
    </div>
    <div class="ai-listings-admin__actions">
      ${buildQaActionsHtml(status)}
      <button type="button" id="ai-listings-analyze-btn" class="ai-listings-admin__btn">Analyze</button>
      <button type="button" id="ai-listings-refresh-detail-btn" class="ai-listings-admin__btn ai-listings-admin__btn--ghost">Refresh</button>
    </div>`;

  detailEl.querySelectorAll('[data-qa-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-qa-action');
      if (!action) return;
      if (action === 'reject') {
        $('ai-listings-reject-form')?.removeAttribute('hidden');
        return;
      }
      runQaAction(id, action);
    });
  });

  $('ai-listings-analyze-btn')?.addEventListener('click', () => analyzeListing(id));
  $('ai-listings-refresh-detail-btn')?.addEventListener('click', () => showListingDetail(listingData));
  $('ai-listings-confirm-reject-btn')?.addEventListener('click', () => {
    const reason = $('ai-listings-reject-reason')?.value?.trim() ?? '';
    if (!reason) {
      setStatus('Rejection reason is required.', 'error');
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
    'submit-review': 'Submitting for review',
    approve: 'Approving',
    reject: 'Rejecting',
    archive: 'Archiving',
    reanalyze: 'Re-analyzing'
  };
  setStatus(`${labels[action] ?? 'Processing'}…`, 'info');

  const result = await edgeRequest(`/listings/${id}/${action}`, {
    method: 'POST',
    body
  });

  if (!result.ok) {
    setStatus(result.message, 'error');
    return;
  }

  setStatus(`${labels[action] ?? 'Action'} complete.`, 'success');
  const updated = result.data?.listing;
  if (updated) {
    selectedListing = updated;
    await showListingDetail(updated);
  } else if (selectedListing) {
    await showListingDetail(selectedListing);
  }
  await loadListings();
}

async function analyzeListing(id) {
  setStatus('Running analysis…', 'info');
  const result = await edgeRequest(`/listings/${id}/analyze`, { method: 'POST' });
  if (!result.ok) {
    setStatus(result.message, 'error');
    return;
  }
  setStatus('Analysis complete.', 'success');
  if (selectedListing) await showListingDetail(selectedListing);
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
    setStatus('Category and title are required.', 'error');
    return;
  }

  if (!validateSourceUrl(sourceUrl)) {
    setStatus('source_url must be http or https.', 'error');
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

  setStatus('Creating listing…', 'info');
  const result = await edgeRequest('/listings', { method: 'POST', body });
  if (!result.ok) {
    setStatus(result.message, 'error');
    return;
  }

  setStatus('Listing created.', 'success');
  event.target.reset();
  await loadListings();
  const listing = result.data?.listing;
  if (listing) await showListingDetail(listing);
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
    `Preview ready: ${result.preview.valid_rows} valid, ${result.preview.invalid_rows} invalid.`,
    'success'
  );
}

async function handleImportRun() {
  if (importValidRowCount <= 0) {
    setStatus('No valid rows to import. Run preview first.', 'error');
    return;
  }

  const format = /** @type {'csv'|'json'} */ (
    $('ai-listings-import-format')?.value === 'json' ? 'json' : 'csv'
  );
  const content = $('ai-listings-import-content')?.value ?? '';
  const analyze = Boolean($('ai-listings-import-analyze')?.checked);

  setStatus('Importing listings…', 'info');
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
    `Import complete: ${summary.created_count ?? 0} created, ${summary.invalid_count ?? 0} invalid, ${summary.analyzed_count ?? 0} analyzed.`,
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
