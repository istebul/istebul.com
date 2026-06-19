/**
 * AI İlan Analizi V2 — URL parse, güvenlik ve metadata (scraping yok).
 */

const MAX_URL_LENGTH = 1000;

const BLOCKED_PROTOCOL_PREFIXES = [
  'javascript:',
  'data:',
  'file:',
  'ftp:',
  'blob:',
  'chrome:',
  'about:'
];

const DOMAIN_LABELS = [
  { match: 'sahibinden.com', label: 'Sahibinden' },
  { match: 'arabam.com', label: 'Arabam' },
  { match: 'emlakjet.com', label: 'Emlakjet' },
  { match: 'hepsiemlak.com', label: 'Hepsiemlak' }
];

const INPUT_SOURCE_MAP = {
  'sahibinden.com': 'sahibinden',
  'emlakjet.com': 'emlakjet',
  'arabam.com': 'arabam',
  'hepsiemlak.com': 'hepsiemlak'
};

const RISKY_QUERY_PARAMS = new Set(['fbclid', 'gclid', 'gclsrc', 'ref', 'mc_eid', 'mc_cid']);

const URL_SECURITY_ERROR = 'Geçersiz bağlantı. Yalnızca http veya https adresleri kabul edilir.';

function invalid(error) {
  return {
    isValid: false,
    normalizedUrl: null,
    sourceDomain: null,
    sourceLabel: null,
    inputSource: null,
    error
  };
}

function empty() {
  return {
    isValid: true,
    normalizedUrl: null,
    sourceDomain: null,
    sourceLabel: null,
    inputSource: 'manual',
    error: null
  };
}

function normalizeHostname(hostname) {
  return String(hostname || '').toLowerCase().replace(/^www\./, '');
}

function isPrivateOrBlockedHost(hostname) {
  const host = normalizeHostname(hostname);
  if (!host) return true;
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true;
  if (host.endsWith('.local') || host.endsWith('.internal')) return true;

  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;

  const octets = match.slice(1).map((n) => Number(n));
  if (octets.some((n) => n < 0 || n > 255)) return true;

  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function resolveSourceLabel(hostname) {
  const host = normalizeHostname(hostname);
  for (const entry of DOMAIN_LABELS) {
    if (host === entry.match || host.endsWith(`.${entry.match}`)) {
      return { domain: entry.match, label: entry.label };
    }
  }
  return { domain: host, label: 'Diğer' };
}

export function resolveInputSource(sourceDomain) {
  const domain = normalizeHostname(sourceDomain);
  return INPUT_SOURCE_MAP[domain] || 'external_url';
}

export function resolveUrlMode(input = {}, options = {}) {
  const override = options.url_mode || input.url_mode || input._url_mode;
  if (override === 'partner_api') return 'partner_api';
  if (String(input.listing_url ?? '').trim()) return override || 'paste_url';
  return 'manual';
}

export function resolveResultSource(input = {}, options = {}) {
  if (options.result_source) return options.result_source;
  if (input.result_source) return input.result_source;
  if (options.useAi && options.useRulesEngine) return 'hybrid';
  if (options.useAi) return 'ai';
  return 'rules_engine';
}

function stripRiskyParams(searchParams) {
  for (const key of [...searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (lower.startsWith('utm_') || RISKY_QUERY_PARAMS.has(lower)) {
      searchParams.delete(key);
    }
  }
}

/**
 * @param {string} rawUrl
 */
export function parseListingUrl(rawUrl) {
  const trimmed = String(rawUrl ?? '').trim();
  if (!trimmed) return empty();

  if (trimmed.length > MAX_URL_LENGTH) {
    return invalid('URL çok uzun (maksimum 1000 karakter).');
  }

  const lower = trimmed.toLowerCase();
  for (const prefix of BLOCKED_PROTOCOL_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return invalid(URL_SECURITY_ERROR);
    }
  }

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return invalid('Geçersiz URL formatı.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return invalid(URL_SECURITY_ERROR);
  }

  const normalizedHost = normalizeHostname(parsed.hostname);
  if (isPrivateOrBlockedHost(normalizedHost)) {
    return invalid('Bu bağlantı türüne izin verilmez.');
  }

  if (normalizedHost !== parsed.hostname) {
    parsed.hostname = normalizedHost;
  }

  parsed.hash = '';
  stripRiskyParams(parsed.searchParams);
  parsed.search = parsed.searchParams.toString() ? `?${parsed.searchParams.toString()}` : '';

  const normalizedUrl = parsed.href;
  const { domain, label } = resolveSourceLabel(normalizedHost);

  return {
    isValid: true,
    normalizedUrl,
    sourceDomain: domain,
    sourceLabel: label,
    inputSource: resolveInputSource(domain),
    error: null
  };
}

/**
 * Input nesnesine normalize edilmiş URL meta alanlarını ekler.
 * @param {object} input
 * @param {object} [options]
 */
export function attachListingUrlFields(input = {}, options = {}) {
  const raw = String(input.listing_url ?? '').trim();
  const resultSource = resolveResultSource(input, options);
  const urlMode = resolveUrlMode({ ...input, listing_url: raw || null }, options);

  if (!raw) {
    return {
      ...input,
      listing_url: null,
      normalized_url: null,
      source_domain: null,
      source_label: null,
      input_source: 'manual',
      result_source: resultSource,
      url_mode: urlMode
    };
  }

  const parsed = parseListingUrl(raw);
  if (!parsed.isValid) {
    return { ...input, _urlError: parsed.error };
  }

  return {
    ...input,
    listing_url: parsed.normalizedUrl,
    normalized_url: parsed.normalizedUrl,
    source_domain: parsed.sourceDomain,
    source_label: parsed.sourceLabel,
    input_source: parsed.inputSource,
    result_source: resultSource,
    url_mode: urlMode
  };
}

export function buildListingAnalysisMetadata(input = {}) {
  const listingUrl = input.listing_url || null;
  const normalizedUrl = input.normalized_url || listingUrl || null;

  return {
    listing_url: listingUrl,
    normalized_url: normalizedUrl,
    input_source: input.input_source || (listingUrl ? 'external_url' : 'manual'),
    result_source: input.result_source || 'rules_engine',
    url_mode: input.url_mode || (listingUrl ? 'paste_url' : 'manual'),
    source_label: input.source_label || null
  };
}

/**
 * @param {object} input
 * @param {'vehicle'|'housing'} listingType
 * @param {object} result
 */
export function buildListingAnalysisEventPayload(input = {}, listingType, result = {}) {
  return {
    ...buildListingAnalysisMetadata(input),
    listing_type: listingType,
    decision_score: result.decisionScore ?? null,
    confidence_score: result.confidenceScore ?? null
  };
}

export function sanitizeListingInputForStorage(input = {}) {
  const clean = { ...input };
  delete clean._urlError;
  delete clean._url_mode;
  return clean;
}

export function buildResultSourceMeta(input = {}) {
  const metadata = buildListingAnalysisMetadata(input);

  if (!metadata.listing_url) {
    return {
      listingUrl: null,
      domain: null,
      label: null,
      mode: null,
      inputSource: metadata.input_source,
      resultSource: metadata.result_source,
      urlMode: metadata.url_mode
    };
  }

  return {
    listingUrl: metadata.listing_url,
    domain: input.source_domain || null,
    label: metadata.source_label || 'Diğer',
    mode: metadata.url_mode,
    inputSource: metadata.input_source,
    resultSource: metadata.result_source,
    urlMode: metadata.url_mode
  };
}
