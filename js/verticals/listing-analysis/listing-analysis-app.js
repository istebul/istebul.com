/**
 * AI İlan Analizi V1 — uygulama giriş noktası (izole modül).
 */
import {
  LISTING_ANALYSIS_DISCLAIMER,
  LISTING_ANALYSIS_DOM_IDS,
  LISTING_ANALYSIS_TYPES,
  VEHICLE_FUEL_OPTIONS,
  HOUSING_USAGE_OPTIONS,
  createEmptyVehicleInput,
  createEmptyHousingInput
} from './listing-analysis-config.js';
import { buildListingAnalysisResult } from './listing-analysis-engine.js';
import { mountListingAnalysisResultsV2 } from './listing-analysis-results-v2.js';
import { withTimeout } from '../../core/async-utils.js';

const INTAKE_TIMEOUT_MS = 6000;

function getEnv() {
  return {
    url: window.__env?.SUPABASE_URL || '',
    key: window.__env?.SUPABASE_ANON_KEY || ''
  };
}

function parsePanelInputs(panel) {
  const numericKeys = new Set(['yil', 'km', 'fiyat', 'metrekare', 'oda_sayisi', 'bina_yasi']);
  const out = {};
  panel?.querySelectorAll('input, select').forEach((el) => {
    if (!el.name) return;
    const raw = String(el.value ?? '');
    out[el.name] = numericKeys.has(el.name) ? raw.replace(/[^\d]/g, '') : raw.trim();
  });
  return out;
}

async function submitListingAnalysis(type, input) {
  const built = buildListingAnalysisResult(type, input);
  if (!built.ok) return built;

  const { url, key } = getEnv();
  if (!url || !key || key.includes('placeholder')) {
    return { ok: true, result: built.result, offline: true };
  }

  try {
    const response = await withTimeout(
      fetch(`${url.replace(/\/$/, '')}/functions/v1/listing-analysis-intake`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listing_type: type,
          input
        })
      }),
      INTAKE_TIMEOUT_MS,
      null
    );

    if (!response) {
      return { ok: true, result: built.result, timeout: true };
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      return { ok: true, result: built.result, intakeError: data.error || 'intake_failed' };
    }

    return {
      ok: true,
      result: data.result || built.result,
      analysisId: data.analysis_id || null
    };
  } catch {
    return { ok: true, result: built.result, offline: true };
  }
}

function renderFuelOptions(selected) {
  return VEHICLE_FUEL_OPTIONS.map(
    (opt) =>
      `<option value="${opt.value}"${opt.value === selected ? ' selected' : ''}>${opt.label}</option>`
  ).join('');
}

function renderUsageOptions(selected) {
  return HOUSING_USAGE_OPTIONS.map(
    (opt) =>
      `<option value="${opt.value}"${opt.value === selected ? ' selected' : ''}>${opt.label}</option>`
  ).join('');
}

function bindTabs(root) {
  const tabVehicle = root.querySelector(`#${LISTING_ANALYSIS_DOM_IDS.tabVehicle}`);
  const tabHousing = root.querySelector(`#${LISTING_ANALYSIS_DOM_IDS.tabHousing}`);
  const panelVehicle = root.querySelector(`#${LISTING_ANALYSIS_DOM_IDS.panelVehicle}`);
  const panelHousing = root.querySelector(`#${LISTING_ANALYSIS_DOM_IDS.panelHousing}`);
  let active = LISTING_ANALYSIS_TYPES.vehicle;

  function setTab(type) {
    active = type;
    const isVehicle = type === LISTING_ANALYSIS_TYPES.vehicle;
    tabVehicle?.classList.toggle('is-active', isVehicle);
    tabHousing?.classList.toggle('is-active', !isVehicle);
    tabVehicle?.setAttribute('aria-selected', String(isVehicle));
    tabHousing?.setAttribute('aria-selected', String(!isVehicle));
    panelVehicle?.toggleAttribute('hidden', !isVehicle);
    panelHousing?.toggleAttribute('hidden', isVehicle);
  }

  tabVehicle?.addEventListener('click', () => setTab(LISTING_ANALYSIS_TYPES.vehicle));
  tabHousing?.addEventListener('click', () => setTab(LISTING_ANALYSIS_TYPES.housing));

  return () => active;
}

function showErrors(container, errors = []) {
  if (!container) return;
  container.innerHTML = errors.length
    ? `<div class="la-form-errors" role="alert">${errors.map((e) => `<p>${e}</p>`).join('')}</div>`
    : '';
}

