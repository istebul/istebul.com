/**
 * TCMB EVDS — server-side only. Requires env.TCMB_EVDS_API_KEY (never expose to browser).
 */

const EVDS_BASE_URL = 'https://evds2.tcmb.gov.tr/service/evds/';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

/** @see https://evds2.tcmb.gov.tr/ */
export const EVDS_SERIES = Object.freeze({
  USD_TRY: 'TP.DK.USD.A',
  EUR_TRY: 'TP.DK.EUR.A',
  POLICY_RATE: 'TP.APIFON4',
  CPI_ANNUAL: 'TP.FG.Y01',
  HOUSING_LOAN: 'TP.KTF17'
});

let memoryCache = null;
let lastGoodSnapshot = null;

function logEvds(level, event, fields = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    service: 'evds',
    ...fields
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  /* info-level: dropped in production (repo quality gate disallows console.log) */
}

function redactSecrets(text, apiKey) {
  if (!apiKey || text == null) return text;
  return String(text).split(apiKey).join('[REDACTED]');
}

function formatEvdsDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function startDateDaysAgo(days = 45) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatEvdsDate(d);
}

export function parseLatestValue(evdsJson, seriesCode) {
  if (!evdsJson || typeof evdsJson !== 'object') return null;

  const items = evdsJson.items;
  if (!Array.isArray(items) || !items.length) return null;

  const bucket =
    items.find((row) => row.SERIES_CODE === seriesCode || row.seriesCode === seriesCode) ||
    items[0];
  const rows = bucket?.items || bucket?.data || [];
  if (!Array.isArray(rows) || !rows.length) return null;

  const last = rows[rows.length - 1];
  if (!last || typeof last !== 'object') return null;

  const dateKey = Object.keys(last).find((k) => /tarih|date/i.test(k));
  const valueKey = Object.keys(last).find(
    (k) => k !== dateKey && !/unix/i.test(k) && last[k] !== '' && last[k] != null
  );
  if (!valueKey) return null;

  const raw = String(last[valueKey]).replace(',', '.');
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;

  return {
    value,
    date: dateKey ? String(last[dateKey]) : null
  };
}

async function fetchEvdsSeries(apiKey, seriesCode, { startDate, endDate, fetchImpl = fetch } = {}) {
  const params = new URLSearchParams({
    series: seriesCode,
    startDate: startDate || startDateDaysAgo(60),
    endDate: endDate || formatEvdsDate(),
    type: 'json',
    key: apiKey
  });

  const url = `${EVDS_BASE_URL}?${params.toString()}`;
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!response.ok) {
        lastError = new Error(`EVDS HTTP ${response.status} (${seriesCode})`);
        logEvds('warn', 'evds_series_http_error', {
          series: seriesCode,
          status: response.status,
          attempt
        });
        continue;
      }

      const json = await response.json();
      const point = parseLatestValue(json, seriesCode);
      if (!point) {
        lastError = new Error(`EVDS empty series (${seriesCode})`);
        logEvds('warn', 'evds_series_empty', { series: seriesCode, attempt });
        continue;
      }

      return point;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      logEvds('warn', 'evds_series_fetch_failed', {
        series: seriesCode,
        attempt,
        message: redactSecrets(error?.message || String(error), apiKey)
      });
    }
  }

  throw lastError || new Error(`EVDS fetch failed (${seriesCode})`);
}

function emptyRates() {
  return {
    usdTry: null,
    eurTry: null,
    policyRate: null,
    cpiAnnual: null,
    housingLoanRate: null
  };
}

function buildSnapshot({
  configured = true,
  source = 'live',
  fetchedAt = new Date().toISOString(),
  dataDate = null,
  rates = emptyRates(),
  errors = []
} = {}) {
  return {
    configured,
    source,
    fetchedAt,
    dataDate: dataDate || rates.usdTry?.date || rates.eurTry?.date || null,
    rates: {
      usdTry: rates.usdTry?.value ?? null,
      eurTry: rates.eurTry?.value ?? null,
      policyRate: rates.policyRate?.value ?? null,
      cpiAnnual: rates.cpiAnnual?.value ?? null,
      housingLoanRate: rates.housingLoanRate?.value ?? null
    },
    seriesDates: {
      usdTry: rates.usdTry?.date ?? null,
      eurTry: rates.eurTry?.date ?? null,
      policyRate: rates.policyRate?.date ?? null,
      cpiAnnual: rates.cpiAnnual?.date ?? null,
      housingLoanRate: rates.housingLoanRate?.date ?? null
    },
    errors
  };
}

