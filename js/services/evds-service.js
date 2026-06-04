/**
 * TCMB EVDS — server-side only. Requires env.TCMB_EVDS_API_KEY (never expose to browser).
 */

/** EVDS 3 REST API (evds2 redirects; /service/evds/ path returns 404/HTML). */
export const EVDS_BASE_URL = 'https://evds3.tcmb.gov.tr/igmevdsms-dis/';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

/** @see https://evds3.tcmb.gov.tr/ */
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

/** EVDS JSON columns use underscores instead of dots (TP.DK.USD.A → TP_DK_USD_A). */
export function seriesCodeToColumn(seriesCode) {
  return String(seriesCode).replace(/\./g, '_');
}

/**
 * Path-style EVDS URL (key via HTTP header since 2024-04-05).
 * Multi-series: join codes with `-` (e.g. TP.DK.USD.A-TP.DK.EUR.A).
 * @see https://evds3.tcmb.gov.tr/igmevdsms-dis/
 */
export function buildEvdsSeriesUrl(seriesCode, { startDate, endDate } = {}) {
  const params = new URLSearchParams({
    series: seriesCode,
    startDate: startDate || startDateDaysAgo(60),
    endDate: endDate || formatEvdsDate(),
    type: 'json'
  });
  return `${EVDS_BASE_URL}${params.toString()}`;
}

function evdsRequestHeaders(apiKey) {
  return {
    Accept: 'application/json',
    key: apiKey
  };
}

function isJsonContentType(contentType) {
  return String(contentType || '').toLowerCase().includes('json');
}

