/** Resolve vertical wizard copy from active locale (falls back to TR). */

function resolveLocaleId() {
  return window.__ibI18n?.currentLang || document.documentElement.dataset.locale || 'tr';
}

function readWizardNode(localeId, keyPath) {
  const keys = keyPath.split('.');
  let node = window.__ibI18n?.translations?.[localeId]?.wizard;
  for (const key of keys) {
    node = node?.[key];
  }
  return typeof node === 'string' ? node : null;
}

export function wt(key, fallback = '') {
  const localeId = resolveLocaleId();
  const hit = readWizardNode(localeId, key);
  if (hit) return hit;
  if (localeId !== 'tr') {
    const trHit = readWizardNode('tr', key);
    if (trHit) return trHit;
  }
  return fallback || key;
}

export function resolveWizardSteps(vertical, steps = []) {
  return steps.map((step) => {
    const prefix = `${vertical}.steps.${step.id}`;
    return {
      ...step,
      label: wt(`${prefix}.label`, step.label),
      title: wt(`${prefix}.title`, step.title),
      subtitle: wt(`${prefix}.subtitle`, step.subtitle)
    };
  });
}

export function resolveWizardConfig(vertical, config = {}) {
  const next = { ...config };
  if (Array.isArray(config.steps)) {
    next.steps = resolveWizardSteps(vertical, config.steps);
  }
  if (config.resultsTitle) {
    next.resultsTitle = wt(`${vertical}.resultsTitle`, config.resultsTitle);
  }
  if (config.disclaimer) {
    next.disclaimer = config.disclaimer;
  }
  return next;
}
