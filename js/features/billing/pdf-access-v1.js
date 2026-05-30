/**
 * PDF indirme — ücretsiz aylık limit + Pro bypass (V1).
 */
import { downloadDecisionReport } from '../results/pdf-report.js';
import { revenueManager } from '../monetization/revenue-manager.js';
import { getPdfMonthlyLimit } from './pro-features.js';

function monthKey(userId) {
  const month = new Date().toISOString().slice(0, 7);
  return `istebul_pdf_count:${userId || 'anon'}:${month}`;
}

function readPdfCount(userId) {
  try {
    return Number(localStorage.getItem(monthKey(userId)) || 0);
  } catch {
    return 0;
  }
}

function incrementPdfCount(userId) {
  try {
    const next = readPdfCount(userId) + 1;
    localStorage.setItem(monthKey(userId), String(next));
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} [userId]
 */
function hasPremiumReportEntitlement() {
  if (revenueManager.hasPremiumReportEntitlement) return true;
  const list =
    (typeof window !== 'undefined' && window.__ibPaymentEntitlements) || [];
  return list.some(
    (e) => e.entitlement_code === 'premium_report' && e.status === 'active'
  );
}

export function canDownloadPdfNow(userId = null) {
  if (revenueManager.isPremium) return true;
  if (hasPremiumReportEntitlement()) return true;
  const uid = userId || (typeof window !== 'undefined' ? window.app?.currentUser?.id : null);
  const limit = getPdfMonthlyLimit(false);
  return readPdfCount(uid) < limit;
}

/**
 * @param {object} pdfReportData
 * @param {object} [options]
 * @returns {boolean}
 */
export function gatePdfDownload(pdfReportData = {}, options = {}) {
  try {
    const user = typeof window !== 'undefined' ? window.app?.currentUser : null;
    if (!user?.id) {
      if (typeof window !== 'undefined' && window.app?.auth) {
        window.app.auth.showCheckoutAuthGate?.();
      }
      return false;
    }
    if (!canDownloadPdfNow()) {
      revenueManager.mountPaywall('premium_report');
      return false;
    }
    if (!revenueManager.isPremium && !hasPremiumReportEntitlement()) {
      incrementPdfCount(window.app?.currentUser?.id);
    }
    downloadDecisionReport(pdfReportData, options);
    return true;
  } catch {
    try {
      downloadDecisionReport(pdfReportData, options);
      return true;
    } catch {
      return false;
    }
  }
}
