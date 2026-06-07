/**
 * Executive Decision Report v1 — category action plans (Sprint-26).
 */

import { sanitizeExecutiveReportText } from './report-summary-engine.js';

/** @type {Readonly<Record<string, Record<string, string[]>>>} */
export const CATEGORY_ACTION_PLANS = Object.freeze({
  vehicle: {
    immediateActions: [
      'İlan detaylarını ve fiyat bilgisini doğrula',
      'Tramer / hasar kaydı sorgula',
      'Ekspertiz raporu talep et'
    ],
    beforeNegotiation: [
      'Piyasa emsal fiyatlarını karşılaştır',
      'Kilometre ve bakım geçmişini kontrol et',
      'Ruhsat / şasi bilgilerini doğrula'
    ],
    beforePurchase: [
      'Toplam maliyet simülasyonunu gözden geçir',
      'Sigorta ve vergi maliyetlerini hesapla',
      'Satıcı ile yazılı koşulları netleştir'
    ],
    documentsToCheck: [
      'Tramer / hasar kaydı',
      'Ekspertiz raporu',
      'Ruhsat fotokopisi',
      'Servis bakım kayıtları'
    ],
    finalReview: [
      'Tüm belgelerin tutarlılığını kontrol et',
      'Son fiyat teklifini maliyet planıyla karşılaştır',
      'Nihai kararı kişisel ihtiyaçlarla eşleştir'
    ]
  },
  housing: {
    immediateActions: [
      'Tapu durumunu sorgula',
      'İlan fiyatını emsal ile karşılaştır',
      'Aidat ve gider kalemlerini netleştir'
    ],
    beforeNegotiation: [
      'İskân belgesi durumunu doğrula',
      'Deprem / bina bilgilerini incele',
      'Finansman maliyet senaryolarını hesapla'
    ],
    beforePurchase: [
      'Emsal fiyat analizini tamamla',
      'Toplam sahip olma maliyetini gözden geçir',
      'Satıcı ile yazılı koşulları netleştir'
    ],
    documentsToCheck: [
      'Tapu kaydı',
      'İskân belgesi',
      'Aidat makbuzları',
      'Deprem dayanım raporu'
    ],
    finalReview: [
      'Tüm belgelerin tutarlılığını kontrol et',
      'Finansman planını maliyet simülasyonuyla karşılaştır',
      'Nihai kararı kişisel ihtiyaçlarla eşleştir'
    ]
  },
  vacation: {
    immediateActions: [
      'İptal koşullarını oku',
      'Konum ve tarih bilgisini doğrula',
      'Ek ücret kalemlerini kontrol et'
    ],
    beforeNegotiation: [
      'Yorum geçmişini incele',
      'Tarih / kapasite uyumunu doğrula',
      'Alternatif paketleri karşılaştır'
    ],
    beforePurchase: [
      'Toplam seyahat maliyetini hesapla',
      'İptal ve iade koşullarını netleştir',
      'Rezervasyon detaylarını yazılı al'
    ],
    documentsToCheck: [
      'Rezervasyon sözleşmesi',
      'İptal koşulları',
      'Ödeme planı',
      'Sigorta / ek hizmet detayları'
    ],
    finalReview: [
      'Tüm koşulların beklentilerle uyumunu kontrol et',
      'Toplam maliyeti bütçe planıyla karşılaştır',
      'Nihai kararı seyahat planıyla eşleştir'
    ]
  }
});

/**
 * @param {string} category
 * @returns {keyof typeof CATEGORY_ACTION_PLANS}
 */
function resolveCategoryKey(category) {
  const cat = String(category ?? 'vehicle').toLowerCase();
  if (cat.includes('housing') || cat === 'konut' || cat === 'real_estate') return 'housing';
  if (cat.includes('vacation') || cat === 'tatil' || cat === 'travel') return 'vacation';
  return 'vehicle';
}

/**
 * @param {string[]} items
 * @returns {string[]}
 */
function sanitizeActions(items) {
  return items.map((item) => sanitizeExecutiveReportText(item));
}

/**
 * @param {string} category
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>|null} purchaseDecision
 * @returns {Record<string, string[]>}
 */
export function buildActionPlan(category, signals, purchaseDecision) {
  const key = resolveCategoryKey(category);
  const template = CATEGORY_ACTION_PLANS[key];

  const primaryAction = String(purchaseDecision?.primaryAction ?? 'evaluate');
  const missing = Array.isArray(signals.missingCritical) ? signals.missingCritical : [];

  /** @type {string[]} */
  const immediateActions = [...template.immediateActions];
  for (const field of missing.slice(0, 2)) {
    immediateActions.push(`${field} bilgisini talep et`);
  }

  /** @type {string[]} */
  const beforeNegotiation = [...template.beforeNegotiation];
  if (primaryAction === 'negotiate') {
    beforeNegotiation.unshift('Pazarlık senaryolarını gözden geçir');
  }

  /** @type {string[]} */
  const beforePurchase = [...template.beforePurchase];
  if (primaryAction === 'wait') {
    beforePurchase.unshift('Alternatif ilanları karşılaştır');
  }

  return {
    immediateActions: sanitizeActions([...new Set(immediateActions)].slice(0, 6)),
    beforeNegotiation: sanitizeActions(beforeNegotiation.slice(0, 5)),
    beforePurchase: sanitizeActions(beforePurchase.slice(0, 5)),
    documentsToCheck: sanitizeActions(template.documentsToCheck),
    finalReview: sanitizeActions(template.finalReview)
  };
}
