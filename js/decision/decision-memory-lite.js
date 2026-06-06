/**
 * Decision Memory Lite — deterministic profile from local analysis history.
 * No LLM calls; derived summary scores only.
 */

export const HISTORY_STORAGE_KEY = 'istebul_decision_history_v1';
export const HISTORY_SESSION_KEY = 'istebul_decision_history_v1_session';
export const MAX_HISTORY_ENTRIES = 20;
export const MEMORY_LITE_VERSION = 'memory-lite-v1';

const DEFAULT_PROFILE = Object.freeze({
  riskPreference: 50,
  budgetDiscipline: 50,
  comfortPriority: 50,
  investmentFocus: 50,
  financeSensitivity: 50
});

function clampScore(value, fallback = 50) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function resolveStorage(preferred) {
  if (preferred && typeof preferred.getItem === 'function') return preferred;
  if (typeof localStorage !== 'undefined') return localStorage;
  if (typeof sessionStorage !== 'undefined') return sessionStorage;
  return null;
}

function readRawHistory(storage) {
  const store = resolveStorage(storage);
  if (!store) return null;

  try {
    const primary = store.getItem(HISTORY_STORAGE_KEY);
    if (primary) return primary;

    if (store !== sessionStorage && typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(HISTORY_SESSION_KEY);
    }
  } catch {
    return null;
  }

  return null;
}

function writeRawHistory(storage, payload) {
  const store = resolveStorage(storage);
  if (!store) return false;

  try {
    store.setItem(HISTORY_STORAGE_KEY, payload);
    if (typeof sessionStorage !== 'undefined' && store !== sessionStorage) {
      sessionStorage.setItem(HISTORY_SESSION_KEY, payload);
    }
    return true;
  } catch {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(HISTORY_SESSION_KEY, payload);
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

function normalizeVertical(value) {
  const vertical = String(value || 'unknown').toLowerCase();
  if (vertical === 'finans' || vertical === 'finance') return 'finansman';
  if (vertical === 'housing' || vertical === 'real-estate') return 'konut';
  if (vertical === 'vehicle' || vertical === 'arac') return 'auto';
  return vertical;
}

function average(values, fallback = 50) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (!nums.length) return fallback;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function weightedAverage(entries, valueSelector, weightSelector) {
  let totalWeight = 0;
  let totalValue = 0;

  entries.forEach((entry) => {
    const value = valueSelector(entry);
    const weight = weightSelector(entry);
    if (!Number.isFinite(value) || !Number.isFinite(weight) || weight <= 0) return;
    totalWeight += weight;
    totalValue += value * weight;
  });

  if (!totalWeight) return null;
  return totalValue / totalWeight;
}

/**
 * @param {unknown} history
 * @returns {object[]}
 */
export function normalizeDecisionHistory(history) {
  return safeArray(history)
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;

      const vertical = normalizeVertical(entry.vertical);
      const decisionScore = clampScore(entry.decisionScore, 0);
      const confidenceScore = clampScore(entry.confidenceScore, 0);
      const riskScore = clampScore(entry.riskScore, Math.max(0, 100 - decisionScore));
      const decisionQualityScore = clampScore(
        entry.decisionQualityScore,
        Math.round((decisionScore + confidenceScore) / 2)
      );
      const totalCost = Number(entry.totalCost);
      const badges = safeArray(entry.badges)
        .map((badge) => String(badge || '').trim())
        .filter(Boolean)
        .slice(0, 8);

      return {
        createdAt: entry.createdAt || new Date(0).toISOString(),
        vertical,
        decisionScore,
        confidenceScore,
        riskScore,
        decisionQualityScore,
        totalCost: Number.isFinite(totalCost) ? totalCost : null,
        badges
      };
    })
    .filter(Boolean)
    .slice(0, MAX_HISTORY_ENTRIES);
}

/**
 * @param {object[]} history
 */
