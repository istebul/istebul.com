/**
 * Thin facade so feature bundles (e.g. Auto) do not depend on window.app internals.
 */

export function getAppInstance() {
  return typeof window !== 'undefined' ? window.app : null;
}

export function getCurrentUserId() {
  return getAppInstance()?.currentUser?.id ?? null;
}

export function saveDecisionHistory(entry, options = {}) {
  const app = getAppInstance();
  if (app && typeof app.saveDecisionHistory === 'function') {
    app.saveDecisionHistory(entry, options);
    return true;
  }
  return false;
}

export function getComparisonItems() {
  return getAppInstance()?.comparisonItems ?? [];
}
