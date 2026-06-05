import { withTimeout } from '../core/async-utils.js';
import { formatTry } from '../tatil/tatil-utils.js';
import { setSubmitLoading } from '../runtime/enterprise-form-ux.js';
import { renderPremiumDecisionDashboard } from '../ui/components/premium-decision-dashboard.js';
import {
  mountFinansmanResultsV2,
  syncCanonicalFinansScores
} from '../features/finansman/finansman-results-v2.js';
import { mountSigortaResultsV2, syncCanonicalSigortaScores } from '../features/sigorta/sigorta-results-v2.js';
import { mountKaskoResultsV2, syncCanonicalKaskoScores } from '../features/kasko/kasko-results-v2.js';
import {
  trackAnalysisStarted,
  trackResultsViewed,
  trackLeadFormOpened,
  trackLeadSubmitted
} from '../platform/site-analytics.js';
import { wt } from './wizard-i18n.js';

const VERTICAL_SITE_CATEGORY = Object.freeze({
  finans: 'finansman',
  sigorta: 'sigorta',
  kasko: 'kasko',
  tatil: 'tatil',
  konut: 'konut'
});

/** @type {Record<string, string>} */
const TRACKER_STEP_TIMEOUT_MS = 8000;
const TRACKER_STEP_FIRE_AND_FORGET_MS = 2500;

const DEFAULT_DOM_IDS = {
  stepProgress: 'vacation-step-progress',
  aiSummary: 'vacation-ai-summary',
  wizard: 'vacation-wizard',
  results: 'vacation-results',
  flow: 'vacation-flow',
  heroCta: 'vacation-hero-cta',
  heroCtaSecondary: 'vacation-hero-cta-secondary',
  nav: 'vacation-nav',
  back: 'vacation-back',
  next: 'vacation-next',
  confirmSelection: 'vacation-confirm-selection',
  finalCta: 'vacation-final-cta',
  changeSelection: 'vacation-change-selection',
  selectPrimary: 'vacation-select-primary',
  selectionBar: 'vacation-selection-bar',
  leadName: 'vacation-lead-name',
  leadPhone: 'vacation-lead-phone',
  leadEmail: 'vacation-lead-email'
};

/**
 * Shared decision wizard + results UI (tatil.css class names).
 * @param {object} config
 * @param {Record<string, string>} [config.domIds] — page-specific element ids (finans/tatil use defaults)
 */