function initListingAnalysisApp() {
  const flow = document.getElementById(LISTING_ANALYSIS_DOM_IDS.flow);
  const results = document.getElementById(LISTING_ANALYSIS_DOM_IDS.results);
  const form = document.getElementById(LISTING_ANALYSIS_DOM_IDS.form);
  const heroCta = document.getElementById(LISTING_ANALYSIS_DOM_IDS.heroCta);
  const errorBox = document.getElementById('listing-analysis-errors');

  if (!flow || !form || !results) return;

  const vehicleDefaults = createEmptyVehicleInput();
  const housingDefaults = createEmptyHousingInput();

  heroCta?.addEventListener('click', () => {
    flow.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  form.innerHTML = `
    <div class="la-tabs" role="tablist" aria-label="İlan türü">
      <button type="button" role="tab" class="la-tab is-active" id="${LISTING_ANALYSIS_DOM_IDS.tabVehicle}" aria-selected="true">Araç İlanı</button>
      <button type="button" role="tab" class="la-tab" id="${LISTING_ANALYSIS_DOM_IDS.tabHousing}" aria-selected="false">Konut İlanı</button>
    </div>
    <div id="${LISTING_ANALYSIS_DOM_IDS.panelVehicle}" class="la-panel">
      <div class="la-grid">
        <label class="la-field"><span>Marka</span><input name="marka" required placeholder="Örn: Toyota"></label>
        <label class="la-field"><span>Model</span><input name="model" required placeholder="Örn: Corolla"></label>
        <label class="la-field"><span>Yıl</span><input name="yil" inputmode="numeric" required placeholder="Örn: 2020"></label>
        <label class="la-field"><span>Km</span><input name="km" inputmode="numeric" required placeholder="Örn: 85000"></label>
        <label class="la-field"><span>Yakıt türü</span><select name="yakit_turu">${renderFuelOptions(vehicleDefaults.yakit_turu)}</select></label>
        <label class="la-field"><span>Fiyat (₺)</span><input name="fiyat" inputmode="numeric" required placeholder="Örn: 950000"></label>
        <label class="la-field la-field--wide"><span>İl</span><input name="il" placeholder="Örn: İstanbul"></label>
      </div>
    </div>
    <div id="${LISTING_ANALYSIS_DOM_IDS.panelHousing}" class="la-panel" hidden>
      <div class="la-grid">
        <label class="la-field"><span>İl</span><input name="il" required placeholder="Örn: Ankara"></label>
        <label class="la-field"><span>İlçe</span><input name="ilce" required placeholder="Örn: Çankaya"></label>
        <label class="la-field"><span>m²</span><input name="metrekare" inputmode="numeric" required placeholder="Örn: 120"></label>
        <label class="la-field"><span>Oda sayısı</span><input name="oda_sayisi" inputmode="numeric" required placeholder="Örn: 3"></label>
        <label class="la-field"><span>Bina yaşı</span><input name="bina_yasi" inputmode="numeric" required placeholder="Örn: 8"></label>
        <label class="la-field"><span>Fiyat (₺)</span><input name="fiyat" inputmode="numeric" required placeholder="Örn: 4500000"></label>
        <label class="la-field la-field--wide"><span>Kullanım amacı</span><select name="kullanim_amaci">${renderUsageOptions(housingDefaults.kullanim_amaci)}</select></label>
      </div>
    </div>
    <p class="la-disclaimer">${LISTING_ANALYSIS_DISCLAIMER}</p>
    <button type="submit" class="la-submit" id="${LISTING_ANALYSIS_DOM_IDS.submit}">Analiz Et</button>`;

  const submitBtn = document.getElementById(LISTING_ANALYSIS_DOM_IDS.submit);
  const getActiveType = bindTabs(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showErrors(errorBox, []);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Analiz ediliyor…';
    }

    const type = getActiveType();
    const panel =
      type === LISTING_ANALYSIS_TYPES.vehicle
        ? document.getElementById(LISTING_ANALYSIS_DOM_IDS.panelVehicle)
        : document.getElementById(LISTING_ANALYSIS_DOM_IDS.panelHousing);
    const parsed = parsePanelInputs(panel);

    const validation = buildListingAnalysisResult(type, parsed);
    if (!validation.ok) {
      showErrors(errorBox, validation.errors);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Analiz Et';
      }
      return;
    }

    const response = await submitListingAnalysis(type, parsed);
    if (!response.ok) {
      showErrors(errorBox, response.errors || ['Analiz başarısız.']);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Analiz Et';
      }
      return;
    }

    results.hidden = false;
    await mountListingAnalysisResultsV2(results, {
      result: response.result,
      onPdfDownload: () => {
        if (response.analysisId) {
          /* event optional */
        }
      }
    });
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Analiz Et';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initListingAnalysisApp);
} else {
  initListingAnalysisApp();
}
