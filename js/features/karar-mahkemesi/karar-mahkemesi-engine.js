/**
 * Karar Mahkemesi — deterministic Bekleme Skoru ve aksiyon etiketi (frontend-only).
 * Mevcut intel / topResult / formData çıktılarını okur; skor motorlarını değiştirmez.
 */
import { clampScore } from '../results/results-engine.js';

/** @type {ReadonlyArray<string>} */
export const KARAR_MAHKEMESI_FORBIDDEN_PHRASES = Object.freeze([
  'kesin al',
  'kesin alınır',
  'kaçırılmaz fırsat',
  'garanti kazanç',
  'garantili kazanç',
  'mutlaka satın al',
  'mutlaka al',
  'yatırım tavsiyesi',
  'finansal tavsiye',
  'zarar etmezsin',
  'hemen al',
  'garanti'
]);

/** @type {Readonly<Record<string, string>>} */
export const KARAR_AKSIYON_ETIKETLERI = Object.freeze({
  AL: 'Al',
  BEKLE: 'Bekle',
  PAZARLIK: 'Pazarlık yap',
  VAZGEC: 'Vazgeç',
  DAHA_FAZLA_VERI: 'Daha fazla veri gerekli'
});

const AUTO_CRITICAL_FIELDS = Object.freeze(['budget', 'usage']);

function normalizeObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isFieldPresent(input, field) {
  const raw = input?.[field];
  if (raw == null) return false;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0;
  if (typeof raw === 'boolean') return raw;
  if (Array.isArray(raw)) return raw.length > 0;
  return String(raw).trim().length > 0;
}

/**
 * @param {object[]} riskAnalysis
 * @returns {number}
 */
function countHighRisks(riskAnalysis) {
  return (riskAnalysis || []).filter((item) => {
    const level = String(item?.level || '').toLowerCase();
    return level === 'yüksek' || level === 'high';
  }).length;
}

/**
 * @param {object} topResult
 * @param {object} formData
 * @returns {number|null}
 */
function readTcoPressure(topResult = {}, formData = {}) {
  const budget = safeNumber(formData.budget);
  if (budget <= 0) return null;

  const totalCost = safeNumber(
    topResult?.costs?.ownership?.totals?.months12 ??
      topResult?.costs?.total ??
      topResult?.costs?.ownership?.totals?.months36
  );
  if (totalCost <= 0) return null;

  return totalCost / budget;
}

/**
 * @param {number} confidenceScore
 * @param {object} formData
 * @param {object} intel
 * @returns {boolean}
 */
function hasInsufficientData(confidenceScore, formData = {}, intel = {}) {
  if (confidenceScore > 0 && confidenceScore < 55) return true;

  const missingCritical = AUTO_CRITICAL_FIELDS.some((field) => !isFieldPresent(formData, field));
  if (missingCritical) return true;

  const warnings = Array.isArray(intel.warnings) ? intel.warnings : [];
  if (confidenceScore < 55 && warnings.length >= 2) return true;

  return false;
}

/**
 * @param {object} params
 * @returns {number}
 */
export function buildBeklemeSkoru({ intel = {}, formData = {}, topResult = {} } = {}) {
  const safeIntel = normalizeObject(intel);
  const safeForm = normalizeObject(formData);
  const safeTop = normalizeObject(topResult);

  const decisionScore = clampScore(safeNumber(safeIntel.decisionScore ?? safeTop.score ?? 50));
  const confidenceScore = clampScore(safeNumber(safeIntel.confidenceScore ?? 50));
  const level = String(safeIntel.recommendationLevel || '');

  let score = (100 - decisionScore) * 0.38;
  score += (100 - confidenceScore) * 0.22;

  const levelBoost = {
    proceed: -12,
    proceed_with_caution: 14,
    wait: 24,
    avoid: 32
  };
  score += levelBoost[level] ?? 10;

  const overallRisk = String(safeIntel.overallRisk || '');
  if (overallRisk === 'Yüksek') score += 14;
  else if (overallRisk === 'Orta') score += 7;

  score += Math.min(countHighRisks(safeIntel.riskAnalysis) * 5, 15);
  score += Math.min((safeIntel.warnings || []).length * 3, 9);

  const pressure = readTcoPressure(safeTop, safeForm);
  if (pressure != null) {
    if (pressure > 1.08) score += 14;
    else if (pressure > 0.95) score += 7;
    else if (pressure < 0.85) score -= 6;
  }

  const matchScore = safeNumber(safeTop.score);
  if (matchScore > 0 && matchScore < 58) {
    score += (58 - matchScore) * 0.18;
  }

  const metaScore = safeNumber(safeTop.confidenceMeta?.score);
  if (metaScore > 0 && metaScore < 50) {
    score += (50 - metaScore) * 0.12;
  }

  return clampScore(score);
}

