const crypto = require('crypto');

const buckets = new Map();

const hash = (value = '') => crypto
  .createHash('sha256')
  .update(String(value))
  .digest('hex')
  .slice(0, 24);

const getHeader = (headers = {}, name) => headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];

const getBearerToken = (headers = {}) => {
  const authHeader = getHeader(headers, 'authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
};

const getClientKey = (event = {}, scope = 'default') => {
  const headers = event.headers || {};
  const forwardedFor = getHeader(headers, 'x-forwarded-for') || '';
  const token = getBearerToken(headers);
  const userKey = event.userId || event.claims?.sub || token;
  const ip = forwardedFor.split(',')[0].trim() || getHeader(headers, 'client-ip') || getHeader(headers, 'x-nf-client-connection-ip') || event.rawUrl || 'anonymous';
  return `${scope}:${userKey ? 'user:' + hash(userKey) : 'ip:' + hash(ip)}`;
};

const checkRateLimit = (event, options = {}) => {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 30;
  const now = Date.now();
  const key = getClientKey(event, options.scope);
  const current = buckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (current.resetAt <= now) {
    current.count = 0;
    current.resetAt = now + windowMs;
  }

  current.count += 1;
  buckets.set(key, current);

  return {
    limited: current.count > max,
    remaining: Math.max(0, max - current.count),
    resetAt: current.resetAt,
    limit: max,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  };
};

const withRateLimitHeaders = (response, limit) => ({
  ...response,
  headers: {
    ...(response.headers || {}),
    'X-RateLimit-Limit': String(limit.limit),
    'X-RateLimit-Remaining': String(limit.remaining),
    'X-RateLimit-Reset': String(Math.ceil(limit.resetAt / 1000)),
    ...(limit.limited ? { 'Retry-After': String(limit.retryAfter) } : {})
  }
});

module.exports = { checkRateLimit, withRateLimitHeaders };
