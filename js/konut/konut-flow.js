/** Canlı /konut sihirbazı (real-estate-app) için amaç bazlı adım ve seçenekler */

export const PURPOSE_KEYS = {
  'Satın almak istiyorum': 'satin-alma',
  'Kiralamak istiyorum': 'kiralama',
  'Yatırım amaçlı düşünüyorum': 'yatirim',
  'Henüz karar aşamasındayım': 'belirsiz'
};

const PURPOSE_FLOW = {
  'satin-alma': {
    stepLabels: ['Satın alma amacı', 'Bütçe ve finansman', 'Lokasyon', 'Konut tipi', 'Riskler'],
    budgetTitle: 'Adım 2 — Satın alma bütçesi ve finansman',
    budgetHint: 'Peşinat, ipotek ve aylık ödeme kapasitenizi girin.',
    homeTypes: ['Daire', 'Müstakil', 'Villa', 'Site içi', 'Yeni bina', 'Eski bina ama uygun fiyatlı'],
    riskPrefs: [
      'Deprem riski hassasiyeti',
      'Düşük aidat',
      'Uygun kat tercihi',
      'Tapu durumu hassasiyeti',
      'Kira getirisi beklentisi',
      'Değer artış potansiyeli'
    ],
    requireFinancing: true
  },
  kiralama: {
    stepLabels: ['Kiralama amacı', 'Kira bütçesi', 'Lokasyon', 'Konut tipi', 'Riskler'],
    budgetTitle: 'Adım 2 — Aylık kira ve yaşam bütçesi',
    budgetHint: 'Kira, depozito ve aylık yaşam giderlerinizi planlayın; ipotek alanları isteğe bağlıdır.',
    homeTypes: ['Daire', 'Site içi', 'Yeni bina', 'Eski bina ama uygun fiyatlı'],
    riskPrefs: [
      'Deprem riski hassasiyeti',
      'Düşük aidat',
      'Uygun kat tercihi',
      'Tapu durumu hassasiyeti',
      'Ulaşım maliyeti beklentisi',
      'Sessiz yaşam'
    ],
    requireFinancing: false
  },
  yatirim: {
    stepLabels: ['Yatırım amacı', 'Yatırım bütçesi', 'Lokasyon', 'Konut tipi', 'Getiri ve riskler'],
    budgetTitle: 'Adım 2 — Yatırım bütçesi ve finansman',
    budgetHint: 'Toplam yatırım, beklenen kira getirisi ve finansman yapısını girin.',
    homeTypes: ['Daire', 'Site içi', 'Yeni bina', 'Eski bina ama uygun fiyatlı', 'Villa'],
    riskPrefs: [
      'Kira getirisi beklentisi',
      'Değer artış potansiyeli',
      'Deprem riski hassasiyeti',
      'Düşük aidat',
      'Tapu durumu hassasiyeti',
      'Likidite / satılabilirlik'
    ],
    requireFinancing: true
  },
  belirsiz: {
    stepLabels: ['Karar amacı', 'Bütçe çerçevesi', 'Lokasyon', 'Konut tipi', 'Riskler'],
    budgetTitle: 'Adım 2 — Bütçe çerçeveniz',
    budgetHint: 'Satın alma veya kiralama senaryolarını karşılaştırmak için çerçeve girin.',
    homeTypes: ['Daire', 'Müstakil', 'Villa', 'Site içi', 'Yeni bina', 'Eski bina ama uygun fiyatlı'],
    riskPrefs: [
      'Deprem riski hassasiyeti',
      'Düşük aidat',
      'Uygun kat tercihi',
      'Tapu durumu hassasiyeti',
      'Kira getirisi beklentisi',
      'Değer artış potansiyeli'
    ],
    requireFinancing: false
  }
};

export function purposeKeyFromLabel(label) {
  return PURPOSE_KEYS[label] || 'belirsiz';
}

export function getKonutFlow(purchasePurposeLabel) {
  const key = purposeKeyFromLabel(purchasePurposeLabel);
  return PURPOSE_FLOW[key] || PURPOSE_FLOW.belirsiz;
}

export function resetKonutFieldsOnPurposeChange(state, previousLabel, newLabel) {
  if (previousLabel === newLabel) return;
  const flow = getKonutFlow(newLabel);
  if (state.homeType && !flow.homeTypes.includes(state.homeType)) {
    state.homeType = '';
  }
  if (state.riskPreferences?.length) {
    const allowed = new Set(flow.riskPrefs);
    state.riskPreferences = state.riskPreferences.filter((r) => allowed.has(r));
  }
  if (purposeKeyFromLabel(newLabel) === 'kiralama') {
    state.useFinancing = state.useFinancing || 'hayir';
  }
}
