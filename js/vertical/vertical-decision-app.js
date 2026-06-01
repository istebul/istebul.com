import { formatTry } from '../tatil/tatil-utils.js';
import { renderPremiumDecisionDashboard } from '../ui/components/premium-decision-dashboard.js';
import { mountFinansmanResultsV2 } from '../features/finansman/finansman-results-v2.js';
import { mountSigortaResultsV2 } from '../features/sigorta/sigorta-results-v2.js';
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
  tatil: 'tatil',
  konut: 'konut'
});

/** @type {Record<string, string>} */
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
    progressEl.innerHTML = steps
      .map((step, i) => {
        const active = i === state.stepIndex;
        const done = i < state.stepIndex;
        return `
      <div class="vacation-progress-item ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}">
        <span class="vacation-progress-num">${i + 1}</span>
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

  function renderOptionGrid(field, items, rich = false) {
    return `
    <div class="vacation-option-grid ${rich ? 'vacation-option-grid--rich' : ''}">
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
        state[btn.dataset.field] = btn.dataset.value;
        if (config.onFieldChange) config.onFieldChange(state, btn.dataset.field, btn.dataset.value);
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

    document.querySelectorAll('[data-manual]').forEach((input) => {
      input.addEventListener('input', (e) => {
        const field = input.dataset.manual;
        const parsed = config.parseManual?.(e.target.value) ?? Number(String(e.target.value).replace(/\D/g, ''));
        state[field] = parsed;
        if (config.onManualChange) config.onManualChange(state, field, parsed);
        refreshNext();
        renderAiPanel();
      });
    });

    el('back')?.addEventListener('click', () => {
      if (state.stepIndex > 0) {
        state.stepIndex -= 1;
        renderWizard();
      }
    });

    el('next')?.addEventListener('click', async () => {
      const step = currentStep();
      if (!config.canAdvance(state, step) && step?.id !== 'note') return;
      if (config.onStepComplete) await config.onStepComplete(state, step);
      state.stepIndex += 1;
      const steps = getSteps();
      if (state.stepIndex >= steps.length) {
        await showResults();
      } else {
        renderWizard();
      }
    });
  }

  function refreshNext() {
    const nextBtn = el('next');
    if (nextBtn) nextBtn.disabled = !config.canAdvance(state, currentStep());
  }

  function renderWizard() {
    const mount = el('wizard');
    if (!mount) return;

    const steps = getSteps();
    if (state.stepIndex >= steps.length) {
      mount.hidden = true;
      return;
    }

    mount.hidden = false;
    const step = currentStep();
    const body = config.renderStepBody(step, state, { escapeHtml, renderOptionGrid, renderChipGrid, formatTry });

    mount.innerHTML = `
    <div class="vacation-wizard-card">
      <h2>${escapeHtml(step.title)}</h2>
      ${step.subtitle ? `<p class="vacation-step-subtitle">${escapeHtml(step.subtitle)}</p>` : ''}
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
    if (state.confirmationStep && selected) return selected;
    return state.results[0] || null;
  }

  async function showResults() {
    state.results = config.buildResults(state);
    state.selected_option = '';
    state.confirmationStep = false;
    const wizardEl = el('wizard');
    if (wizardEl) wizardEl.hidden = true;
    const siteCategory = VERTICAL_SITE_CATEGORY[config.vertical] || config.vertical;
    trackAnalysisStarted(siteCategory, { phase: 'wizard_complete' });
    trackResultsViewed(siteCategory, { results_count: state.results.length });
    renderResults();
    await config.tracker.trackResults({
      vertical: config.vertical,
      score: state.results[0]?.score
    });
  }

  function renderResults() {
    const section = el('results');
    if (!section || !state.results.length) return;
    section.hidden = false;

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
    <div class="vacation-result-cards">
      ${state.results
        .map((r) => {
          const isPicked = state.selected_option === r.id;
          return `
        <article class="vacation-result-card ${r.badge.className} ${isPicked ? 'is-selected' : ''}" data-option="${escapeHtml(r.id)}">
          <div class="vacation-result-badge">${escapeHtml(r.badge.label)}</div>
          <div class="vacation-result-score">${r.score}<span>/100</span></div>
          <div class="vacation-result-visual"></div>
          <h3>${escapeHtml(r.title)}</h3>
          <p>${escapeHtml(r.description)}</p>
          <ul class="vacation-result-meta">
            <li><strong>${escapeHtml(wt('common.estimated', 'Tahmini'))}:</strong> ${escapeHtml(r.estimatedCost)}</li>
            <li><strong>${escapeHtml(wt('common.suitability', 'Uygunluk'))}:</strong> ${escapeHtml(r.suitability)}</li>
          </ul>
          <div class="vacation-result-why"><strong>${escapeHtml(wt('common.whyRecommended', 'Neden önerildi?'))}</strong><p>${escapeHtml(r.why)}</p></div>
          <div class="vacation-result-pros"><strong>${escapeHtml(wt('common.pros', 'Artılar'))}</strong><ul>${r.pros.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>
          <div class="vacation-result-cautions"><strong>${escapeHtml(wt('common.cautions', 'Dikkat'))}</strong><ul>${r.cautions.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>
          <button type="button" class="btn btn-sm vacation-select-card-btn ${isPicked ? 'btn-primary' : 'btn-outline'}" data-option="${escapeHtml(r.id)}">
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
        track: (eventName, meta) => config.tracker.track(eventName, meta)
      });
    }

    if (config.vertical === 'sigorta') {
      void mountSigortaResultsV2(section, {
        state,
        results: state.results,
        selectedOption: state.selected_option,
        track: (eventName, meta) => config.tracker.track(eventName, meta)
      });
    }

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectOption(id) {
    state.selected_option = id;
    config.tracker.trackSelect(id, { phase: 'pick' });
    renderResults();
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
    const toggle = $('.vacation-nav-toggle');
    const nav = el('nav');
    toggle?.addEventListener('click', () => {
      const open = nav?.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function scrollToFlow() {
    el('flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startWizard() {
    state.stepIndex = 0;
    renderWizard();
  }

  async function init() {
    await window.__ibI18n?.ready;
    document.body.classList.add(config.themeClass || '');
    setupMobileNav();
    if (!config.externalHeroBindings) {
      el('heroCta')?.addEventListener('click', () => {
        scrollToFlow();
        startWizard();
      });
      el('heroCtaSecondary')?.addEventListener('click', scrollToFlow);
    }
    await config.tracker.trackStart();
    renderWizard();
    document.addEventListener('ib:locale-changed', () => {
      renderWizard();
      if (state.results?.length) renderResults();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  return { scrollToFlow, startWizard, renderWizard, showResults };
}