export function calculateDecisionProfile(history) {
  const entries = normalizeDecisionHistory(history);
  if (!entries.length) return { ...DEFAULT_PROFILE };

  const riskPreference = clampScore(
    weightedAverage(
      entries,
      (entry) => entry.riskScore,
      (entry) => 1 + (entry.riskScore >= 65 ? 0.35 : 0)
    ) ?? average(entries.map((entry) => entry.riskScore))
  );

  const budgetDiscipline = clampScore(
    weightedAverage(
      entries,
      (entry) => {
        const quality = entry.decisionQualityScore;
        const costPenalty =
          entry.totalCost && entry.totalCost > 0 && entry.decisionScore < 55 ? 18 : 0;
        return quality - costPenalty;
      },
      (entry) => 1 + (entry.decisionQualityScore >= 70 ? 0.2 : 0)
    ) ?? average(entries.map((entry) => entry.decisionQualityScore))
  );

  const comfortEntries = entries.filter((entry) => ['konut', 'tatil', 'auto'].includes(entry.vertical));
  const comfortPriority = clampScore(
    comfortEntries.length
      ? weightedAverage(
          comfortEntries,
          (entry) => entry.confidenceScore,
          (entry) => 1 + (entry.vertical === 'konut' || entry.vertical === 'tatil' ? 0.45 : 0.15)
        )
      : average(entries.map((entry) => entry.confidenceScore))
  );

  const investmentEntries = entries.filter(
    (entry) =>
      entry.vertical === 'konut' ||
      entry.badges.some((badge) => /yatırım|investment|getiri|kira/i.test(badge))
  );
  const investmentFocus = clampScore(
    investmentEntries.length
      ? weightedAverage(
          investmentEntries,
          (entry) => entry.decisionScore,
          (entry) => 1 + (entry.badges.length ? 0.25 : 0.1)
        )
      : average(entries.map((entry) => (entry.decisionScore + entry.confidenceScore) / 2)) - 8
  );

  const financeEntries = entries.filter((entry) => entry.vertical === 'finansman');
  const financeWeight = financeEntries.length / entries.length;
  const financeSensitivity = clampScore(
    financeEntries.length
      ? weightedAverage(
          financeEntries,
          (entry) => entry.riskScore * 0.55 + entry.decisionQualityScore * 0.45,
          () => 1
        ) + financeWeight * 12
      : 42 + financeWeight * 8
  );

  return {
    riskPreference,
    budgetDiscipline,
    comfortPriority,
    investmentFocus,
    financeSensitivity
  };
}

/**
 * @param {object[]} history
 */