/**
 * @param {object} params
 * @returns {string}
 */
export function resolveKararAksiyonEtiketi({
  beklemeSkoru,
  intel = {},
  formData = {},
  topResult = {}
} = {}) {
  const safeIntel = normalizeObject(intel);
  const safeForm = normalizeObject(formData);
  const safeTop = normalizeObject(topResult);

  const confidenceScore = safeNumber(safeIntel.confidenceScore);
  const decisionScore = clampScore(safeNumber(safeIntel.decisionScore ?? safeTop.score ?? 0));
  const level = String(safeIntel.recommendationLevel || '');
  const overallRisk = String(safeIntel.overallRisk || '');
  const waitScore = clampScore(
    beklemeSkoru ?? buildBeklemeSkoru({ intel: safeIntel, formData: safeForm, topResult: safeTop })
  );
  const pressure = readTcoPressure(safeTop, safeForm);

  if (hasInsufficientData(confidenceScore, safeForm, safeIntel)) {
    return KARAR_AKSIYON_ETIKETLERI.DAHA_FAZLA_VERI;
  }

  if (level === 'avoid') {
    return KARAR_AKSIYON_ETIKETLERI.VAZGEC;
  }

  if (level === 'wait' || level === 'proceed_with_caution' || waitScore >= 62) {
    return KARAR_AKSIYON_ETIKETLERI.BEKLE;
  }

  const hasBudgetPressure = pressure != null && pressure >= 0.95 && pressure <= 1.12;
  const mediumDecisionBand = decisionScore >= 52 && decisionScore < 78;

  if (hasBudgetPressure && (mediumDecisionBand || (waitScore >= 38 && waitScore < 62))) {
    return KARAR_AKSIYON_ETIKETLERI.PAZARLIK;
  }

  const lowRisk = overallRisk !== 'Yüksek';
  const strongDecision = decisionScore >= 72 && waitScore < 42;

  if (level === 'proceed' && confidenceScore >= 55 && lowRisk && strongDecision) {
    return KARAR_AKSIYON_ETIKETLERI.AL;
  }

  if (confidenceScore >= 60 && lowRisk && decisionScore >= 75 && waitScore < 45) {
    return KARAR_AKSIYON_ETIKETLERI.AL;
  }

  if (hasBudgetPressure && decisionScore < 78) {
    return KARAR_AKSIYON_ETIKETLERI.PAZARLIK;
  }

  if (waitScore >= 48) {
    return KARAR_AKSIYON_ETIKETLERI.BEKLE;
  }

  return KARAR_AKSIYON_ETIKETLERI.BEKLE;
}

/**
 * @param {object} params
 * @returns {string[]}
 */