async function pullLiveSnapshot(apiKey, fetchImpl) {
  const startDate = startDateDaysAgo(90);
  const endDate = formatEvdsDate();
  const errors = [];
  const rates = {};

  const pull = async (key, code, optional = false) => {
    try {
      rates[key] = await fetchEvdsSeries(apiKey, code, { startDate, endDate, fetchImpl });
    } catch (error) {
      errors.push({
        series: code,
        message: redactSecrets(error?.message || String(error), apiKey)
      });
      if (!optional) logEvds('warn', 'evds_required_series_failed', { series: code });
    }
  };

  await Promise.all([
    pull('usdTry', EVDS_SERIES.USD_TRY),
    pull('eurTry', EVDS_SERIES.EUR_TRY),
    pull('policyRate', EVDS_SERIES.POLICY_RATE),
    pull('cpiAnnual', EVDS_SERIES.CPI_ANNUAL),
    pull('housingLoanRate', EVDS_SERIES.HOUSING_LOAN, true)
  ]);

  const hasAny = Object.values(rates).some((r) => r?.value != null);
  if (!hasAny) {
    throw new Error('EVDS returned no usable series');
  }

  return buildSnapshot({
    configured: true,
    source: 'live',
    rates,
    errors
  });
}

/**
 * Full snapshot with 24h cache and stale fallback.
 * @param {{ TCMB_EVDS_API_KEY?: string }} env
 * @param {{ fetchImpl?: typeof fetch, forceRefresh?: boolean }} [options]
 */
export async function fetchEvdsSnapshot(env = {}, options = {}) {
  const apiKey = String(env.TCMB_EVDS_API_KEY || '').trim();
  const fetchImpl = options.fetchImpl || fetch;

  if (!apiKey) {
    logEvds('warn', 'evds_unconfigured');
    if (lastGoodSnapshot) {
      return { ...lastGoodSnapshot, source: 'stale', configured: false };
    }
    return buildSnapshot({ configured: false, source: 'unconfigured' });
  }

  const now = Date.now();
  if (
    !options.forceRefresh &&
    memoryCache?.snapshot &&
    now - memoryCache.fetchedAt < CACHE_TTL_MS
  ) {
    return { ...memoryCache.snapshot, source: 'cache' };
  }

  try {
    const snapshot = await pullLiveSnapshot(apiKey, fetchImpl);
    memoryCache = { snapshot, fetchedAt: now };
    lastGoodSnapshot = snapshot;
    logEvds('info', 'evds_snapshot_ok', {
      dataDate: snapshot.dataDate,
      errorCount: snapshot.errors?.length || 0
    });
    return snapshot;
  } catch (error) {
    logEvds('error', 'evds_snapshot_failed', {
      message: redactSecrets(error?.message || String(error), apiKey)
    });
    if (lastGoodSnapshot) {
      return { ...lastGoodSnapshot, source: 'stale', errors: [{ message: 'upstream_unavailable' }] };
    }
    return buildSnapshot({
      configured: true,
      source: 'fallback',
      errors: [{ message: redactSecrets(error?.message || 'evds_unavailable', apiKey) }]
    });
  }
}

export async function getExchangeRates(env = {}, options = {}) {
  const snapshot = await fetchEvdsSnapshot(env, options);
  return {
    usdTry: snapshot.rates.usdTry,
    eurTry: snapshot.rates.eurTry,
    fetchedAt: snapshot.fetchedAt,
    dataDate: snapshot.seriesDates?.usdTry || snapshot.dataDate,
    source: snapshot.source
  };
}

export async function getPolicyRate(env = {}, options = {}) {
  const snapshot = await fetchEvdsSnapshot(env, options);
  return {
    policyRate: snapshot.rates.policyRate,
    fetchedAt: snapshot.fetchedAt,
    dataDate: snapshot.seriesDates?.policyRate || snapshot.dataDate,
    source: snapshot.source
  };
}

export async function getInflationData(env = {}, options = {}) {
  const snapshot = await fetchEvdsSnapshot(env, options);
  return {
    cpiAnnual: snapshot.rates.cpiAnnual,
    fetchedAt: snapshot.fetchedAt,
    dataDate: snapshot.seriesDates?.cpiAnnual || snapshot.dataDate,
    source: snapshot.source
  };
}

export async function getHousingLoanRates(env = {}, options = {}) {
  const snapshot = await fetchEvdsSnapshot(env, options);
  return {
    housingLoanRate: snapshot.rates.housingLoanRate,
    fetchedAt: snapshot.fetchedAt,
    dataDate: snapshot.seriesDates?.housingLoanRate || snapshot.dataDate,
    source: snapshot.source
  };
}

/** @internal test helpers */
export function __resetEvdsCacheForTests() {
  memoryCache = null;
  lastGoodSnapshot = null;
}
