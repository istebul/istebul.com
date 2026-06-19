/** Konut sihirbazı profil alanları — yalnızca AI açıklama katmanı (skor/formül dışı). */

export const CASH_BUFFER_OPTIONS = Object.freeze([
  ['0-1', '0-1 ay'],
  ['2-3', '2-3 ay'],
  ['4-6', '4-6 ay'],
  ['6+', '6+ ay']
]);

const LOCATION_PREF_THEMES = Object.freeze({
  ulasim: 'ulaşım erişimi',
  okul: 'okul yakınlığı',
  merkezeYakin: 'merkeze yakınlık',
  merkezi: 'merkezi konum',
  sessiz: 'sessiz bölge yaşamı',
  hastane: 'sağlık erişimi',
  is: 'iş merkezi yakınlığı'
});

function normalizeCashBuffer(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const match = CASH_BUFFER_OPTIONS.find(([key, label]) => key === raw || label === raw);
  return match ? match[0] : raw;
}

function formatHouseholdPhrase(size) {
  const n = Number(size);
  if (!Number.isFinite(n) || n < 1) return '';
  if (n === 1) return '1 kişilik hane';
  if (n === 2) return '2 kişilik hane';
  return `${n} kişilik hane`;
}

/**
 * Peşinat sonrası nakit güvenlik payı — AI why/risk metni.
 * @param {object} [answers]
 * @returns {string}
 */
export function buildKonutCashBufferInsightClause(answers = {}) {
  const band = normalizeCashBuffer(answers.cash_buffer_months);
  if (!band) return '';

  if (band === '0-1') {
    return 'Peşinat sonrası 0-1 aylık güvenlik payı, beklenmedik masraflarda nakit sıkışması riskini artırıyor';
  }
  if (band === '2-3') {
    return 'Peşinat sonrası 2-3 aylık güvenlik payı sınırlı; acil tamir ve taşınma giderleri için tampon dar';
  }
  if (band === '4-6') {
    return 'Peşinat sonrası 4-6 aylık güvenlik payı, kısa vadeli nakit dalgalanmalarına karşı makul bir tampon sunuyor';
  }
  if (band === '6+') {
    return 'Peşinat sonrası 6+ aylık güvenlik payı, konut geçişinde nakit esnekliğini güçlendiriyor';
  }
  return '';
}

/**
 * Lokasyon öncelikleri — AI why metni.
 * @param {object} [answers]
 * @returns {string}
 */
export function buildKonutLocationPreferenceInsightClause(answers = {}) {
  const prefs = Array.isArray(answers.locationPreferences) ? answers.locationPreferences : [];
  const riskPrefs = Array.isArray(answers.riskPreferences) ? answers.riskPreferences : [];
  const themes = prefs
    .map((key) => LOCATION_PREF_THEMES[key])
    .filter(Boolean);

  if (riskPrefs.some((item) => /değer artış|yatırım potansiyeli/i.test(String(item)))) {
    themes.push('yatırım potansiyeli');
  }

  const unique = [...new Set(themes)];
  if (!unique.length) return '';

  if (unique.length === 1) {
    return `Lokasyon önceliğiniz ${unique[0]} ekseninde; bu tercih mahalle ve konut tipi seçiminde belirleyici`;
  }
  const last = unique.pop();
  return `Lokasyon öncelikleriniz ${unique.join(', ')} ve ${last} eksenlerinde; bu profil mahalle ve konut tipi seçiminde belirleyici`;
}

/**
 * Hane büyüklüğü — oda/m², aile yaşamı, sürdürülebilir kullanım.
 * @param {object} [answers]
 * @returns {string}
 */
export function buildKonutHouseholdInsightClause(answers = {}) {
  const phrase = formatHouseholdPhrase(answers.householdSize);
  if (!phrase) return '';

  const n = Number(answers.householdSize);
  const roomHint = answers.roomCount ? `${answers.roomCount} oda planı` : 'oda/metrekare ihtiyacı';
  const sqmHint = answers.squareMeters ? `${answers.squareMeters} m² beklentisi` : null;

  if (n <= 2) {
    const parts = [`${phrase} için kompakt ${roomHint}`, sqmHint, 'sürdürülebilir kullanım'].filter(Boolean);
    return `${parts[0]}${sqmHint ? ` ve ${sqmHint}` : ''} değerlendirildi; ${parts[parts.length - 1]} ön planda`;
  }
  if (n <= 4) {
    const parts = [`${phrase} için aile yaşamına uygun ${roomHint}`, sqmHint, 'uzun vadeli konfor'].filter(Boolean);
    return `${parts[0]}${sqmHint ? ` (${sqmHint})` : ''} dikkate alındı; ${parts[parts.length - 1]} hedefleniyor`;
  }
  return `${phrase} için geniş oda/metrekare ihtiyacı ve aile yaşamı öncelikli; konutun sürdürülebilir kullanımı kritik`;
}

/**
 * Deprem hassasiyeti — mevcut girdi ve risk tercihlerinden açıklama (AFAD/skor üretmez).
 * @param {object} [answers]
 * @returns {string}
 */
export function buildKonutEarthquakeInsightClause(answers = {}) {
  const raw = answers.earthquakeRiskInput ?? answers.earthquakeRiskScore;
  const score = Number(raw);
  const riskPrefs = Array.isArray(answers.riskPreferences) ? answers.riskPreferences : [];
  const sensitive = riskPrefs.some((item) => /deprem/i.test(String(item)));

  if (!Number.isFinite(score) && !sensitive) return '';

  const parts = [];
  if (Number.isFinite(score)) {
    if (score >= 65) {
      parts.push('Girdiğiniz deprem/zemin risk seviyesi yüksek profilde');
    } else if (score >= 45) {
      parts.push('Girdiğiniz deprem/zemin risk seviyesi orta profilde');
    } else {
      parts.push('Girdiğiniz deprem/zemin risk seviyesi görece düşük profilde');
    }
  }
  if (sensitive) {
    parts.push('deprem riski hassasiyetiniz karar sürecinde öncelikli');
  }

  if (!parts.length) return '';
  return parts.join('; ') + '; resmi zemin/deprem raporu teyidi önerilir';
}

/**
 * Nakit güvenlik payına göre risk metni.
 * @param {object} [answers]
 * @returns {string}
 */
export function buildKonutCashBufferRiskClause(answers = {}) {
  const band = normalizeCashBuffer(answers.cash_buffer_months);
  if (band === '0-1') {
    return 'Peşinat sonrası kısa nakit tamponu, beklenmedik masraf ve aidat artışlarında sıkışma riski taşır.';
  }
  if (band === '2-3') {
    return 'Sınırlı nakit güvenlik payı, taşınma ve tadilat giderlerinde ek planlama gerektirebilir.';
  }
  return '';
}

/**
 * Nakit güvenlik payına göre sonraki adım önerisi.
 * @param {object} [answers]
 * @returns {string}
 */
export function buildKonutCashBufferNextStepClause(answers = {}) {
  const band = normalizeCashBuffer(answers.cash_buffer_months);
  if (band === '0-1' || band === '2-3') {
    return 'Peşinat sonrası en az 3 aylık yaşam gideri tamponu için nakit akışınızı tabloya dökün.';
  }
  return '';
}