export function generateDecisionTrend(history) {
  const entries = normalizeDecisionHistory(history);
  if (!entries.length) {
    return {
      direction: 'unknown',
      explanation: 'Henüz yeterli analiz geçmişi yok; trend hesaplanamadı.'
    };
  }

  if (entries.length === 1) {
    return {
      direction: 'stable',
      explanation: 'Tek analiz kaydı var; trend için daha fazla geçmiş gerekir.'
    };
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const midpoint = Math.max(1, Math.floor(sorted.length / 2));
  const older = sorted.slice(0, midpoint);
  const recent = sorted.slice(midpoint);

  const olderAvg = average(older.map((entry) => entry.decisionQualityScore));
  const recentAvg = average(recent.map((entry) => entry.decisionQualityScore));
  const delta = recentAvg - olderAvg;

  if (delta >= 6) {
    return {
      direction: 'improving',
      explanation: 'Son analizlerinizde karar kalitesi yükseliyor; profiliniz daha tutarlı görünüyor.'
    };
  }

  if (delta <= -6) {
    return {
      direction: 'declining',
      explanation: 'Son analizlerde karar kalitesi düşüş eğiliminde; bütçe ve risk girdilerini gözden geçirmek faydalı olabilir.'
    };
  }

  return {
    direction: 'stable',
    explanation: 'Analiz geçmişiniz dengeli seyrediyor; belirgin bir iyileşme veya bozulma sinyali yok.'
  };
}

/**
 * @param {object[]} history
 * @returns {string[]}
 */
export function generateMemoryInsights(history) {
  const entries = normalizeDecisionHistory(history);
  if (!entries.length) {
    return ['İlk analizleriniz tamamlandıkça profiliniz burada görünecek.'];
  }

  const profile = calculateDecisionProfile(entries);
  const insights = [];

  if (profile.riskPreference >= 65) {
    insights.push('Geçmiş analizleriniz daha yüksek risk toleransı gösteriyor.');
  } else if (profile.riskPreference <= 40) {
    insights.push('Geçmiş analizleriniz daha temkinli bir risk profiline işaret ediyor.');
  }

  if (profile.budgetDiscipline >= 65) {
    insights.push('Bütçe disiplininiz geçmiş kayıtlarda güçlü görünüyor.');
  } else if (profile.budgetDiscipline <= 45) {
    insights.push('Bütçe planlamasında ek netlik geçmiş kayıtlarda fayda sağlayabilir.');
  }

  const financeCount = entries.filter((entry) => entry.vertical === 'finansman').length;
  if (financeCount >= Math.ceil(entries.length / 2)) {
    insights.push('Finansman odaklı analizler profilinizde belirgin ağırlık taşıyor.');
  }

  const comfortCount = entries.filter((entry) => ['konut', 'tatil'].includes(entry.vertical)).length;
  if (comfortCount >= Math.ceil(entries.length / 2)) {
    insights.push('Konfor ve yaşam kalitesi geçmiş kararlarınızda öne çıkıyor.');
  }

  if (profile.investmentFocus >= 62) {
    insights.push('Yatırım odaklı değerlendirmeler geçmişinizde daha sık görülüyor.');
  }

  if (!insights.length) {
    insights.push('Profiliniz dengeli; farklı kategorilerde benzer karar eğilimleri var.');
  }

  return insights.slice(0, 3);
}

/**
 * @param {object} snapshot
 * @param {Storage} [storage]
 */
export function saveDecisionSnapshot(snapshot = {}, storage) {
  if (!snapshot || typeof snapshot !== 'object') return null;

  const normalized = normalizeDecisionHistory([
    {
      createdAt: snapshot.createdAt || new Date().toISOString(),
      vertical: snapshot.vertical,
      decisionScore: snapshot.decisionScore,
      confidenceScore: snapshot.confidenceScore,
      riskScore: snapshot.riskScore,
      decisionQualityScore: snapshot.decisionQualityScore,
      totalCost: snapshot.totalCost,
      badges: snapshot.badges
    }
  ])[0];

  if (!normalized) return null;

  const history = loadDecisionHistory(storage).filter(
    (entry) =>
      entry.createdAt !== normalized.createdAt ||
      entry.vertical !== normalized.vertical ||
      entry.decisionScore !== normalized.decisionScore
  );

  const nextHistory = [normalized, ...history].slice(0, MAX_HISTORY_ENTRIES);
  writeRawHistory(storage, JSON.stringify(nextHistory));
  return normalized;
}

/**
 * @param {Storage} [storage]
 * @returns {object[]}
 */
export function loadDecisionHistory(storage) {
  try {
    const raw = readRawHistory(storage);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeDecisionHistory(parsed);
  } catch {
    return [];
  }
}

/**
 * @param {object} currentDecision
 * @param {{ storage?: Storage, persist?: boolean }} [options]
 */
export function buildDecisionMemoryLite(currentDecision = {}, options = {}) {
  const { storage, persist = true } = options;

  if (persist && currentDecision && typeof currentDecision === 'object') {
    try {
      saveDecisionSnapshot(currentDecision, storage);
    } catch {
      // silent persistence failure
    }
  }

  const history = loadDecisionHistory(storage);

  return {
    version: MEMORY_LITE_VERSION,
    profile: calculateDecisionProfile(history),
    trend: generateDecisionTrend(history),
    insights: generateMemoryInsights(history),
    historyCount: history.length
  };
}
