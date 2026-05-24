/**
 * CAPI payload builders — Web Crypto only (Cloudflare Pages / Workers compatible).
 */

async function sha256Hex(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Meta Conversions API payload (v18+).
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api
 */
export async function buildMetaCapiPayload({
  pixelId,
  eventName,
  eventTime,
  eventId,
  attribution = {},
  user = {},
  customData = {}
}) {
  const metaEventMap = {
    lead_submit: 'Lead',
    checkout_start: 'InitiateCheckout',
    checkout_complete: 'Purchase',
    paid_conversion: 'Purchase',
    paid_landing_view: 'ViewContent',
    pricing_view: 'ViewContent'
  };

  const userData = {};
  if (user.email) userData.em = [await sha256Hex(user.email)];
  if (user.phone) userData.ph = [await sha256Hex(user.phone.replace(/\D/g, ''))];
  if (attribution.fbc || attribution.fbclid) {
    userData.fbc = attribution.fbc || `fb.1.${eventTime}.${attribution.fbclid}`;
  }
  if (attribution.fbp) userData.fbp = attribution.fbp;

  return {
    data: [
      {
        event_name: metaEventMap[eventName] || 'Lead',
        event_time: eventTime,
        event_id: eventId,
        action_source: 'website',
        event_source_url: user.event_source_url || 'https://www.istebul.com',
        user_data: userData,
        custom_data: {
          ...customData,
          utm_campaign: attribution.utm_campaign || undefined,
          paid_platform: attribution.paid_platform || undefined
        }
      }
    ]
  };
}

/**
 * Google Ads offline / enhanced conversion stub (log + future API hook).
 */
export async function buildGoogleAdsConversionPayload({
  conversionActionId,
  eventName,
  eventTime,
  attribution = {},
  user = {}
}) {
  return {
    conversion_action: conversionActionId,
    conversion_date_time: new Date(eventTime * 1000).toISOString(),
    gclid: attribution.gclid || attribution.gbraid || attribution.wbraid || null,
    order_id: attribution.order_id || null,
    user_identifiers: {
      hashed_email: user.email ? await sha256Hex(user.email) : null,
      hashed_phone: user.phone ? await sha256Hex(user.phone) : null
    },
    event_name: eventName
  };
}

export { sha256Hex as sha256 };