export function buildKararMahkemesiGerekceler({ intel = {}, formData = {}, topResult = {} } = {}) {
  const safeIntel = normalizeObject(intel);
  const safeForm = normalizeObject(formData);
  const safeTop = normalizeObject(topResult);

  /** @type {string[]} */
  const items = [];

  const decisionScore = clampScore(safeNumber(safeIntel.decisionScore ?? safeTop.score ?? 0));
  const confidenceScore = clampScore(safeNumber(safeIntel.confidenceScore ?? 0));
  const level = String(safeIntel.recommendationLevel || '');
  const overallRisk = String(safeIntel.overallRisk || 'Orta');
  const pressure = readTcoPressure(safeTop, safeForm);
  const highRisks = countHighRisks(safeIntel.riskAnalysis);

  if (decisionScore >= 75) {
    items.push(`Karar skoru ${decisionScore}/100 bandında; profil ile uyum güçlü görünüyor.`);
  } else if (decisionScore >= 55) {
    items.push(`Karar skoru ${decisionScore}/100; seçenek değerlendirilebilir ancak marj sınırlı.`);
  } else {
    items.push(`Karar skoru ${decisionScore}/100; mevcut koşullarda temkinli yaklaşım öne çıkıyor.`);
  }

  if (confidenceScore >= 70) {
    items.push('Girdi kalitesi yeterli; sonuçlar güvenilir veri setiyle destekleniyor.');
  } else if (confidenceScore >= 55) {
    items.push('Veri güveni orta bantta; teklif ve maliyet kalemlerini doğrulamak faydalı olabilir.');
  } else {
    items.push('Veri güveni düşük; bütçe, kullanım ve maliyet girdilerini tamamlamak sonucu netleştirir.');
  }

  if (pressure != null) {
    const pct = Math.round(pressure * 100);
    if (pressure > 1.08) {
      items.push(`12 aylık TCO, bütçe hedefinin yaklaşık %${pct} seviyesinde; maliyet baskısı belirgin.`);
    } else if (pressure > 0.95) {
      items.push(`12 aylık TCO bütçe ile yakın (%${pct}); fiyat ve finansman senaryolarını karşılaştırmak uygun olabilir.`);
    } else {
      items.push(`12 aylık TCO bütçe altında modelleniyor (%${pct}); operasyonel yük görece kontrollü.`);
    }
  }

  if (highRisks >= 2 || overallRisk === 'Yüksek') {
    items.push('Birden fazla yüksek risk kalemi var; acele karar yerine doğrulama adımları öncelikli.');
  } else if (overallRisk === 'Orta') {
    items.push('Genel risk orta bantta; sigorta, bakım ve ikinci el emsalleri kontrol edilmeli.');
  } else {
    items.push('Genel risk düşük bantta; temel maliyet ve kullanım uyumu dengeli görünüyor.');
  }

  const levelNotes = {
    proceed: 'Sistem ilerlenebilir profil görüyor; yine de teklif doğrulaması önerilir.',
    proceed_with_caution: 'Dikkatli ilerle profili: kısa vadede ek veri toplamak kararı güçlendirebilir.',
    wait: 'Ertelenmeli profil: piyasa ve teklif koşullarını izlemek mantıklı olabilir.',
    avoid: 'Şu an önerilmez profil: alternatif segment veya bütçe revizyonu düşünülebilir.'
  };
  if (levelNotes[level]) {
    items.push(levelNotes[level]);
  }

  const factors = Array.isArray(safeIntel.scoreFactors) ? safeIntel.scoreFactors : [];
  const factorReason = factors.find((f) => f?.reason)?.reason;
  if (factorReason) {
    items.push(String(factorReason));
  }

  const warnings = Array.isArray(safeIntel.warnings) ? safeIntel.warnings : [];
  if (warnings[0]) {
    items.push(String(warnings[0]));
  }

  const cautions = Array.isArray(safeTop.risks) ? safeTop.risks : [];
  if (cautions[0] && items.length < 5) {
    items.push(String(cautions[0]));
  }

  const unique = [...new Set(items.map((s) => String(s).trim()).filter(Boolean))];
  return unique.slice(0, 5);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsForbiddenKararPhrase(text) {
  const normalized = String(text || '').toLocaleLowerCase('tr-TR');
  return KARAR_MAHKEMESI_FORBIDDEN_PHRASES.some((phrase) => normalized.includes(phrase));
}

/**
 * @param {object} params
 * @returns {object}
 */
export function buildKararMahkemesiModel({ intel = {}, formData = {}, topResult = {} } = {}) {
  const safeIntel = normalizeObject(intel);
  const safeForm = normalizeObject(formData);
  const safeTop = normalizeObject(topResult);

  const beklemeSkoru = buildBeklemeSkoru({
    intel: safeIntel,
    formData: safeForm,
    topResult: safeTop
  });

  const aksiyonEtiketi = resolveKararAksiyonEtiketi({
    beklemeSkoru,
    intel: safeIntel,
    formData: safeForm,
    topResult: safeTop
  });

  const gerekceler = buildKararMahkemesiGerekceler({
    intel: safeIntel,
    formData: safeForm,
    topResult: safeTop
  });

  const pressure = readTcoPressure(safeTop, safeForm);

  return {
    beklemeSkoru,
    aksiyonEtiketi,
    gerekceler,
    decisionScore: clampScore(safeNumber(safeIntel.decisionScore ?? safeTop.score ?? 0)),
    confidenceScore: clampScore(safeNumber(safeIntel.confidenceScore ?? 0)),
    recommendationLevel: String(safeIntel.recommendationLevel || ''),
    overallRisk: String(safeIntel.overallRisk || 'Orta'),
    uyumSkoru: clampScore(safeNumber(safeTop.score ?? 0)),
    tcoPressure: pressure != null ? Math.round(pressure * 1000) / 1000 : null,
    disclaimer:
      'Bilgilendirme amaçlıdır; kesin fiyat veya satın alma taahhüdü değildir. Nihai karar için teklif ve sözleşme koşullarını doğrulayın.'
  };
}