export function initDecisionFlow(config) {
  const dom = { ...DEFAULT_DOM_IDS, ...(config.domIds || {}) };
  const el = (key) => document.getElementById(dom[key]);

  const state = {
    stepIndex: 0,
    selected_option: '',
    confirmationStep: false,
    results: [],
    ...config.initialState
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const verticalLabel = config.vertical || 'vertical';

  function clearWizardSubmitLoading(staleBtn) {
    setSubmitLoading(staleBtn, false);
    setSubmitLoading(el('next'), false);
  }

  function fireStepSideEffects(step) {
    if (!config.onStepComplete) return;
    void withTimeout(
      Promise.resolve(config.onStepComplete(state, step)),
      TRACKER_STEP_FIRE_AND_FORGET_MS
    ).catch((error) => {
      console.warn(`${verticalLabel}-step-track-failed`, error);
    });
  }

  /** Hide wizard when results are shown (CSS flow-visible uses !important otherwise). */
  function setWizardVisible(visible) {
    const mount = el('wizard');
    if (!mount) return;
    if (visible) {
      mount.hidden = false;
      mount.setAttribute('aria-hidden', 'false');
      mount.style.removeProperty('display');
      mount.style.removeProperty('visibility');
    } else {
      mount.hidden = true;
      mount.setAttribute('aria-hidden', 'true');
      mount.style.setProperty('display', 'none', 'important');
      mount.style.setProperty('visibility', 'hidden', 'important');
    }
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getSteps() {
    return typeof config.getSteps === 'function' ? config.getSteps(state) : config.steps;
  }

  function currentStep() {
    const steps = getSteps();
    return steps[state.stepIndex];
  }

  function renderProgress() {
    const progressEl = el('stepProgress');
    if (!progressEl) return;
    const steps = getSteps();
    progressEl.setAttribute('role', 'list');
    progressEl.setAttribute('aria-label', wt('common.wizardProgress', 'Analiz adımları'));
    progressEl.removeAttribute('aria-hidden');
    progressEl.innerHTML = steps
      .map((step, i) => {
        const active = i === state.stepIndex;
        const done = i < state.stepIndex;
        return `
      <div class="vacation-progress-item ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}" role="listitem" ${active ? 'aria-current="step"' : ''}>
        <span class="vacation-progress-num" aria-hidden="true">${i + 1}</span>
        <span class="vacation-progress-label">${escapeHtml(step.label)}</span>
      </div>`;
      })
      .join('');
  }

  function renderAiPanel() {
    const summaryEl = el('aiSummary');
    if (!summaryEl || !config.getProgress) return;
    summaryEl.innerHTML = config
      .getProgress(state)
      .map(
        (row) => `
    <li class="${row.value ? 'is-set' : ''}">
      <span>${escapeHtml(row.key)}</span>
      <strong>${escapeHtml(row.value || wt('common.unspecified', 'Belirtilmedi'))}</strong>
    </li>`
      )
      .join('');
  }

  function renderOptionGrid(field, items, rich = false, layout = '') {
    const layoutClass =
      layout === 'type'
        ? 'vacation-option-grid--type'
        : layout === 'insurance_type'
          ? 'vacation-option-grid--type'
          : '';
    return `
    <div class="vacation-option-grid ${rich ? 'vacation-option-grid--rich' : ''} ${layoutClass}">
      ${items
        .map((opt) => {
          const isSelected = state[field] === opt.value;
          return `
        <button type="button" class="vacation-option-card ${rich ? 'vacation-option-card--rich' : ''} ${isSelected ? 'is-selected' : ''}"
          data-field="${escapeHtml(field)}" data-value="${escapeHtml(opt.value)}">
          <span class="vacation-option-card-title">${escapeHtml(opt.label)}</span>
          ${opt.description ? `<span class="vacation-option-card-desc">${escapeHtml(opt.description)}</span>` : ''}
          ${opt.range ? `<span class="vacation-budget-card-range">${escapeHtml(opt.range)}</span>` : ''}
        </button>`;
        })
        .join('')}
    </div>`;
  }

  function renderChipGrid(field, items, max = 5) {
    return `
    <div class="vacation-chip-grid">
      ${items
        .map((item) => {
          const selected = (state[field] || []).includes(item.value);
          return `
        <button type="button" class="vacation-chip ${selected ? 'is-selected' : ''}"
          data-action="toggle-chip" data-field="${escapeHtml(field)}" data-value="${escapeHtml(item.value)}"
          ${!selected && (state[field]?.length || 0) >= max ? 'disabled' : ''}>
          ${escapeHtml(item.label)}
        </button>`;
        })
        .join('')}
    </div>`;
  }

  function bindWizardEvents() {
    document.querySelectorAll('[data-field]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const previousValue = state[btn.dataset.field];
        state[btn.dataset.field] = btn.dataset.value;
        if (config.onFieldChange) {
          config.onFieldChange(state, btn.dataset.field, btn.dataset.value, previousValue);
        }
        renderWizard();
      });
    });

    document.querySelectorAll('[data-action="toggle-chip"]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const field = chip.dataset.field;
        const value = chip.dataset.value;
        const list = state[field] || [];
        const idx = list.indexOf(value);
        if (idx >= 0) list.splice(idx, 1);
        else if (list.length < 5) list.push(value);
        state[field] = list;
        renderWizard();
      });
    });

    const syncManualField = (input, rawValue) => {
      const field = input.dataset.manual;
      const parsed =
        config.parseManual?.(rawValue) ?? Number(String(rawValue).replace(/\D/g, ''));
      state[field] = Number.isFinite(parsed) ? parsed : null;
      if (config.onManualChange) config.onManualChange(state, field, state[field]);
      refreshNext();
      renderAiPanel();
    };

    document.querySelectorAll('[data-manual]').forEach((input) => {
      input.addEventListener('input', (e) => syncManualField(input, e.target.value));
      input.addEventListener('change', (e) => syncManualField(input, e.target.value));
    });

    el('back')?.addEventListener('click', () => {
      if (state.stepIndex > 0) {
        state.stepIndex -= 1;
        renderWizard();
      }
    });

    el('next')?.addEventListener('click', async () => {
      const step = currentStep();
      const nextBtn = el('next');
      if (!config.canAdvance(state, step) && step?.id !== 'note') return;

      clearWizardError();
      setSubmitLoading(nextBtn, true, {
        busyLabel: wt('common.processing', 'Hazırlanıyor…')
      });

      const steps = getSteps();
      const advancingToResults = state.stepIndex >= steps.length - 1;

      try {
        fireStepSideEffects(step);
        state.stepIndex += 1;
        if (state.stepIndex >= steps.length) {
          showResults();
        } else {
          renderWizard();
        }
      } catch (error) {
        console.warn(`${verticalLabel}-wizard-step-failed`, error);
        if (advancingToResults) {
          state.stepIndex = Math.max(0, steps.length - 1);
          setWizardVisible(true);
          renderWizard();
        }
        showWizardError(
          wt(
            'common.resultsError',
            'Sonuçlar hazırlanırken bir sorun oluştu. Lütfen girdilerinizi kontrol edip tekrar deneyin.'
          )
        );
      } finally {
        clearWizardSubmitLoading(nextBtn);
      }
    });
  }

  function refreshNext() {
    const nextBtn = el('next');
    if (nextBtn) nextBtn.disabled = !config.canAdvance(state, currentStep());
  }

  function showWizardError(message) {
    const mount = el('wizard');
    if (!mount || !message) return;
    let banner = mount.querySelector('.vacation-wizard-error');
    if (!banner) {
      banner = document.createElement('p');
      banner.className = 'vacation-wizard-error ib-form-banner ib-form-banner--error';
      banner.setAttribute('role', 'alert');
      mount.querySelector('.vacation-wizard-card')?.prepend(banner);
    }
    banner.textContent = message;
  }

  function clearWizardError() {
    el('wizard')?.querySelector('.vacation-wizard-error')?.remove();
  }

  function renderWizard() {
    const mount = el('wizard');
    if (!mount) return;

    const steps = getSteps();
    if (state.stepIndex >= steps.length) {
      setWizardVisible(false);
      return;
    }

    setWizardVisible(true);
    const step = currentStep();
    const stepMeta =
      typeof config.getStepMeta === 'function'
        ? { ...step, ...config.getStepMeta(state, step) }
        : step;
    const body = config.renderStepBody(step, state, { escapeHtml, renderOptionGrid, renderChipGrid, formatTry });

    mount.innerHTML = `
    <div class="vacation-wizard-card">
      <h2>${escapeHtml(stepMeta.title)}</h2>
      ${stepMeta.subtitle ? `<p class="vacation-step-subtitle">${escapeHtml(stepMeta.subtitle)}</p>` : ''}
      ${body}
      <div class="vacation-wizard-actions">
        ${state.stepIndex > 0 ? `<button type="button" class="btn btn-ghost" id="${dom.back}">${escapeHtml(wt('common.back', 'Geri'))}</button>` : ''}
        <button type="button" class="btn btn-primary" id="${dom.next}" ${config.canAdvance(state, step) ? '' : 'disabled'}>
          ${state.stepIndex === steps.length - 1 ? escapeHtml(wt('common.showResults', 'Sonuçları gör')) : escapeHtml(wt('common.continue', 'Devam et →'))}
        </button>
      </div>
    </div>`;

    bindWizardEvents();
    renderProgress();
    renderAiPanel();
  }

  function getSelectedResult() {
    return state.results.find((r) => r.id === state.selected_option) || null;
  }

  function getDisplayResult() {
    const selected = getSelectedResult();
    if (config.vertical === 'finans') {
      return selected || state.results[0] || null;
    }
    if (state.confirmationStep && selected) return selected;
    return state.results[0] || null;
  }

  function showResults() {
    let built = [];
    try {
      built = config.buildResults(state) || [];
    } catch (error) {
      console.warn(`${verticalLabel}-build-results-failed`, error);
      throw error;
    }
    if (!built.length) {
      throw new Error('empty_results');
    }

    state.results = built;
    state.selected_option = config.vertical === 'finans' && built[0]?.id ? built[0].id : '';
    state.confirmationStep = false;
    setWizardVisible(false);
    renderResults();

    try {
      const siteCategory = VERTICAL_SITE_CATEGORY[config.vertical] || config.vertical;
      trackAnalysisStarted(siteCategory, { phase: 'wizard_complete' });
      trackResultsViewed(siteCategory, { results_count: state.results.length });
    } catch (error) {
      console.warn(`${verticalLabel}-results-analytics-failed`, error);
    }

    void withTimeout(
      Promise.resolve(
        config.tracker.trackResults({
          vertical: config.vertical,
          score: state.results[0]?.score
        })
      ),
      TRACKER_STEP_FIRE_AND_FORGET_MS
    ).catch((error) => {
      console.warn(`${verticalLabel}-results-track-failed`, error);
    });
  }

  function renderResults() {
    const section = el('results');
    if (!section || !state.results.length) return;
    section.hidden = false;

    if (config.vertical === 'finans') {
      if (!state.selected_option && state.results[0]?.id) {
        state.selected_option = state.results[0].id;
      }
      syncCanonicalFinansScores(state, state.results, state.selected_option);
    }

    if (config.vertical === 'sigorta') {
      if (!state.selected_option && state.results[0]?.id) {
        state.selected_option = state.results[0].id;
      }
      syncCanonicalSigortaScores(state, state.results, state.selected_option);
    }

    if (config.vertical === 'kasko') {
      if (!state.selected_option && state.results[0]?.id) {
        state.selected_option = state.results[0].id;
      }
      syncCanonicalKaskoScores(state, state.results, state.selected_option);
    }

    const commentary = config.buildCommentary(state, state.results);
    const summary = config.buildSummary(state, state.results);
    const primary = getDisplayResult();
    const selectedCard = getSelectedResult();

    const dashboardHtml = renderPremiumDecisionDashboard({
      category: config.vertical,
      kicker: config.resultsKicker || wt('common.resultsKicker', 'Karar analizi tamamlandı'),
      title: config.resultsTitle || wt('common.resultsTitle', 'Kişiselleştirilmiş öneriler'),
      decisionScore: summary.fitScore,
      scoreBand: summary.scoreBand,
      totalCostLabel: summary.totalCostLabel,
      totalCostHint: summary.totalCostHint,
      riskLabel: summary.seasonRisk,
      riskDetail: summary.riskDetail,
      advantages: primary?.pros || summary.advantages,
      cautions: primary?.cautions || summary.cautions,
      aiSummary: commentary.summary,
      aiBullets: commentary.bullets,
      nextStep: summary.nextStep || commentary.nextStep || wt('common.nextStepDefault', 'Bir senaryo seçin ve iletişim adımına geçin.'),
      extraKpis: summary.extraKpis
    });

    section.innerHTML = `
    <div class="vacation-results-header">
      <p>${escapeHtml(wt('common.resultsDisclaimer', 'Tahmini skor ve maliyet aralıkları bilgilendirme amaçlıdır; kesin teklif taahhüdü değildir.'))}</p>
    </div>
    ${dashboardHtml}
    <p class="vacation-results-top-pick">${escapeHtml(wt('common.topPick', 'Öne çıkan'))}: <strong>${escapeHtml(summary.topTitle)}</strong></p>
    <div class="vacation-result-cards" role="list" aria-label="${escapeHtml(config.resultsTitle || wt('common.resultsTitle', 'Kişiselleştirilmiş öneriler'))}">
      ${state.results
        .map((r) => {
          const isPicked = state.selected_option === r.id;
          const selectLabel = isPicked
            ? wt('common.selectedOption', 'Seçili senaryo')
            : wt('common.selectOption', 'Bu seçeneği seç');
          return `
        <article class="vacation-result-card ${r.badge.className} ${isPicked ? 'is-selected' : ''}" role="listitem" data-option="${escapeHtml(r.id)}" aria-pressed="${isPicked ? 'true' : 'false'}">
          <div class="vacation-result-badge">${escapeHtml(r.badge.label)}</div>
          <div class="vacation-result-score" aria-label="${escapeHtml(wt('common.decisionScore', 'Karar skoru'))}">${r.score}<span>/100</span></div>
          <div class="vacation-result-visual" role="presentation"></div>
          <h3>${escapeHtml(r.title)}</h3>
          <p>${escapeHtml(r.description)}</p>
          <ul class="vacation-result-meta">
            <li><strong>${escapeHtml(wt('common.estimated', 'Tahmini'))}:</strong> ${escapeHtml(r.estimatedCost)}</li>
            <li><strong>${escapeHtml(wt('common.suitability', 'Uygunluk'))}:</strong> ${escapeHtml(r.suitability)}</li>
          </ul>
          <div class="vacation-result-why"><strong>${escapeHtml(wt('common.whyRecommended', 'Neden önerildi?'))}</strong><p>${escapeHtml(r.why)}</p></div>
          <div class="vacation-result-pros"><strong>${escapeHtml(wt('common.pros', 'Artılar'))}</strong><ul>${r.pros.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>
          <div class="vacation-result-cautions"><strong>${escapeHtml(wt('common.cautions', 'Dikkat'))}</strong><ul>${r.cautions.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>
          <button type="button" class="btn btn-sm vacation-select-card-btn ${isPicked ? 'btn-primary' : 'btn-outline'}" data-option="${escapeHtml(r.id)}" aria-label="${escapeHtml(selectLabel)}: ${escapeHtml(r.title)}">
            ${isPicked ? escapeHtml(wt('common.selected', '✓ Seçildi')) : escapeHtml(wt('common.selectOption', 'Bu seçeneği seç'))}
          </button>
        </article>`;
        })
        .join('')}
    </div>
    ${
      !state.confirmationStep
        ? `
    <div class="vacation-selection-bar" id="${dom.selectionBar}">
      <div class="vacation-selection-copy">
        <p class="vacation-selection-hint ${selectedCard ? 'hidden' : ''}">${escapeHtml(wt('common.pickHint', 'Devam etmek için bir senaryo seçin.'))}</p>
        <p class="vacation-selection-picked ${selectedCard ? '' : 'hidden'}">${escapeHtml(wt('common.yourPick', 'Seçiminiz'))}: <strong>${selectedCard ? escapeHtml(selectedCard.title) : ''}</strong></p>
      </div>
      <button type="button" class="btn btn-primary" id="${dom.confirmSelection}" ${selectedCard ? '' : 'disabled'}>${escapeHtml(wt('common.confirmSelection', 'Seçimi onayla ve devam et'))}</button>
    </div>`
        : ''
    }
    ${
      state.confirmationStep && selectedCard
        ? `
    <div class="vacation-final-cta" id="${dom.finalCta}">
      <button type="button" class="btn btn-ghost btn-sm vacation-change-selection" id="${dom.changeSelection}">${escapeHtml(wt('common.changeSelection', '← Seçimi değiştir'))}</button>
      <div class="vacation-selected-recap">
        <span class="vacation-selected-recap-label">${escapeHtml(wt('common.confirmedScenario', 'Onayladığınız senaryo'))}</span>
        <h3>${escapeHtml(selectedCard.title)}</h3>
        <p>${escapeHtml(selectedCard.estimatedCost)} · Skor ${selectedCard.score}/100</p>
      </div>
      <h3 class="vacation-final-heading">${escapeHtml(wt('common.contactOptional', 'İletişim (isteğe bağlı)'))}</h3>
      <div class="vacation-lead-form">
        <div class="form-row">
          <input type="text" id="${dom.leadName}" placeholder="${escapeHtml(wt('common.namePlaceholder', 'Ad soyad'))}" autocomplete="name">
          <input type="tel" id="${dom.leadPhone}" placeholder="${escapeHtml(wt('common.phonePlaceholder', 'Telefon'))}" autocomplete="tel">
          <input type="email" id="${dom.leadEmail}" placeholder="${escapeHtml(wt('common.emailPlaceholder', 'E-posta'))}" autocomplete="email">
        </div>
      </div>
      <button type="button" class="btn btn-primary btn-lg" id="${dom.selectPrimary}">${escapeHtml(wt('common.sendRequest', 'Talebi gönder'))}</button>
      <p class="vacation-disclaimer">${escapeHtml(config.disclaimer)}</p>
    </div>`
        : ''
    }`;

    bindResultsEvents(commentary);

    if (config.vertical === 'finans') {
      void mountFinansmanResultsV2(section, {
        state,
        results: state.results,
        selectedOption: state.selected_option || state.results[0]?.id || '',
        onSelectScenario: (id) => selectOption(id),
        track: (eventName, meta) => config.tracker.track(eventName, meta),
        onRestart: restartFinansWizard,
        onDetailedAnalysis: (leadEls) => openFinansLeadFlow(commentary, leadEls, 'detail'),
        onPartnerCta: (leadEls) => openFinansLeadFlow(commentary, leadEls, 'partner'),
        onLeadSubmit: (formData, feedbackEl) => submitFinansLeadFromV2(commentary, formData, feedbackEl)
      });
    }

    if (config.vertical === 'sigorta') {
      void mountSigortaResultsV2(section, {
        state,
        results: state.results,
        selectedOption: state.selected_option,
        track: (eventName, meta) => config.tracker.track(eventName, meta),
        onRestart: restartSigortaWizard
      });
    }

    if (config.vertical === 'kasko') {
      void mountKaskoResultsV2(section, {
        state,
        results: state.results,
        selectedOption: state.selected_option,
        track: (eventName, meta) => config.tracker.track(eventName, meta),
        onRestart: restartKaskoWizard
      });
    }

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectOption(id) {
    state.selected_option = id;
    config.tracker.trackSelect(id, { phase: 'pick' });
    renderResults();
  }

  function restartFinansWizard() {
    state.stepIndex = 0;
    state.results = [];
    state.selected_option = '';
    state.confirmationStep = false;
    const section = el('results');
    if (section) {
      section.hidden = true;
      section.innerHTML = '';
    }
    setWizardVisible(true);
    renderWizard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function restartSigortaWizard() {
    state.stepIndex = 0;
    state.results = [];
    state.selected_option = '';
    state.confirmationStep = false;
    const section = el('results');
    if (section) {
      section.hidden = true;
      section.innerHTML = '';
    }
    setWizardVisible(true);
    renderWizard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function restartKaskoWizard() {
    state.stepIndex = 0;
    state.results = [];
    state.selected_option = '';
    state.confirmationStep = false;
    const section = el('results');
    if (section) {
      section.hidden = true;
      section.innerHTML = '';
    }
    setWizardVisible(true);
    renderWizard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function openFinansLeadFlow(commentary, { leadPanel, leadHint, feedbackEl }, mode = 'detail') {
    if (!state.selected_option && state.results[0]?.id) {
      state.selected_option = state.results[0].id;
    }
    if (!state.selected_option) return;

    state.confirmationStep = true;
    try {
      trackLeadFormOpened(VERTICAL_SITE_CATEGORY.finans || 'finansman');
    } catch (error) {
      console.warn(`${verticalLabel}-lead-form-analytics-failed`, error);
    }
    void withTimeout(
      Promise.resolve(config.tracker.trackConfirm(state.selected_option)),
      TRACKER_STEP_FIRE_AND_FORGET_MS
    ).catch((error) => {
      console.warn(`${verticalLabel}-confirm-track-failed`, error);
    });

    if (leadPanel) leadPanel.hidden = false;
    if (leadHint) {
      leadHint.textContent =
        mode === 'partner'
          ? 'Size uygun finansman teklifleri için iletişim bilgilerinizi bırakın.'
          : 'Detaylı analiz ve karşılaştırmalı teklif için iletişim bilgilerinizi bırakın.';
    }
    if (feedbackEl) feedbackEl.hidden = true;
    leadPanel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function submitFinansLeadFromV2(commentary, formData, feedbackEl) {
    if (!state.selected_option && state.results[0]?.id) {
      state.selected_option = state.results[0].id;
    }
    if (!state.selected_option) return;

    state.confirmationStep = true;
    const selected = getSelectedResult();
    const payload = {
      full_name: formData.fullName || '',
      phone: formData.phone || '',
      email: formData.email || '',
      profile: { ...state },
      selected_option: state.selected_option,
      decision_score: selected?.score ?? null,
      result_summary: selected?.title || '',
      ai_summary: commentary.summary
    };
    const res = await config.tracker.saveLead(payload);
    if (res.ok) {
      trackLeadSubmitted(VERTICAL_SITE_CATEGORY.finans || 'finansman', {
        selected_option: state.selected_option
      });
      const message = 'Tercihiniz kaydedildi. Ekibimiz profilinize uygun bilgilendirme yapabilir.';
      if (feedbackEl) {
        feedbackEl.hidden = false;
        feedbackEl.textContent = message;
        feedbackEl.className = 'finansman-v2-action-feedback vacation-toast';
      } else {
        const msg = document.createElement('p');
        msg.className = 'vacation-toast';
        msg.textContent = message;
        el('finalCta')?.prepend(msg);
      }
    }
  }

  function bindResultsEvents(commentary) {
    document.querySelectorAll('.vacation-select-card-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectOption(btn.dataset.option);
      });
    });
    document.querySelectorAll('.vacation-result-card[data-option]').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        selectOption(card.dataset.option);
      });
    });
    el('confirmSelection')?.addEventListener('click', async () => {
      if (!state.selected_option) return;
      state.confirmationStep = true;
      trackLeadFormOpened(VERTICAL_SITE_CATEGORY[config.vertical] || config.vertical);
      await config.tracker.trackConfirm(state.selected_option);
      renderResults();
      el('finalCta')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    el('changeSelection')?.addEventListener('click', () => {
      state.confirmationStep = false;
      renderResults();
    });
    el('selectPrimary')?.addEventListener('click', () => submitLead(commentary));
  }

  async function submitLead(commentary) {
    if (!state.confirmationStep || !state.selected_option) {
      el('selectionBar')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const selected = getSelectedResult();
    const payload = {
      full_name: el('leadName')?.value?.trim() || '',
      phone: el('leadPhone')?.value?.trim() || '',
      email: el('leadEmail')?.value?.trim() || '',
      profile: { ...state },
      selected_option: state.selected_option,
      decision_score: selected?.score ?? null,
      result_summary: selected?.title || '',
      ai_summary: commentary.summary
    };
    const res = await config.tracker.saveLead(payload);
    if (res.ok) {
      trackLeadSubmitted(VERTICAL_SITE_CATEGORY[config.vertical] || config.vertical, {
        selected_option: state.selected_option
      });
      const msg = document.createElement('p');
      msg.className = 'vacation-toast';
      msg.textContent = 'Tercihiniz kaydedildi. Ekibimiz profilinize uygun bilgilendirme yapabilir.';
      el('finalCta')?.prepend(msg);
    }
  }

  function setupMobileNav() {
    const navId = dom.nav;
    const toggle =
      document.querySelector(`.vacation-nav-toggle[aria-controls="${navId}"]`) ||
      $('.vacation-nav-toggle');
    const nav = el('nav');
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    if (toggle.dataset.ibFlowNavBound !== '1') {
      toggle.dataset.ibFlowNavBound = '1';
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        setOpen(!nav.classList.contains('is-open'));
      });
      nav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setOpen(false));
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setOpen(false);
      });
    }
  }

  function scrollToFlow() {
    el('flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startWizard() {
    state.stepIndex = 0;
    renderWizard();
  }

  async function init() {
    document.body.classList.add(config.themeClass || '');
    setupMobileNav();
    if (typeof config.bootstrapFromQuery === 'function') {
      try {
        config.bootstrapFromQuery(state, new URLSearchParams(window.location.search));
      } catch {
        /* optional profile bootstrap */
      }
    }
    if (!config.externalHeroBindings) {
      el('heroCta')?.addEventListener('click', () => {
        scrollToFlow();
        startWizard();
      });
      el('heroCtaSecondary')?.addEventListener('click', scrollToFlow);
    }
    renderWizard();
    try {
      await Promise.race([
        window.__ibI18n?.ready ?? Promise.resolve(),
        new Promise((resolve) => setTimeout(resolve, 1200))
      ]);
      renderWizard();
    } catch {
      /* i18n optional — wizard already rendered */
    }
    void Promise.resolve(config.tracker.trackStart?.()).catch(() => {});
    document.addEventListener('ib:locale-changed', () => {
      renderWizard();
      if (state.results?.length) renderResults();
    });
  }

  function bootInit() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => void init(), { once: true });
    } else {
      void init();
    }
  }

  bootInit();

  return { scrollToFlow, startWizard, renderWizard, showResults, getState: () => state };
}
