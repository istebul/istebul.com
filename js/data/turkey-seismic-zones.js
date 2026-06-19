/**
 * İl bazlı temel deprem risk skoru (0–100) — TDTH zemin haritası / fay hattı profiline göre
 * bilgilendirme amaçlı statik taban. Canlı AFAD aktivite verisi ile harmanlanır.
 */
export const TURKEY_SEISMIC_BASE_RISK = Object.freeze({
  Adana: 62,
  Adıyaman: 78,
  Afyonkarahisar: 48,
  Ağrı: 72,
  Amasya: 52,
  Ankara: 55,
  Antalya: 58,
  Artvin: 65,
  Aydın: 68,
  Balıkesir: 72,
  Bartın: 58,
  Batman: 70,
  Bayburt: 68,
  Bilecik: 60,
  Bingöl: 75,
  Bitlis: 74,
  Bolu: 62,
  Burdur: 50,
  Bursa: 78,
  Çanakkale: 72,
  Çankırı: 48,
  Çorum: 50,
  Denizli: 55,
  Diyarbakır: 76,
  Düzce: 70,
  Edirne: 55,
  Elazığ: 78,
  Erzincan: 82,
  Erzurum: 72,
  Eskişehir: 52,
  Gaziantep: 76,
  Giresun: 58,
  Gümüşhane: 65,
  Hakkari: 70,
  Hatay: 80,
  Iğdır: 68,
  Isparta: 48,
  İstanbul: 85,
  İzmir: 82,
  Kahramanmaraş: 80,
  Karabük: 52,
  Karaman: 45,
  Kars: 68,
  Kastamonu: 55,
  Kayseri: 58,
  Kilis: 74,
  Kırıkkale: 50,
  Kırklareli: 52,
  Kırşehir: 45,
  Kocaeli: 82,
  Konya: 48,
  Kütahya: 55,
  Malatya: 78,
  Manisa: 72,
  Mardin: 74,
  Mersin: 65,
  Muğla: 62,
  Muş: 74,
  Nevşehir: 52,
  Niğde: 50,
  Ordu: 58,
  Osmaniye: 72,
  Rize: 68,
  Sakarya: 78,
  Samsun: 55,
  Şanlıurfa: 72,
  Siirt: 72,
  Sinop: 52,
  Sivas: 62,
  Tekirdağ: 75,
  Tokat: 58,
  Trabzon: 65,
  Tunceli: 78,
  Uşak: 52,
  Van: 78,
  Yalova: 80,
  Yozgat: 48,
  Zonguldak: 58
});

/** @param {string} province */
export function resolveSeismicBaseRisk(province = '') {
  const key = String(province || '').trim();
  if (!key) return 40;
  if (Object.prototype.hasOwnProperty.call(TURKEY_SEISMIC_BASE_RISK, key)) {
    return TURKEY_SEISMIC_BASE_RISK[key];
  }
  const lowered = key.toLocaleLowerCase('tr-TR');
  const match = Object.entries(TURKEY_SEISMIC_BASE_RISK).find(
    ([name]) => name.toLocaleLowerCase('tr-TR') === lowered
  );
  return match ? match[1] : 45;
}
