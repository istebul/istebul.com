/**
 * isteBul enterprise brand voice — programmatic copy consistency.
 * Canonical data mirror: data/brand/brand-system.json (keep in sync).
 * @see docs/BRAND_SYSTEM.md
 */

const brandData = {
  brand: {
    name: 'isteBul',
    descriptor: 'Karar zekâsı platformu',
    tagline: 'Yüksek tutarlı satın alma kararlarını veriye dayalı netleştirir'
  },
  trustLanguage: {
    rail: [
      'KVKK uyumlu veri işleme',
      'Uçtan uca şifreleme (TLS)',
      'Kurumsal karar altyapısı',
      'Denetlenebilir metodoloji'
    ],
    proof: ['Taahhüt yok', 'Zorunlu satın alma yok', 'Stripe ile güvenli ödeme'],
    compliance: ['KVKK', 'GDPR-ready subprocessors', 'Çerez tercihleri']
  },
  productMessaging: {
    category: 'Karar zekâsı platformu',
    pillarAuto:
      'Araç satın alma kararını TCO, finansman ve güvenilirlik sinyalleriyle netleştirin'
  },
  cta: {
    primary: 'Karar analizini başlat',
    secondary: 'Metodolojiyi incele',
    tertiary: 'Planları görüntüle',
    authLogin: 'Giriş yap',
    authRegister: 'Hesap oluştur',
    proTrial: "Pro'yu 7 gün değerlendir",
    proContinueFree: 'Ücretsiz katmanla devam et',
    partner: 'Partner programına başvur',
    leadFinance: 'Finansman ön değerlendirmesini başlat',
    leadPartner: 'Partner eşleşmesini başlat'
  },
  toneOfVoice: {
    avoid: [
      'MVP',
      'startup',
      '2 dk ücretsiz',
      'hemen al',
      'son şans',
      'garanti kazanç'
    ]
  },
  consistency: {
    bannedPhrases: ['2 dk ücretsiz', 'hemen al', 'son şans', 'garanti kazanç']
  }
};

export const BRAND = Object.freeze({ ...brandData.brand });

export const CTA = Object.freeze({ ...brandData.cta });

export const TRUST_RAIL = Object.freeze([...brandData.trustLanguage.rail]);

export const TONE_AVOID = Object.freeze([...brandData.toneOfVoice.avoid]);

export const BANNED_PHRASES = Object.freeze([...brandData.consistency.bannedPhrases]);

/**
 * @param {keyof typeof CTA} key
 * @param {string} [fallback]
 */
export function getCta(key, fallback = '') {
  return CTA[key] ?? fallback;
}

/**
 * @param {'rail'|'proof'|'compliance'} section
 */
export function getTrustPhrases(section = 'rail') {
  const block = brandData.trustLanguage[section];
  return Array.isArray(block) ? [...block] : [];
}

/**
 * @param {'auto'|'platform'} product
 */
export function getProductMessage(product = 'auto') {
  if (product === 'platform') {
    return brandData.productMessaging.category;
  }
  return brandData.productMessaging.pillarAuto;
}

/**
 * @param {string} text
 */
export function containsBannedPhrase(text = '') {
  const lower = String(text).toLocaleLowerCase('tr-TR');
  return BANNED_PHRASES.some((phrase) => lower.includes(phrase.toLocaleLowerCase('tr-TR')));
}

/**
 * @param {string} text
 */
export function auditCopy(text = '') {
  const trimmed = String(text).trim();
  return {
    text: trimmed,
    ok: !containsBannedPhrase(trimmed),
    violations: BANNED_PHRASES.filter((p) =>
      trimmed.toLocaleLowerCase('tr-TR').includes(p.toLocaleLowerCase('tr-TR'))
    )
  };
}

export function getBrandSnapshot() {
  return {
    brand: { ...BRAND },
    cta: { ...CTA },
    trustRail: [...TRUST_RAIL],
    toneAvoid: [...TONE_AVOID]
  };
}

export default {
  BRAND,
  CTA,
  TRUST_RAIL,
  getCta,
  getTrustPhrases,
  getProductMessage,
  containsBannedPhrase,
  auditCopy,
  getBrandSnapshot
};
