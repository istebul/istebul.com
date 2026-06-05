/**
 * AI İlan Analizi V2 — URL parse ve güvenlik (scraping yok).
 */

const MAX_URL_LENGTH = 1000;

const BLOCKED_PROTOCOL_PREFIXES = ['javascript:', 'data:', 'file:', 'ftp:'];

const DOMAIN_LABELS = [
  { match: 'sahibinden.com', label: 'Sahibinden' },
  { match: 'arabam.com', label: 'Arabam' },
  { match: 'emlakjet.com', label: 'Emlakjet' },
  { match: 'hepsiemlak.com', label: 'Hepsiemlak' }
];

function invalid(error) {
  return {
    isValid: false,
    normalizedUrl: null,
    sourceDomain: null,
    sourceLabel: null,
    error
  };
}

function empty() {
  return {
    isValid: true,
    normalizedUrl: null,
    sourceDomain: null,
    sourceLabel: null,
    error: null
  };
}

function isPrivateOrBlockedHost(hostname) {
  const host = String(hostname || '').toLowerCase();
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
  const host = String(hostname || '').toLowerCase().replace(/^www\./, '');
  for (const entry of DOMAIN_LABELS) {
    if (host === entry.match || host.endsWith(`.${entry.match}`)) {
      return { domain: entry.match, label: entry.label };
    }
  }
  return { domain: host, label: 'Diğer' };
}

function stripUtmParams(searchParams) {
  for (const key of [...searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_')) {
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
      return invalid('Geçersiz URL protokolü.');
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
    return invalid('Yalnızca http ve https bağlantıları kabul edilir.');
  }

  if (isPrivateOrBlockedHost(parsed.hostname)) {
    return invalid('Bu bağlantı türüne izin verilmez.');
  }

  parsed.hash = '';
  const params = parsed.searchParams;
  stripUtmParams(params);
  parsed.search = params.toString() ? `?${params.toString()}` : '';

  const normalizedUrl = parsed.href;
  const { domain, label } = resolveSourceLabel(parsed.hostname);

  return {
    isValid: true,
    normalizedUrl,
    sourceDomain: domain,
    sourceLabel: label,
    error: null
  };
}

/**
 * Input nesnesine normalize edilmiş URL meta alanlarını ekler.
 * @param {object} input
 */
export function attachListingUrlFields(input = {}) {
  const raw = String(input.listing_url ?? '').trim();
  if (!raw) {
    return {
      ...input,
      listing_url: null,
      source_domain: null,
      source_label: null
    };
  }

  const parsed = parseListingUrl(raw);
  if (!parsed.isValid) {
    return { ...input, _urlError: parsed.error };
  }

  return {
    ...input,
    listing_url: parsed.normalizedUrl,
    source_domain: parsed.sourceDomain,
    source_label: parsed.sourceLabel
  };
}

export function buildResultSourceMeta(input = {}) {
  if (!input.listing_url) {
    return {
      listingUrl: null,
      domain: null,
      label: null,
      mode: null
    };
  }

  return {
    listingUrl: input.listing_url,
    domain: input.source_domain || null,
    label: input.source_label || 'Diğer',
    mode: 'user_provided_url_only'
  };
}
