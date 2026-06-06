/**
 * Decision OS v2 — interactions, live What-If, lazy render, performance.
 */
import { simulateWhatIfControls } from './decision-v3-whatif.js';
import {
  buildDecisionReportModel,
  copyDecisionReportSummary,
  downloadDecisionReportHtml
} from './decision-os-report.js';
import { copyShareCard } from './decision-os-share.js';

const WHATIF_ANIM_MS = 250;
const WHATIF_DEBOUNCE_MS = 250;
const HERO_FOCUS_MS = 3000;

function scheduleIdle(callback) {
  if (typeof requestIdleCallback === 'function') {
    return requestIdleCallback(callback, { timeout: 1200 });
  }
  return window.setTimeout(callback, 16);
}

function formatCost(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₺${Math.round(n).toLocaleString('tr-TR')}`;
}

function animateMetric(el, nextText) {
  if (!el) return;
  const strong = el.querySelector('strong') || el;
  strong.style.transition = `opacity ${WHATIF_ANIM_MS}ms ease, transform ${WHATIF_ANIM_MS}ms ease`;
  strong.style.opacity = '0.4';
  strong.style.transform = 'translateY(2px)';
  window.setTimeout(() => {
    strong.textContent = nextText;
    strong.style.opacity = '1';
    strong.style.transform = 'translateY(0)';
  }, WHATIF_ANIM_MS / 2);
}

function bindHeroPhase(root) {
  window.setTimeout(() => {
    root.setAttribute('data-dos-phase', 'ready');
  }, HERO_FOCUS_MS);
}

function bindExpandAll(root) {
  const btn = root.querySelector('[data-dos-expand-all]');
  const accordions = root.querySelector('[data-dos-accordions]');
  const legacy = root.querySelector('[data-dos-legacy]');

  btn?.addEventListener('click', () => {
    if (accordions) accordions.hidden = false;
    if (legacy) legacy.hidden = false;
    root.setAttribute('data-dos-phase', 'expanded');
    btn.textContent = 'Detaylı Analiz Açık';
    btn.setAttribute('aria-expanded', 'true');
    accordions?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function bindStickyScroll(root) {
  root.querySelector('[data-dos-scroll-details]')?.addEventListener('click', () => {
    const target = root.querySelector('[data-dos-accordions]') || root.querySelector('[data-dos-hero]');
    if (target?.hidden) {
      root.querySelector('[data-dos-expand-all]')?.click();
      return;
    }
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function bindSavingsExplain(root) {
  const btn = root.querySelector('[data-dos-savings-how]');
  const explain = root.querySelector('[data-dos-savings-explain]');
  btn?.addEventListener('click', () => {
    if (!explain) return;
    explain.hidden = !explain.hidden;
  });
}

function bindLiveWhatIf(root, model) {
  const section = root.querySelector('[data-dos-whatif]');
  if (!section || !model.whatIfInput) return;

  const budgetInput = section.querySelector('[data-dos-whatif-budget]');
  const downInput = section.querySelector('[data-dos-whatif-down]');
  const termInput = section.querySelector('[data-dos-whatif-term]');
  const riskInput = section.querySelector('[data-dos-whatif-risk]');

  const budgetLabel = section.querySelector('[data-dos-whatif-budget-label]');
  const downLabel = section.querySelector('[data-dos-whatif-down-label]');
  const termLabel = section.querySelector('[data-dos-whatif-term-label]');

  const decisionEl = root.querySelector('[data-dos-whatif-decision]');
  const riskEl = root.querySelector('[data-dos-whatif-risk]');
  const costEl = root.querySelector('[data-dos-whatif-cost]');

  let debounceTimer = null;

  const syncLabels = () => {
    if (budgetLabel && budgetInput) {
      const v = Number(budgetInput.value) || 0;
      budgetLabel.textContent = `${v > 0 ? '+' : ''}${v}%`;
    }
    if (downLabel && downInput) {
      downLabel.textContent = `${Number(downInput.value) || 0}%`;
    }
    if (termLabel && termInput) {
      termLabel.textContent = `${Number(termInput.value) || 36} ay`;
    }
  };

  const runSimulation = () => {
    try {
      const result = simulateWhatIfControls(model.whatIfInput, {
        budgetPercent: Number(budgetInput?.value) || 0,
        downPaymentPercent: Number(downInput?.value) || 0,
        termMonths: Number(termInput?.value) || 36,
        riskTolerance: riskInput?.value || 'orta'
      });

      if (!result) return;

      const verdictLabel = result.after.recommendationLabel || `${result.after.decisionScore}/100`;
      animateMetric(decisionEl, verdictLabel);
      animateMetric(riskEl, `${result.after.riskScore}/100`);
      animateMetric(costEl, formatCost(result.after.totalCost));

      section._lastWhatIfResult = result;
      root._lastWhatIfResult = result;
    } catch {
      // silent
    }
  };

  const scheduleSimulation = () => {
    syncLabels();
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(runSimulation, WHATIF_DEBOUNCE_MS);
  };

  [budgetInput, downInput, termInput, riskInput].forEach((input) => {
    input?.addEventListener('input', scheduleSimulation);
    input?.addEventListener('change', scheduleSimulation);
  });

  syncLabels();
  runSimulation();
}

function showReportFeedback(root, message, type = 'success') {
  const feedback = root.querySelector('[data-dos-report-feedback]');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.hidden = false;
  feedback.classList.toggle('is-success', type === 'success');
  feedback.classList.toggle('is-error', type === 'error');
  window.clearTimeout(feedback._hideTimer);
  feedback._hideTimer = window.setTimeout(() => {
    feedback.hidden = true;
  }, 2600);
}

function bindReportActions(root, model) {
  const downloadBtn = root.querySelector('[data-dos-report-download]');
  const copyBtn = root.querySelector('[data-dos-report-copy]');

  const buildReport = () =>
    buildDecisionReportModel(
      {
        ...model,
        vertical: model.vertical,
        decisionScore: model.decisionScore,
        confidenceScore: model.confidenceScore,
        riskScore: model.riskScore,
        decisionQualityScore: model.decisionQualityScore,
        totalCost: model.totalCost,
        executiveSummary: model.executiveSummary,
        nextSteps: model.actionPlan,
        riskAnalysis: model.riskRadar,
        scoreFactors: model.scoreFactors,
        verdict: model.verdict,
        title: model.title
      },
      model.memory,
      root._lastWhatIfResult || null
    );

  downloadBtn?.addEventListener('click', () => {
    try {
      const ok = downloadDecisionReportHtml(buildReport());
      showReportFeedback(root, ok ? 'Rapor indirildi.' : 'Rapor indirilemedi.', ok ? 'success' : 'error');
    } catch {
      showReportFeedback(root, 'Rapor indirilemedi.', 'error');
    }
  });

  copyBtn?.addEventListener('click', () => {
    void (async () => {
      try {
        const result = await copyDecisionReportSummary(buildReport());
        showReportFeedback(
          root,
          result.ok ? 'LinkedIn özeti kopyalandı.' : 'Özet kopyalanamadı.',
          result.ok ? 'success' : 'error'
        );
      } catch {
        showReportFeedback(root, 'Özet kopyalanamadı.', 'error');
      }
    })();
  });
}

function bindLazyAccordions(root) {
  const accordions = root.querySelectorAll('[data-dos-accordion]');
  if (!accordions.length || typeof IntersectionObserver !== 'function') return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute('data-dos-visible', '1');
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '120px 0px', threshold: 0.01 }
  );

  accordions.forEach((accordion) => {
    accordion.setAttribute('data-dos-lazy', '1');
    observer.observe(accordion);
  });
}

function bindShareCard(root, model) {
  const btn = root.querySelector('[data-dos-share-copy]');
  const feedback = root.querySelector('[data-dos-share-feedback]');

  btn?.addEventListener('click', () => {
    void (async () => {
      try {
        const result = await copyShareCard(model);
        if (!feedback) return;
        feedback.textContent = result.ok ? 'Paylaşım kartı kopyalandı.' : 'Paylaşım kartı kopyalanamadı.';
        feedback.hidden = false;
        window.clearTimeout(feedback._hideTimer);
        feedback._hideTimer = window.setTimeout(() => {
          feedback.hidden = true;
        }, 2600);
      } catch {
        if (feedback) {
          feedback.textContent = 'Paylaşım kartı kopyalanamadı.';
          feedback.hidden = false;
        }
      }
    })();
  });
}

function reserveStickySpace(root) {
  const sticky = root.querySelector('[data-dos-sticky]');
  if (!sticky || typeof window === 'undefined') return;

  const update = () => {
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    root.style.setProperty('--dos-sticky-offset', isMobile ? '72px' : '0px');
  };

  update();
  window.addEventListener('resize', update, { passive: true });
}

/**
 * @param {HTMLElement} root
 * @param {object} model
 */
export function bindDecisionOsInteractions(root, model = {}) {
  if (!root) return;

  bindHeroPhase(root);
  bindExpandAll(root);
  bindStickyScroll(root);
  bindSavingsExplain(root);

  scheduleIdle(() => {
    bindLiveWhatIf(root, model);
    bindReportActions(root, model);
    bindShareCard(root, model);
    bindLazyAccordions(root);
  });

  reserveStickySpace(root);
}
