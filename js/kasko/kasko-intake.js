import { analytics } from '../core/analytics.js';
import { createVerticalTracker } from '../vertical/vertical-intake.js';

const tracker = createVerticalTracker('kasko');

function track(eventName, metadata = {}) {
  if (!analytics.hasConsent()) return;
  tracker.track(eventName, metadata);
}

export function trackKaskoPageView() {
  return tracker.trackPageView({ path: window.location.pathname });
}

export function trackKaskoAnalysisStarted(meta = {}) {
  return tracker.trackStart(meta);
}

export function trackKaskoStep(stepId, stepIndex = 0) {
  return tracker.trackStep(stepId, stepIndex);
}

export function trackKaskoWizardComplete(meta = {}) {
  return tracker.trackWizardComplete(meta);
}

export function trackKaskoResultsView(meta = {}) {
  return tracker.trackResults(meta);
}

export function trackKaskoPdfDownload(meta = {}) {
  return tracker.track('kasko_pdf_download', meta);
}

export function saveKaskoLead(payload = {}) {
  return tracker.saveLead({
    ...payload,
    privacy_consent: payload.privacy_consent || 'accepted'
  });
}

export { tracker as kaskoTracker };
