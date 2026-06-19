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

/**
 * Finansman zorunlu olmayan akışlarda boş kredi tercihini güvenli varsayılana çeker.
 * @param {object} state
 * @param {ReturnType<typeof getKonutFlow>} flow
 */
export function applyKonutFinancingDefaults(state, flow) {
  if (!flow || flow.requireFinancing) return;
  if (!state.useFinancing) state.useFinancing = 'hayir';
}

/**
 * @param {object} state — real-estate wizard state
 * @param {number} stepIndex
 * @returns {string} hata mesajı veya boş string
 */
export function validateKonutStep(state, stepIndex) {
  const flow = getKonutFlow(state.purchasePurpose);
  if (stepIndex === 0 && !state.purchasePurpose) return 'Karar amacını seçin.';
  if (stepIndex === 1) {
    const hasBudget = Number(state.totalBudget) > 0;
    const hasCapacity = Number(state.monthlyCapacity) > 0;
    if (!hasBudget && !hasCapacity) {
      return flow.requireFinancing
        ? 'Toplam bütçe zorunludur.'
        : 'Toplam bütçe veya aylık ödeme kapasitesi girin.';
    }
    if (!Number(state.monthlyIncome)) return 'Aylık net gelir zorunludur.';
    if (!hasCapacity) return 'Aylık ödeme kapasitesi zorunludur.';
    if (flow.requireFinancing) {
      if (!state.useFinancing) return 'Kredi kullanım tercihini seçin.';
      if (state.useFinancing === 'evet' && !Number(state.loanAmount)) return 'Kredi tutarını girin.';
    } else {
      applyKonutFinancingDefaults(state, flow);
    }
  }
  if (stepIndex === 2 && !String(state.city || '').trim()) return 'İl seçimi zorunludur.';
  if (stepIndex === 3 && !state.homeType) return 'Konut tipini seçin.';
  return '';
}

/**
 * @param {object} state
 * @returns {{ step: number, message: string } | null}
 */
export function validateKonutAllSteps(state) {
  const flow = getKonutFlow(state.purchasePurpose);
  applyKonutFinancingDefaults(state, flow);
  const stepCount = flow.stepLabels.length;
  for (let i = 0; i < stepCount; i += 1) {
    const msg = validateKonutStep(state, i);
    if (msg) return { step: i, message: msg };
  }
  return null;
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
