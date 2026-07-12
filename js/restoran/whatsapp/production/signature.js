/**
 * GarsonAI WhatsApp webhook imza doğrulama.
 */

/**
 * @param {string} hex
 * @returns {Uint8Array}
 */
function hexToBytes(hex) {
  const normalized = String(hex || '').trim();
  if (!normalized || normalized.length % 2 !== 0) {
    return new Uint8Array();
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @returns {boolean}
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0;
}

/**
 * @param {string|ArrayBuffer|Uint8Array} rawBody
 * @param {string} signatureHeader
 * @param {string} appSecret
 * @returns {Promise<boolean>}
 */
export async function verifyWebhookSignature(rawBody, signatureHeader, appSecret) {
  const secret = String(appSecret || '').trim();
  const signature = String(signatureHeader || '').trim();
  if (!secret || !signature) return false;

  const prefix = 'sha256=';
  if (!signature.startsWith(prefix)) return false;

  const receivedHex = signature.slice(prefix.length);
  const receivedBytes = hexToBytes(receivedHex);
  if (!receivedBytes.length) return false;

  const encoder = new TextEncoder();
  const body =
    typeof rawBody === 'string'
      ? encoder.encode(rawBody)
      : rawBody instanceof Uint8Array
        ? rawBody
        : new Uint8Array(rawBody);

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, body);
  const computedBytes = new Uint8Array(digest);
  return timingSafeEqual(computedBytes, receivedBytes);
}
