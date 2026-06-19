/**
 * Dashboard V2 — localStorage fallbacks (user-scoped). Supabase şeması değiştirilmez.
 */
import { readStoredJson, userScopedKey, writeStoredJson } from '../../core/storage-keys.js';

export const PDF_REPORT_HISTORY_KEY = 'istebul_pdf_report_history';
export const DASHBOARD_COMPARE_KEY = 'istebul_dashboard_compare_analyses';

const MAX_PDF_HISTORY = 40;
const MAX_COMPARE = 12;

/** @type {Map<string, string>} */
const memoryFallback = new Map();

function getBrowserStorage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* private mode / SSR */
  }
  return null;
}

function readKey(key) {
  const storage = getBrowserStorage();
  if (storage) return readStoredJson(key, [], storage);
  const raw = memoryFallback.get(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeKey(key, list) {
  const storage = getBrowserStorage();
  if (storage) {
    writeStoredJson(key, list, storage);
    return;
  }
  memoryFallback.set(key, JSON.stringify(list));
}

/**
 * @param {string} [userId]
 */
export function pdfHistoryStorageKey(userId) {
  return userScopedKey(PDF_REPORT_HISTORY_KEY, userId);
}

/**
 * @param {string} [userId]
 */
export function compareSelectionStorageKey(userId) {
  return userScopedKey(DASHBOARD_COMPARE_KEY, userId);
}

/**
 * @param {object} pdfReportData
 * @param {string} [userId]
 */
export function recordPdfReportHistory(pdfReportData = {}, userId = null) {
  try {
    const data = pdfReportData && typeof pdfReportData === 'object' ? pdfReportData : {};
    const key = pdfHistoryStorageKey(userId);
    const list = readKey(key);
    const entry = {
      id: `pdf_${Date.now()}`,
      savedAt: new Date().toISOString(),
      category: String(data.category || 'unknown').toLowerCase(),
      decisionScore: Number(data.decisionScore) || null,
      confidenceScore: Number(data.confidenceScore) || null,
      overallRisk: data.overallRisk || '—',
      filename: data.filename || null,
      snapshot: {
        category: data.category,
        decisionScore: data.decisionScore,
        confidenceScore: data.confidenceScore,
        overallRisk: data.overallRisk,
        executiveSummary: String(data.executiveSummary || '').slice(0, 1200),
        nextSteps: Array.isArray(data.nextSteps) ? data.nextSteps.slice(0, 6) : [],
        alternatives: Array.isArray(data.alternatives) ? data.alternatives.slice(0, 3) : [],
        riskAnalysis: Array.isArray(data.riskAnalysis) ? data.riskAnalysis.slice(0, 6) : [],
        totalCost: data.totalCost || null,
        profile: data.profile || {},
        resultsV3: data.resultsV3 || null
      }
    };
    const next = [entry, ...list.filter((r) => r.id !== entry.id)].slice(0, MAX_PDF_HISTORY);
    writeKey(key, next);
    return entry;
  } catch {
    return null;
  }
}

/**
 * @param {string} [userId]
 */
export function listPdfReportHistory(userId = null) {
  try {
    return readKey(pdfHistoryStorageKey(userId));
  } catch {
    return [];
  }
}

/**
 * @param {object} item
 * @param {string} [userId]
 */
export function addAnalysisToCompareSelection(item = {}, userId = null) {
  try {
    const key = compareSelectionStorageKey(userId);
    const list = readKey(key);
    const entry = {
      id: String(item.id || `cmp_${Date.now()}`),
      category: normalizeDashboardCategory(item.category || item.categoryId),
      title: item.title || 'Karar analizi',
      decisionScore: item.decisionScore ?? item.score ?? null,
      riskLevel: item.riskLevel || item.overallRisk || '—',
      savedAt: item.savedAt || item.createdAt || new Date().toISOString(),
      href: item.href || '/karsilastir'
    };
    const next = [entry, ...list.filter((r) => r.id !== entry.id)].slice(0, MAX_COMPARE);
    writeKey(key, next);
    return entry;
  } catch {
    return null;
  }
}

/**
 * @param {string} id
 * @param {string} [userId]
 */
export function removeCompareSelection(id, userId = null) {
  try {
    const key = compareSelectionStorageKey(userId);
    const list = readKey(key).filter((r) => r.id !== id);
    writeKey(key, list);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} [userId]
 */
export function listCompareSelections(userId = null) {
  try {
    return readKey(compareSelectionStorageKey(userId));
  } catch {
    return [];
  }
}

/**
 * @param {string} raw
 */
export function normalizeDashboardCategory(raw) {
  const c = String(raw || '').toLowerCase();
  if (c === 'araba' || c === 'arac' || c === 'auto') return 'auto';
  if (c === 'housing' || c === 'ev') return 'konut';
  if (c === 'vacation' || c === 'travel') return 'tatil';
  if (c === 'finans' || c === 'finance') return 'finansman';
  if (['auto', 'konut', 'tatil', 'finansman'].includes(c)) return c;
  return 'auto';
}

export const CATEGORY_META = {
  auto: { label: 'Araç', href: '/auto/', icon: 'car' },
  konut: { label: 'Konut', href: '/konut/', icon: 'home' },
  tatil: { label: 'Tatil', href: '/tatil/', icon: 'palmtree' },
  finansman: { label: 'Finansman', href: '/finans/', icon: 'landmark' }
};
