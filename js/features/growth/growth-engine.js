/**
 * Growth engine — channel registry, attribution enrichment, predictable loops.
 */
import { analytics } from '../../core/analytics.js';
import { readStorageRaw, writeStorageRaw, STORAGE_KEYS } from '../../core/storage-keys.js';
import { trackPricingViewFunnel } from './growth-funnel.js';

export const GROWTH_CHANNELS = Object.freeze({
  SEO: 'seo',
  PAID: 'paid',
  REFERRAL: 'referral',
  PARTNER: 'partner',
  LIFECYCLE_EMAIL: 'lifecycle_email',
  CRM_REACTIVATION: 'crm_reactivation',
  ABANDONED_LEAD: 'abandoned_lead',
  RETARGETING: 'retargeting',
  VIRAL: 'viral'
});

/** Map utm_medium / ref to growth channel id */
export function resolveGrowthChannel(attribution = {}) {
  const ref = attribution.ref || attribution.referral_code;
  if (ref) return GROWTH_CHANNELS.REFERRAL;

  const medium = String(attribution.utm_medium || '').toLowerCase();
  const source = String(attribution.utm_source || '').toLowerCase();

  if (medium === 'organic' || source === 'google') return GROWTH_CHANNELS.SEO;
  if (medium === 'cpc' || medium === 'paid' || attribution.gclid) return GROWTH_CHANNELS.PAID;
  if (medium === 'email' || medium === 'lifecycle') return GROWTH_CHANNELS.LIFECYCLE_EMAIL;
  if (medium === 'reactivation' || source === 'crm') return GROWTH_CHANNELS.CRM_REACTIVATION;
  if (medium === 'abandon' || source === 'recovery') return GROWTH_CHANNELS.ABANDONED_LEAD;
  if (medium === 'display' || source === 'retargeting') return GROWTH_CHANNELS.RETARGETING;
  if (medium === 'share' || source === 'viral') return GROWTH_CHANNELS.VIRAL;
  if (source === 'referral' || medium === 'invite') return GROWTH_CHANNELS.REFERRAL;
  if (source === 'partner') return GROWTH_CHANNELS.PARTNER;

  return source || 'direct';
}

export function getStoredReferralCode() {
  return readStorageRaw(STORAGE_KEYS.REFERRAL_CODE) || '';
}

export function normalizeReferralCode(raw) {
  const code = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 16);
  return code.length >= 4 ? code : '';
}

export function storeReferralCode(code) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return;
  writeStorageRaw(STORAGE_KEYS.REFERRAL_CODE, normalized);
}

/**
 * Context attached to leads and high-value events.
 */
export function getGrowthContext() {
  const attribution = analytics.getAttribution();
  return {
    ...attribution,
    referral_code: getStoredReferralCode() || attribution.ref || null,
    growth_channel: resolveGrowthChannel(attribution),
    growth_campaign: attribution.growth_campaign || attribution.utm_campaign || null
  };
}

export function enrichLeadMetadata(metadata = {}) {
  return {
    ...metadata,
    growth: getGrowthContext()
  };
}

export function trackGrowth(eventName, properties = {}, meta = {}) {
  analytics.track(eventName, properties, {
    category: 'growth',
    funnel: meta.funnel || properties.growth_channel || resolveGrowthChannel(),
    funnel_step: meta.funnel_step || eventName,
    ...meta
  });
}

export function buildReferralUrl(code, path = '/auto/') {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.istebul.com';
  const url = new URL(path, base);
  url.searchParams.set('ref', code);
  url.searchParams.set('utm_source', 'referral');
  url.searchParams.set('utm_medium', 'invite');
  return url.toString();
}

/**
 * Build tracked URL for a growth channel (paid, seo, referral, etc.).
 * @param {string} channelId — key from channels.json
 * @param {string} [targetPath]
 */
export function buildChannelCampaignUrl(channelId, targetPath = '/auto/') {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.istebul.com';
  const url = new URL(targetPath, base);
  const defaults = {
    seo: { utm_source: 'google', utm_medium: 'organic' },
    paid: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'brand_auto' },
    referral: { utm_source: 'referral', utm_medium: 'invite' },
    lifecycle_email: { utm_source: 'email', utm_medium: 'lifecycle' },
    retargeting: { utm_source: 'retargeting', utm_medium: 'display' },
    viral: { utm_source: 'viral', utm_medium: 'share' }
  };
  const utm = defaults[channelId] || { utm_source: channelId, utm_medium: 'campaign' };
  Object.entries(utm).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('growth_campaign', utm.utm_campaign || channelId);
  return url.toString();
}

export function buildRecoveryUrl(campaign = 'abandon_lead') {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.istebul.com';
  const url = new URL('/auto/', base);
  url.searchParams.set('utm_source', 'recovery');
  url.searchParams.set('utm_medium', 'abandon');
  url.searchParams.set('growth_campaign', campaign);
  return url.toString();
}

/**
 * Stable invite code for sharing (derived from email, stored locally).
 * @param {string} email
 */