function bodyLooksLikeJson(bodyText) {
  const trimmed = String(bodyText || '').trimStart();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

/**
 * @param {Response} response
 * @param {string} apiKey
 */
async function readEvdsBodyText(response, apiKey) {
  return redactSecrets(await response.text(), apiKey);
}

/**
 * Parse EVDS JSON body; skip parse when upstream returned HTML/app shell.
 * @returns {{ json: object, contentType: string, bodyText: string, parseSkipped: boolean, parseError: string | null }}
 */
export async function parseEvdsResponseBody(response, apiKey) {
  const contentType = response.headers?.get?.('content-type') || '';
  const bodyText = await readEvdsBodyText(response, apiKey);
  const canParse =
    isJsonContentType(contentType) || bodyLooksLikeJson(bodyText);

  if (!canParse) {
    return {
      json: null,
      contentType,
      bodyText,
      parseSkipped: true,
      parseError: `EVDS non-JSON response (${contentType || 'unknown content-type'})`
    };
  }

  try {
    return {
      json: JSON.parse(bodyText),
      contentType,
      bodyText,
      parseSkipped: false,
      parseError: null
    };
  } catch {
    return {
      json: null,
      contentType,
      bodyText,
      parseSkipped: false,
      parseError: 'EVDS invalid JSON'
    };
  }
}

function pickValueFromRow(row, seriesCode) {
  if (!row || typeof row !== 'object') return null;

  const dateKey = Object.keys(row).find((k) => /tarih|date/i.test(k));
  const columnCandidates = [
    seriesCodeToColumn(seriesCode),
    seriesCode,
    `${seriesCodeToColumn(seriesCode)}_YTL`
  ];
  let valueKey = columnCandidates.find((k) => row[k] != null && row[k] !== '');
  if (!valueKey) {
    valueKey = Object.keys(row).find(
      (k) => k !== dateKey && !/unix/i.test(k) && row[k] !== '' && row[k] != null
    );
  }
  if (!valueKey) return null;

  const raw = String(row[valueKey]).replace(',', '.');
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;

  return {
    value,
    date: dateKey ? String(row[dateKey]) : null
  };
}

export function parseLatestValue(evdsJson, seriesCode) {
  if (!evdsJson || typeof evdsJson !== 'object') return null;

  const items = evdsJson.items;
  if (!Array.isArray(items) || !items.length) return null;

  const nestedBucket = items.find(
    (row) => row && (row.SERIES_CODE === seriesCode || row.seriesCode === seriesCode)
  );
  if (nestedBucket) {
    const rows = nestedBucket.items || nestedBucket.data || [];
    if (Array.isArray(rows) && rows.length) {
      return pickValueFromRow(rows[rows.length - 1], seriesCode);
    }
  }

  for (let i = items.length - 1; i >= 0; i -= 1) {
    const point = pickValueFromRow(items[i], seriesCode);
    if (point) return point;
  }

  return null;
}

async function fetchEvdsSeries(apiKey, seriesCode, { startDate, endDate, fetchImpl = fetch } = {}) {
  const url = buildEvdsSeriesUrl(seriesCode, { startDate, endDate });
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: evdsRequestHeaders(apiKey),
        signal: controller.signal,
        redirect: 'follow'
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

      const parsed = await parseEvdsResponseBody(response, apiKey);
      if (parsed.parseSkipped || parsed.parseError || !parsed.json) {
        lastError = new Error(
          parsed.parseError || `EVDS non-JSON payload (${seriesCode})`
        );
        logEvds('warn', 'evds_series_non_json', {
          series: seriesCode,
          attempt,
          contentType: parsed.contentType || 'unknown',
          parseSkipped: parsed.parseSkipped
        });
        continue;
      }

      const point = parseLatestValue(parsed.json, seriesCode);
      if (!point) {
        lastError = new Error(`EVDS empty series (${seriesCode})`);
        logEvds('warn', 'evds_series_empty', {
          series: seriesCode,
          attempt,
          itemCount: Array.isArray(parsed.json?.items) ? parsed.json.items.length : 0
        });
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

/** Single request for USD + EUR (primary FX path). */
async function fetchEvdsFxPair(apiKey, { startDate, endDate, fetchImpl = fetch } = {}) {
  const seriesParam = `${EVDS_SERIES.USD_TRY}-${EVDS_SERIES.EUR_TRY}`;
  const url = buildEvdsSeriesUrl(seriesParam, { startDate, endDate });
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: evdsRequestHeaders(apiKey),
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timer);

      if (!response.ok) {
        lastError = new Error(`EVDS HTTP ${response.status} (FX pair)`);
        continue;
      }

      const parsed = await parseEvdsResponseBody(response, apiKey);
      if (parsed.parseSkipped || parsed.parseError || !parsed.json) {
        lastError = new Error(parsed.parseError || 'EVDS non-JSON payload (FX pair)');
        continue;
      }

      const usdTry = parseLatestValue(parsed.json, EVDS_SERIES.USD_TRY);
      const eurTry = parseLatestValue(parsed.json, EVDS_SERIES.EUR_TRY);
      if (!usdTry?.value || !eurTry?.value) {
        lastError = new Error('EVDS FX pair missing USD or EUR values');
        continue;
      }

      return { usdTry, eurTry };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
    }
  }

  throw lastError || new Error('EVDS FX pair fetch failed');
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

  try {
    const fx = await fetchEvdsFxPair(apiKey, { startDate, endDate, fetchImpl });
    rates.usdTry = fx.usdTry;
    rates.eurTry = fx.eurTry;
  } catch (error) {
    errors.push({
      series: `${EVDS_SERIES.USD_TRY}-${EVDS_SERIES.EUR_TRY}`,
      message: redactSecrets(error?.message || String(error), apiKey)
    });
    logEvds('warn', 'evds_fx_pair_failed', {
      message: redactSecrets(error?.message || String(error), apiKey)
    });
    await Promise.all([
      pull('usdTry', EVDS_SERIES.USD_TRY),
      pull('eurTry', EVDS_SERIES.EUR_TRY)
    ]);
  }

  await Promise.all([
    pull('policyRate', EVDS_SERIES.POLICY_RATE),
    pull('cpiAnnual', EVDS_SERIES.CPI_ANNUAL),
    pull('housingLoanRate', EVDS_SERIES.HOUSING_LOAN, true)
  ]);

  const hasFx = rates.usdTry?.value != null && rates.eurTry?.value != null;
  if (!hasFx) {
    throw new Error('EVDS returned no usable FX series');
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