export function generateReferralCodeFromEmail(email) {
  const local = String(email || '')
    .split('@')[0]
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
    .slice(0, 10);
  const hash = [...String(email || 'ib')].reduce(
    (acc, char) => ((acc << 5) - acc) + char.charCodeAt(0),
    0
  );
  const suffix = Math.abs(hash).toString(36).slice(0, 4);
  return `${local || 'ib'}${suffix}`.slice(0, 16);
}

export function getMyReferralCode(email = '') {
  const stored = readStorageRaw(STORAGE_KEYS.MY_REFERRAL_CODE);
  if (stored) return stored;

  const resolvedEmail = email || readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL) || '';
  if (!resolvedEmail) return '';

  const code = generateReferralCodeFromEmail(resolvedEmail);
  writeStorageRaw(STORAGE_KEYS.MY_REFERRAL_CODE, code);
  return code;
}

export function trackPricingView(placement = 'pricing') {
  trackPricingViewFunnel(placement);
}

/**
 * @param {{ email?: string, title?: string, compact?: boolean }} [options]
 */
export function renderReferralSharePanel(options = {}) {
  const email = options.email || readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL) || '';
  const code = getMyReferralCode(email);
  if (!code) return '';

  const shareUrl = buildReferralUrl(code);
  const title = options.title || 'Arkadaşınıza önerin, ödül kazanın';
  const intro = options.compact
    ? 'Davet linkinizle ücretsiz Auto analizi başlatırlar. Başarılı davetlerde siz kazanırsınız.'
    : 'Her başarılı davet için: 7 gün Pro erişimi, +2 ekstra analiz hakkı ve premium açıklama kilidi açılır. Davet kodunuz otomatik işlenir.';

  return `
    <section class="growth-referral-card" data-referral-share data-referral-code="${code}" aria-label="Davet linki">
      <div>
        <p class="kicker">Davet programı</p>
        <h4>${title}</h4>
        <p class="growth-referral-copy">${intro}</p>
        <ul class="growth-referral-rewards" aria-label="Davet ödülleri">
          <li>7 gün Pro erişimi</li>
          <li>+2 ekstra Auto analiz</li>
          <li>Premium açıklama kilidi</li>
        </ul>
        <p class="growth-referral-url"><code>${shareUrl}</code></p>
      </div>
      <div class="growth-referral-actions">
        <button type="button" class="btn btn-outline btn-sm" data-referral-copy>Linki kopyala</button>
        <button type="button" class="btn btn-outline btn-sm" data-referral-native-share hidden>Paylaş</button>
        <a class="btn btn-primary btn-sm" href="https://wa.me/?text=${encodeURIComponent(`Araç alırken toplam maliyeti birlikte görün: ${shareUrl}`)}"
          target="_blank" rel="noopener noreferrer" data-referral-whatsapp>WhatsApp</a>
      </div>
      <p class="growth-referral-fineprint">Ödüller aylık kotayla sınırlıdır; kendi hesabınızı davet edemezsiniz.</p>
    </section>
  `;
}

/**
 * Wire copy / WhatsApp share buttons inside a container.
 * @param {ParentNode} root
 */
export function bindReferralShare(root) {
  if (!root) return;

  root.querySelectorAll('[data-referral-share]').forEach((card) => {
    const code = card.dataset.referralCode || getMyReferralCode();
    if (!code) return;

    const url = buildReferralUrl(code);

    const nativeBtn = card.querySelector('[data-referral-native-share]');
    if (nativeBtn && typeof navigator.share === 'function') {
      nativeBtn.hidden = false;
      nativeBtn.addEventListener('click', async () => {
        try {
          await navigator.share({
            title: 'isteBul Auto',
            text: 'Araç alımında toplam maliyeti gör',
            url
          });
          trackGrowth('growth_referral_share', { code, method: 'native' }, {
            funnel: 'referral',
            funnel_step: 'native_share'
          });
        } catch {
          /* user cancelled */
        }
      });
    }

    card.querySelector('[data-referral-copy]')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* fallback: select code element */
      }
      trackGrowth('growth_referral_share', { code, method: 'copy' }, {
        funnel: 'referral',
        funnel_step: 'copy_link'
      });
    });

    card.querySelector('[data-referral-whatsapp]')?.addEventListener('click', () => {
      trackGrowth('growth_referral_share', { code, method: 'whatsapp' }, {
        funnel: 'referral',
        funnel_step: 'whatsapp'
      });
      trackGrowth('growth_viral_share', { code, channel: 'whatsapp' }, {
        funnel: 'viral',
        funnel_step: 'whatsapp'
      });
    });
  });
}

export const GROWTH_LOOPS = Object.freeze([
  {
    id: 'content_to_lead',
    trigger: 'SEO landing → Auto wizard',
    metric: 'organic_leads / 1000 sessions'
  },
  {
    id: 'lead_to_partner',
    trigger: 'Lead submit → partner dispatch',
    metric: 'dispatch_success_rate'
  },
  {
    id: 'abandon_to_recovery',
    trigger: 'Modal open w/o submit → email/SMS',
    metric: 'recovery_conversion_rate'
  },
  {
    id: 'referral_viral',
    trigger: 'Success screen → share link ?ref=',
    metric: 'invites_per_winner'
  },
  {
    id: 'crm_reactivation',
    trigger: 'Stale lead → outbound → return visit',
    metric: 'reactivated_leads / week'
  }
]);
