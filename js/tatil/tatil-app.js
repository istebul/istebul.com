import { STEP_OPTIONS, BUDGET_PLANS, DEFAULT_SETTINGS } from './tatil-config.js';
import {
  getVacationFlowSteps,
  getStepMeta,
  getOptionsForStep,
  applyGoalFlowDefaults,
  resetFieldsOnGoalChange,
  shouldShowChildrenFields
} from './tatil-flow.js';
import {
  trackVacationEvent,
  saveVacationLead,
  loadVacationSettings,
  loadActiveScenarios
} from './tatil-intake.js';
import {
  buildResults,
  buildAiCommentary,
  buildResultsSummary,
  getProgressSummary,
  syncDerivedState
} from './tatil-engine.js';
import { parseManualBudget, formatTry } from './tatil-utils.js';
import { renderPremiumDecisionDashboard } from '../ui/components/premium-decision-dashboard.js';
import { mountTatilResultsV2 } from '../features/tatil/tatil-results-v2.js';
import { bootstrapTatilFromAssistantQuery } from '../features/assistant/assistant-category-bridge.js';
import {
  trackAnalysisCompleted,
  trackLeadFormOpened,
  trackLeadSubmitted
} from '../platform/site-analytics.js';

const state = {
  stepIndex: 0,
  vacation_goal: '',
  budget_range: '',
  budget_manual: null,
  budget_total: null,
  budget_per_person: null,
  people_type: '',
  travelers_count: '',
  children_count: '',
  children_ages: '',
  expectations: [],
  vacation_type: '',
  date_start: '',
  date_end: '',
  date_period_note: '',
  date_flexibility: '',
  transport_preference: '',
  comfort_expectation: '',
  trip_nights: null,
  date_range: '',
  duration: '',
  user_note: '',
  selected_option: '',
  confirmationStep: false,
  results: [],
  settings: { ...DEFAULT_SETTINGS },
  scenarios: []
};

let wizardCompleteFired = false;
let leadOpenFired = false;
const VACATION_START_KEY = 'ib_vacation_start';

function hasVacationStartFired() {
  try {
    return sessionStorage.getItem(VACATION_START_KEY) === '1';
  } catch {
    return false;
  }
}

function markVacationStartFired() {
  try {
    sessionStorage.setItem(VACATION_START_KEY, '1');
  } catch {
    /* ignore */
  }
}

function maybeFireVacationStart(source = 'interaction') {
  if (hasVacationStartFired()) return;
  markVacationStartFired();
  void trackVacationEvent('vacation_start', { source });
}

function maybeFireVacationLeadOpen(source = 'interaction') {
  if (leadOpenFired) return;
  leadOpenFired = true;
  void trackVacationEvent('vacation_lead_open', { source });
  trackLeadFormOpened('tatil', { source });
}

function $(sel, root = document) {
  return root.querySelector(sel);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function activeSteps() {
  return getVacationFlowSteps(state.vacation_goal);
}

function currentStep() {
  return activeSteps()[state.stepIndex];
}

function canAdvance() {
  const step = currentStep();
  if (!step) return false;
  if (step.id === 'goal') return Boolean(state.vacation_goal);
  if (step.id === 'type') return Boolean(state.vacation_type);
  if (step.id === 'budget') {
    if (!state.budget_range) return false;
    if (state.budget_range === 'manuel') return Boolean(state.budget_total || state.budget_per_person || state.budget_manual);
    return true;
  }
  if (step.id === 'people') {
    if (!state.people_type || !state.travelers_count) return false;
    if (shouldShowChildrenFields(state)) {
      return Boolean(state.children_count || state.children_ages?.trim());
    }
    return true;
  }
  if (step.id === 'date') {
    if (!state.date_flexibility) return false;
    const hasDates = state.date_start && state.date_end;
    const hasPeriod = Boolean(state.date_period_note?.trim());
    if (hasDates) {
      return new Date(state.date_end) >= new Date(state.date_start);
    }
    return hasPeriod || state.date_flexibility === 'undecided';
  }
  if (step.id === 'preferences') {
    return Boolean(state.transport_preference) && Boolean(state.comfort_expectation);
  }
  if (step.id === 'expectations') return state.expectations.length > 0;
  if (step.id === 'note') return true;
  return false;
}

function renderProgress() {
  const el = $('#vacation-step-progress');
  if (!el) return;
  el.innerHTML = activeSteps().map((step, i) => {
    const active = i === state.stepIndex;
    const done = i < state.stepIndex;
    return `
      <div class="vacation-progress-item ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}" data-step="${i}">
        <span class="vacation-progress-num">${i + 1}</span>
        <span class="vacation-progress-label">${escapeHtml(step.label)}</span>
      </div>
    `;
  }).join('');
}

function renderAiPanel() {
  const el = $('#vacation-ai-summary');
  if (!el) return;
  const rows = getProgressSummary(state);
  el.innerHTML = rows
    .map(
      (row) => `
    <li class="${row.value ? 'is-set' : ''}">
      <span>${escapeHtml(row.key)}</span>
      <strong>${escapeHtml(row.value || 'Belirtilmedi')}</strong>
    </li>
  `
    )
    .join('');
}

function renderGoalCards() {
  return `
    <div class="vacation-option-grid">
      ${STEP_OPTIONS.goal
        .map((opt) => {
          const isSelected = state.vacation_goal === opt.value;
          return `
          <button type="button" class="vacation-option-card ${isSelected ? 'is-selected' : ''}"
            data-field="vacation_goal" data-value="${escapeHtml(opt.value)}">
            ${opt.icon ? `<span class="vacation-option-icon">${opt.icon}</span>` : ''}
            <span class="vacation-option-card-title">${escapeHtml(opt.label)}</span>
            <span class="vacation-option-card-desc">${escapeHtml(opt.fit || '')}</span>
          </button>
        `;
        })
        .join('')}
    </div>
  `;
}

function renderBudgetStep() {
  return `
    <div class="vacation-budget-grid">
      ${BUDGET_PLANS.map((plan) => {
        const isSelected = state.budget_range === plan.value;
        return `
        <button type="button" class="vacation-budget-card ${isSelected ? 'is-selected' : ''}"
          data-field="budget_range" data-value="${escapeHtml(plan.value)}">
          <span class="vacation-budget-card-title">${escapeHtml(plan.label)}</span>
          <p class="vacation-budget-card-desc">${escapeHtml(plan.description)}</p>
          ${plan.range ? `<span class="vacation-budget-card-range">${escapeHtml(plan.range)}</span>` : ''}
          ${plan.manual ? '<span class="vacation-budget-card-hint">Kendi tutarınızı girin</span>' : ''}
        </button>
      `;
      }).join('')}
    </div>
    <label class="vacation-manual-budget ${state.budget_range === 'manuel' ? '' : 'hidden'}">
      <span>Toplam bütçe</span>
      <input type="text" inputmode="numeric" id="vacation-budget-manual"
        placeholder="Örn: 85.000 TL"
        value="${state.budget_total ? formatTry(state.budget_total) : ''}"
        autocomplete="off">
    </label>
    <label class="vacation-manual-budget ${state.budget_range === 'manuel' ? '' : 'hidden'}">
      <span>Kişi başı bütçe (opsiyonel)</span>
      <input type="text" inputmode="numeric" id="vacation-budget-per-person"
        placeholder="Örn: 18.000 TL"
        value="${state.budget_per_person ? formatTry(state.budget_per_person) : ''}"
        autocomplete="off">
    </label>
  `;
}

function renderPeopleStep() {
  const peopleOptions = getOptionsForStep('people', state.vacation_goal);
  const childFields =
    shouldShowChildrenFields(state)
      ? `
    <div class="vacation-children-fields">
      <label class="vacation-field">
        <span>Çocuk sayısı</span>
        <input type="number" id="vacation-children-count" min="1" max="8" inputmode="numeric"
          value="${escapeHtml(state.children_count)}" placeholder="Örn: 2">
      </label>
      <label class="vacation-field">
        <span>Çocuk yaşları</span>
        <input type="text" id="vacation-children-ages"
          value="${escapeHtml(state.children_ages)}"
          placeholder="Örn: 4, 8" autocomplete="off">
      </label>
    </div>
  `
      : '';

  return `
    <div class="vacation-option-grid vacation-option-grid--rich">
      ${peopleOptions
        .map((opt) => {
          const isSelected = state.people_type === opt.value;
          return `
          <button type="button" class="vacation-option-card vacation-option-card--rich ${isSelected ? 'is-selected' : ''}"
            data-field="people_type" data-value="${escapeHtml(opt.value)}">
            <span class="vacation-option-card-title">${escapeHtml(opt.label)}</span>
            <span class="vacation-option-card-desc">${escapeHtml(opt.description)}</span>
          </button>
        `;
        })
        .join('')}
    </div>
    <label class="vacation-field">
      <span>Toplam kişi sayısı</span>
      <input type="number" id="vacation-travelers-count" min="1" max="20" inputmode="numeric"
        value="${escapeHtml(state.travelers_count)}" placeholder="Örn: 4">
    </label>
    ${childFields}
  `;
}

function renderExpectationsStep() {
  const chips = getOptionsForStep('expectations', state.vacation_goal);
  return `
    <div class="vacation-chip-grid">
      ${chips
        .map((item) => {
          const selected = state.expectations.includes(item);
          return `
            <button
              type="button"
              class="vacation-chip ${selected ? 'is-selected' : ''}"
              data-action="toggle-expectation"
              data-value="${escapeHtml(item)}"
            >${escapeHtml(item)}</button>
          `;
        })
        .join('')}
    </div>
    <p class="vacation-field-hint">En az 1, en fazla 5 beklenti seçin.</p>
  `;
}

function renderTypeStep() {
  const typeOptions = getOptionsForStep('type', state.vacation_goal);
  return `
    <div class="vacation-option-grid vacation-option-grid--rich vacation-option-grid--type">
      ${typeOptions
        .map((opt) => {
          const isSelected = state.vacation_type === opt.value;
          return `
          <button type="button" class="vacation-option-card vacation-option-card--rich ${isSelected ? 'is-selected' : ''}"
            data-field="vacation_type" data-value="${escapeHtml(opt.value)}">
            <span class="vacation-option-card-title">${escapeHtml(opt.label)}</span>
            <span class="vacation-option-card-desc">${escapeHtml(opt.description)}</span>
          </button>
        `;
        })
        .join('')}
    </div>
  `;
}

function renderDateStep() {
  return `
    <div class="vacation-date-step">
      <div class="vacation-date-fields vacation-date-fields--range">
        <label class="vacation-field">
          <span>Başlangıç tarihi</span>
          <input type="date" id="vacation-date-start" value="${escapeHtml(state.date_start)}">
        </label>
        <label class="vacation-field">
          <span>Bitiş tarihi</span>
          <input type="date" id="vacation-date-end" value="${escapeHtml(state.date_end)}"
            min="${escapeHtml(state.date_start || '')}">
        </label>
      </div>
      <p class="vacation-field-hint" id="vacation-date-duration-hint" hidden></p>
      <label class="vacation-field">
        <span>Yaklaşık dönem (tarih seçemiyorsanız)</span>
        <input type="text" id="vacation-date-period" value="${escapeHtml(state.date_period_note)}"
          placeholder="Örn: Temmuz ortası, 1 hafta">
      </label>
      <fieldset class="vacation-flex-fieldset">
        <legend>Tarih esnekliği</legend>
        <div class="vacation-flex-options">
          ${STEP_OPTIONS.dateFlexibility
            .map(
              (opt) => `
            <label class="vacation-flex-option">
              <input type="radio" name="date_flexibility" value="${escapeHtml(opt.value)}"
                ${state.date_flexibility === opt.value ? 'checked' : ''}>
              <span>${escapeHtml(opt.label)}</span>
            </label>
          `
            )
            .join('')}
        </div>
      </fieldset>
    </div>
  `;
}

function renderPreferencesStep() {
  const transportOptions = getOptionsForStep('transport', state.vacation_goal);
  const comfortOptions = getOptionsForStep('comfort', state.vacation_goal);
  return `
    <p class="vacation-step-subtitle">Ulaşım tercihi</p>
    <div class="vacation-option-grid vacation-option-grid--rich">
      ${transportOptions
        .map((opt) => {
          const isSelected = state.transport_preference === opt.value;
          return `
          <button type="button" class="vacation-option-card vacation-option-card--rich ${isSelected ? 'is-selected' : ''}"
            data-field="transport_preference" data-value="${escapeHtml(opt.value)}">
            <span class="vacation-option-card-title">${escapeHtml(opt.label)}</span>
            <span class="vacation-option-card-desc">${escapeHtml(opt.description)}</span>
          </button>`;
        })
        .join('')}
    </div>
    <p class="vacation-step-subtitle">Konfor beklentisi</p>
    <div class="vacation-option-grid vacation-option-grid--rich">
      ${comfortOptions
        .map((opt) => {
          const isSelected = state.comfort_expectation === opt.value;
          return `
          <button type="button" class="vacation-option-card vacation-option-card--rich ${isSelected ? 'is-selected' : ''}"
            data-field="comfort_expectation" data-value="${escapeHtml(opt.value)}">
            <span class="vacation-option-card-title">${escapeHtml(opt.label)}</span>
            <span class="vacation-option-card-desc">${escapeHtml(opt.description)}</span>
          </button>`;
        })
        .join('')}
    </div>`;
}

function renderWizard() {
  const mount = $('#vacation-wizard');
  if (!mount) return;

  const steps = activeSteps();
  if (state.stepIndex >= steps.length) {
    mount.hidden = true;
    renderResults();
    return;
  }

  mount.hidden = false;
  const step = currentStep();
  const stepMeta = getStepMeta(step.id, state.vacation_goal);
  let body = '';

  if (step.id === 'goal') body = renderGoalCards();
  else if (step.id === 'budget') body = renderBudgetStep();
  else if (step.id === 'people') {
    applyGoalFlowDefaults(state, state.vacation_goal);
    body = renderPeopleStep();
  }
  else if (step.id === 'type') body = renderTypeStep();
  else if (step.id === 'date') body = renderDateStep();
  else if (step.id === 'preferences') body = renderPreferencesStep();
  else if (step.id === 'expectations') body = renderExpectationsStep();
  else if (step.id === 'note') {
    body = `
      <textarea id="vacation-user-note" class="vacation-note-input" rows="4"
        placeholder="Çocukla rahat olsun, çok yorucu olmasın, bütçe aşılmasın.">${escapeHtml(state.user_note)}</textarea>
    `;
  }

  mount.innerHTML = `
    <div class="vacation-wizard-card">
      <h2>${escapeHtml(stepMeta.title)}</h2>
      ${stepMeta.subtitle ? `<p class="vacation-step-subtitle">${escapeHtml(stepMeta.subtitle)}</p>` : ''}
      ${body}
      <div class="vacation-wizard-actions">
        ${state.stepIndex > 0 ? '<button type="button" class="btn btn-ghost" id="vacation-back">Geri</button>' : ''}
        <button type="button" class="btn btn-primary" id="vacation-next" ${canAdvance() ? '' : 'disabled'}>
          ${step.id === 'note' ? 'Kişiselleştirilmiş önerileri gör' : 'Devam et →'}
        </button>
      </div>
    </div>
  `;

  bindWizardEvents();
  updateDateHint();
  renderProgress();
  renderAiPanel();
}

function updateDateHint() {
  const hint = $('#vacation-date-duration-hint');
  if (!hint) return;
  if (state.date_start && state.date_end) {
    const end = new Date(state.date_end);
    const start = new Date(state.date_start);
    if (end < start) {
      hint.hidden = false;
      hint.textContent = 'Bitiş tarihi başlangıçtan önce olamaz.';
      hint.classList.add('is-error');
      return;
    }
    hint.classList.remove('is-error');
    const nights = Math.round((end - start) / (86400000));
    if (nights > 0) {
      hint.hidden = false;
      hint.textContent = `Tahmini süre: ${nights} gece (${nights + 1} gün).`;
    } else {
      hint.hidden = true;
    }
  } else {
    hint.hidden = true;
  }
}

function refreshNextButton() {
  const next = $('#vacation-next');
  if (next) next.disabled = !canAdvance();
}

function bindWizardEvents() {
  document.querySelectorAll('[data-field]').forEach((btn) => {
    btn.addEventListener('click', () => {
      maybeFireVacationStart('field_select');
      const field = btn.dataset.field;
      const value = btn.dataset.value;
      if (field === 'vacation_goal') {
        const previousGoal = state.vacation_goal;
        state.vacation_goal = value;
        resetFieldsOnGoalChange(state, previousGoal, value);
        const steps = getVacationFlowSteps(value);
        if (state.stepIndex >= steps.length) {
          state.stepIndex = Math.max(0, steps.length - 1);
        }
      } else {
        state[field] = value;
      }
      if (field === 'budget_range' && value !== 'manuel') {
        state.budget_manual = null;
        state.budget_total = null;
        state.budget_per_person = null;
      }
      if (field === 'people_type' && value !== 'cocuklu-aile' && state.vacation_goal !== 'cocuklu-aile') {
        state.children_count = '';
        state.children_ages = '';
      }
      if (field === 'people_type') {
        applyGoalFlowDefaults(state, state.vacation_goal);
      }
      renderWizard();
    });
  });

  const manualInput = $('#vacation-budget-manual');
  manualInput?.addEventListener('input', (e) => {
    maybeFireVacationStart('manual_input');
    state.budget_total = parseManualBudget(e.target.value);
    state.budget_manual = state.budget_total;
    e.target.value = state.budget_total ? formatTry(state.budget_total) : '';
    refreshNextButton();
    renderAiPanel();
  });

  $('#vacation-budget-per-person')?.addEventListener('input', (e) => {
    state.budget_per_person = parseManualBudget(e.target.value);
    e.target.value = state.budget_per_person ? formatTry(state.budget_per_person) : '';
    refreshNextButton();
    renderAiPanel();
  });

  $('#vacation-children-count')?.addEventListener('input', (e) => {
    state.children_count = e.target.value;
    refreshNextButton();
    renderAiPanel();
  });

  $('#vacation-children-ages')?.addEventListener('input', (e) => {
    state.children_ages = e.target.value;
    refreshNextButton();
    renderAiPanel();
  });

  $('#vacation-travelers-count')?.addEventListener('input', (e) => {
    state.travelers_count = e.target.value;
    refreshNextButton();
    renderAiPanel();
  });

  document.querySelectorAll('[data-action="toggle-expectation"]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const value = chip.dataset.value;
      if (!value) return;
      const index = state.expectations.indexOf(value);
      if (index >= 0) {
        state.expectations.splice(index, 1);
      } else if (state.expectations.length < 5) {
        state.expectations.push(value);
      }
      renderWizard();
    });
  });

  $('#vacation-date-start')?.addEventListener('change', (e) => {
    state.date_start = e.target.value;
    const endInput = $('#vacation-date-end');
    if (endInput) endInput.min = state.date_start;
    if (state.date_end && state.date_end < state.date_start) {
      state.date_end = '';
      if (endInput) endInput.value = '';
    }
    updateDateHint();
    refreshNextButton();
    renderAiPanel();
  });

  $('#vacation-date-end')?.addEventListener('change', (e) => {
    state.date_end = e.target.value;
    updateDateHint();
    refreshNextButton();
    renderAiPanel();
  });

  $('#vacation-date-period')?.addEventListener('input', (e) => {
    state.date_period_note = e.target.value;
    refreshNextButton();
    renderAiPanel();
  });

  document.querySelectorAll('input[name="date_flexibility"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        state.date_flexibility = radio.value;
        refreshNextButton();
        renderAiPanel();
      }
    });
  });

  $('#vacation-user-note')?.addEventListener('input', (e) => {
    state.user_note = e.target.value;
    renderAiPanel();
  });

  $('#vacation-back')?.addEventListener('click', () => {
    if (state.stepIndex > 0) {
      state.stepIndex -= 1;
      renderWizard();
    }
  });

  $('#vacation-next')?.addEventListener('click', async () => {
    if (!canAdvance() && currentStep()?.id !== 'note') return;
    maybeFireVacationStart('next_click');
    const step = currentStep();
    if (step?.id === 'note') {
      state.user_note = $('#vacation-user-note')?.value?.trim() || '';
    }
    syncDerivedState(state);
    await trackVacationEvent('vacation_step_completed', {
      step: step?.id,
      step_index: state.stepIndex
    });
    state.stepIndex += 1;
    if (state.stepIndex >= activeSteps().length) {
      showResults();
    } else {
      renderWizard();
    }
  });
}

function getSelectedResult() {
  if (!state.selected_option) return null;
  return state.results.find((r) => r.id === state.selected_option) || null;
}

function getDisplayResult() {
  const selected = getSelectedResult();
  if (state.confirmationStep && selected) return selected;
  return state.results[0] || null;
}

async function showResults() {
  syncDerivedState(state);
  state.results = buildResults(state, state.scenarios);
  state.selected_option = '';
  state.confirmationStep = false;
  renderWizard();
  renderResults();
  if (!wizardCompleteFired) {
    wizardCompleteFired = true;
    await trackVacationEvent('vacation_wizard_complete', {
      budget_range: state.budget_range,
      vacation_goal: state.vacation_goal
    });
    trackAnalysisCompleted('tatil', {
      budget_range: state.budget_range,
      vacation_goal: state.vacation_goal
    });
  }
  await trackVacationEvent('vacation_results_view', {
    budget_range: state.budget_range,
    vacation_goal: state.vacation_goal
  });
}

function renderResults() {
  const section = $('#vacation-results');
  if (!section || !state.results.length) return;
  section.hidden = false;

  const commentary = buildAiCommentary(state, state.results);
  const summary = buildResultsSummary(state, state.results);
  const primary = getDisplayResult();
  const selectedCard = getSelectedResult();
  const costLabelMap = {
    accommodation: 'Konaklama',
    transport: 'Ulaşım / uçuş',
    transfer: 'Transfer',
    food: 'Yemek',
    extras: 'Ekstra harcama',
    children: 'Çocuk maliyeti',
    visaDocs: 'Vize / evrak',
    carRental: 'Araç kiralama'
  };
  const disclaimer =
    state.settings.vacation_disclaimer_text || DEFAULT_SETTINGS.vacation_disclaimer_text;
  const partnerEnabled = state.settings.vacation_partner_cta_enabled === 'true';

  const dashboardHtml = renderPremiumDecisionDashboard({
    category: 'tatil',
    kicker: 'Tatil analizi tamamlandı',
    title: 'Kişiselleştirilmiş tatil önerileri',
    decisionScore: summary.fitScore,
    scoreBand: summary.scoreBand,
    totalCostLabel: summary.totalCostLabel,
    riskLabel: summary.seasonRisk,
    riskDetail: primary?.scores?.risk,
    advantages: primary?.pros || [],
    cautions: primary?.cautions || [],
    aiSummary: commentary.summary,
    aiBullets: commentary.bullets,
    nextStep: summary.nextStep || 'Bir destinasyon seçin ve sezon yoğunluğunu tekrar kontrol edin.'
  });

  section.innerHTML = `
    <div class="vacation-results-header">
      <p>Tahmini skor ve maliyet aralıkları bilgilendirme amaçlıdır; kesin fiyat taahhüdü değildir.</p>
    </div>
    ${dashboardHtml}
    <p class="vacation-results-top-pick">Öne çıkan: <strong>${escapeHtml(summary.topTitle)}</strong></p>
    <div class="vacation-result-cards" role="list" aria-label="Tatil seçenekleri">
      ${state.results
        .map(
          (r) => {
            const isPicked = state.selected_option === r.id;
            return `
        <article
          class="vacation-result-card ${r.badge.className} ${isPicked ? 'is-selected' : ''}"
          role="listitem"
          data-option="${escapeHtml(r.id)}"
          aria-pressed="${isPicked ? 'true' : 'false'}"
        >
          <div class="vacation-result-badge">${escapeHtml(r.badge.label)}</div>
          <div class="vacation-result-score" aria-label="Karar skoru">${r.score}<span>/100</span></div>
          <div class="vacation-result-visual" role="img" aria-label=""></div>
          <h3>${escapeHtml(r.title)}</h3>
          <p>${escapeHtml(r.description)}</p>
          ${
            r.tags?.length
              ? `<div class="vacation-result-tags">${r.tags.map((t) => `<span class="vacation-tag ${t.className}">${escapeHtml(t.text)}</span>`).join('')}</div>`
              : ''
          }
          <ul class="vacation-result-meta">
            <li><strong>Tahmini maliyet:</strong> ${escapeHtml(r.estimatedCost)}</li>
            <li><strong>Uygunluk:</strong> ${escapeHtml(r.suitability)}</li>
            <li><strong>Kimler için uygun?</strong> ${escapeHtml(r.audience)}</li>
          </ul>
          <div class="vacation-result-why">
            <strong>Neden önerildi?</strong>
            <p>${escapeHtml(r.why)}</p>
          </div>
          <div class="vacation-result-pros">
            <strong>Artılar</strong>
            <ul>${r.pros.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
          </div>
          <div class="vacation-result-cautions">
            <strong>Dikkat edilmesi gerekenler</strong>
            <ul>${r.cautions.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
          </div>
          <button
            type="button"
            class="btn btn-sm vacation-select-card-btn ${isPicked ? 'btn-primary' : 'btn-outline'}"
            data-option="${escapeHtml(r.id)}"
            aria-label="${isPicked ? 'Seçili tatil' : 'Tatil seçeneği olarak seç'}: ${escapeHtml(r.title)}"
          >
            ${isPicked ? '✓ Seçildi' : 'Bu tatili seç'}
          </button>
        </article>
      `;
          }
        )
        .join('')}
    </div>

    ${
      !state.confirmationStep
        ? `
    <div class="vacation-selection-bar" id="vacation-selection-bar">
      <div class="vacation-selection-copy">
        <p class="vacation-selection-hint ${selectedCard ? 'hidden' : ''}" id="vacation-selection-hint">
          Devam etmek için yukarıdaki seçeneklerden birini seçin.
        </p>
        <p class="vacation-selection-picked ${selectedCard ? '' : 'hidden'}" id="vacation-selection-picked" aria-live="polite">
          Seçiminiz: <strong>${selectedCard ? escapeHtml(selectedCard.title) : ''}</strong>
          <span class="vacation-selection-meta">${selectedCard ? ` · ${escapeHtml(selectedCard.estimatedCost)} · Skor ${selectedCard.score}/100` : ''}</span>
        </p>
      </div>
      <button
        type="button"
        class="btn btn-primary"
        id="vacation-confirm-selection"
        ${selectedCard ? '' : 'disabled'}
      >
        Seçimi onayla ve devam et
      </button>
    </div>
    <div class="vacation-results-toolbar">
      <button type="button" class="btn btn-ghost btn-sm" id="vacation-alt-economic">Daha ekonomik alternatif üret</button>
      <button type="button" class="btn btn-ghost btn-sm" id="vacation-alt-comfort">Daha konforlu alternatif üret</button>
    </div>
    `
        : ''
    }

    <section class="vacation-cost-panel" aria-label="Toplam maliyet görünümü">
      <div class="vacation-cost-head">
        <h3>Toplam maliyet görünümü</h3>
        <p>${
          state.confirmationStep && selectedCard
            ? `Seçtiğiniz seçenek (${escapeHtml(selectedCard.title)}) için tahmini maliyet özeti.`
            : 'Öne çıkan seçenek için tahmini maliyet; kart seçiminizi onayladıktan sonra seçtiğiniz seçeneğe göre güncellenir.'
        }</p>
      </div>
      <div class="vacation-cost-kpis">
        <article><span>Görünen fiyat</span><strong>${escapeHtml(primary?.costs?.visiblePriceLabel || '—')}</strong></article>
        <article><span>Tahmini gerçek maliyet</span><strong>${escapeHtml(primary?.costs?.realTotalLabel || '—')}</strong></article>
        <article><span>Kişi başı maliyet</span><strong>${escapeHtml(primary?.costs?.perPersonLabel || '—')}</strong></article>
        <article><span>Gizli giderler</span><strong>${escapeHtml(primary?.costs?.hiddenLabel || '—')}</strong></article>
      </div>
      <ul class="vacation-cost-lines">
        ${(primary?.costs?.lines || [])
          .map((line) => `<li><span>${escapeHtml(costLabelMap[line.key] || line.key)}</span><strong>${escapeHtml(line.label)}</strong></li>`)
          .join('')}
      </ul>
    </section>

    <section class="vacation-alternative-panel" aria-label="Alternatif öneriler">
      <h3>Bunları da değerlendirebilirsiniz</h3>
      <div class="vacation-alternative-grid">
        ${(primary?.alternatives || [])
          .map(
            (alt) => `
          <article class="vacation-alt-card">
            <h4>${escapeHtml(alt.title)}</h4>
            <p>${escapeHtml(alt.reason)}</p>
            <ul>
              <li><strong>Neden:</strong> ${escapeHtml(alt.delta)}</li>
              <li><strong>Maliyet:</strong> ${escapeHtml(alt.cost)}</li>
              <li><strong>Risk:</strong> ${escapeHtml(alt.risk)}</li>
              <li><strong>Uygunluk skoru:</strong> ${escapeHtml(String(alt.score))}/100</li>
            </ul>
          </article>
        `
          )
          .join('')}
      </div>
    </section>

    ${
      state.confirmationStep && selectedCard
        ? `
    <div class="vacation-final-cta" id="vacation-final-cta">
      <button type="button" class="btn btn-ghost btn-sm vacation-change-selection" id="vacation-change-selection">
        ← Seçimi değiştir
      </button>
      <div class="vacation-selected-recap" aria-label="Onaylanan tatil seçimi">
        <span class="vacation-selected-recap-label">Onayladığınız seçenek</span>
        <h3>${escapeHtml(selectedCard.title)}</h3>
        <p>${escapeHtml(selectedCard.badge.label)} · Skor ${selectedCard.score}/100 · ${escapeHtml(selectedCard.estimatedCost)}</p>
      </div>
      <h3 class="vacation-final-heading">İletişim bilgileriniz (isteğe bağlı)</h3>
      <p class="vacation-final-lead-hint">Tercihinizi kaydedelim; size özel teklif veya danışman dönüşü için iletişim bırakabilirsiniz.</p>
      <div class="vacation-lead-form" id="vacation-lead-form">
        <div class="form-row">
          <input type="text" id="vacation-lead-name" placeholder="Ad soyad" autocomplete="name">
          <input type="tel" id="vacation-lead-phone" placeholder="Telefon" autocomplete="tel">
          <input type="email" id="vacation-lead-email" placeholder="E-posta" autocomplete="email">
        </div>
      </div>
      <button type="button" class="btn btn-primary btn-lg" id="vacation-select-primary">
        Bu tatili seç ve talebi gönder
      </button>
      <div class="vacation-final-secondary">
        <button type="button" class="btn btn-ghost" id="vacation-partner-cta" ${partnerEnabled ? '' : 'disabled'} title="${partnerEnabled ? '' : 'Partner teklifleri şu an kapalı'}">
          Partner tekliflerini görmek istiyorum
        </button>
      </div>
      <p class="vacation-disclaimer">${escapeHtml(disclaimer)}</p>
    </div>
    `
        : ''
    }
  `;

  bindResultsEvents(commentary);

  void mountTatilResultsV2(section, {
    state,
    results: state.results,
    track: (eventName, meta) => {
      try {
        trackVacationEvent(eventName, meta);
      } catch {}
    }
  });

  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectVacationOption(id) {
  if (!id) return;
  state.selected_option = id;
  trackVacationEvent('vacation_option_selected', { option: id, phase: 'pick' });
  renderResults();
}

function bindResultsEvents(commentary) {
  document.querySelectorAll('.vacation-select-card-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectVacationOption(btn.dataset.option);
    });
  });

  document.querySelectorAll('.vacation-result-card[data-option]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      selectVacationOption(card.dataset.option);
    });
  });

  $('#vacation-confirm-selection')?.addEventListener('click', () => {
    if (!state.selected_option) return;
    state.confirmationStep = true;
    maybeFireVacationLeadOpen('confirm_selection');
    trackVacationEvent('vacation_selection_confirmed', { option: state.selected_option });
    renderResults();
    $('#vacation-final-cta')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('#vacation-change-selection')?.addEventListener('click', () => {
    state.confirmationStep = false;
    renderResults();
    $('#vacation-selection-bar')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  $('#vacation-select-primary')?.addEventListener('click', () => submitLead('primary', commentary));
  $('#vacation-alt-economic')?.addEventListener('click', () => regenerateVariant('economic'));
  $('#vacation-alt-comfort')?.addEventListener('click', () => regenerateVariant('comfort'));
  $('#vacation-partner-cta')?.addEventListener('click', () => {
    maybeFireVacationLeadOpen('partner_cta');
    trackVacationEvent('vacation_partner_cta_click');
    submitLead('partner', commentary);
    window.location.href = '/iletisim.html?dikey=tatil&kaynak=partner-teklif';
  });
}

function regenerateVariant(mode) {
  const rotated = [...state.results];
  if (mode === 'economic') {
    rotated.sort((a, b) => a.score - b.score);
  } else {
    rotated.sort((a, b) => b.score - a.score);
  }
  state.results = rotated;
  state.selected_option = '';
  state.confirmationStep = false;
  renderResults();
  trackVacationEvent('vacation_option_selected', { variant: mode });
}

function buildLeadNote() {
  const parts = [state.user_note].filter(Boolean);
  if (shouldShowChildrenFields(state)) {
    const c = [];
    if (state.children_count) c.push(`çocuk sayısı: ${state.children_count}`);
    if (state.children_ages) c.push(`yaşlar: ${state.children_ages}`);
    if (c.length) parts.push(c.join(', '));
  }
  if (state.date_flexibility) {
    parts.push(`esneklik: ${state.date_flexibility}`);
  }
  return parts.join(' | ');
}

async function submitLead(source, commentary) {
  if (!state.confirmationStep || !state.selected_option) {
    const bar = $('#vacation-selection-bar');
    if (bar) {
      bar.classList.add('vacation-selection-bar--attention');
      bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => bar.classList.remove('vacation-selection-bar--attention'), 2400);
    }
    return;
  }

  syncDerivedState(state);
  const full_name = $('#vacation-lead-name')?.value?.trim() || '';
  const phone = $('#vacation-lead-phone')?.value?.trim() || '';
  const email = $('#vacation-lead-email')?.value?.trim() || '';
  const selectedResult = getSelectedResult();
  const selected = state.selected_option;

  const budgetPayload =
    state.budget_range === 'manuel' && state.budget_manual
      ? `manuel:${state.budget_manual}`
      : state.budget_range;

  const payload = {
    full_name,
    phone,
    email,
    vacation_goal: state.vacation_goal,
    budget_range: budgetPayload,
    people_type: state.people_type,
    travelers_count: Number(state.travelers_count) || null,
    children_ages: state.children_ages || null,
    vacation_type: state.vacation_type,
    expectations: state.expectations.join(', '),
    date_range: state.date_range,
    duration: state.duration,
    user_note: buildLeadNote(),
    selected_option: selected,
    decision_score: selectedResult?.score || null,
    estimated_cost_range:
      selectedResult?.costs?.realTotalLabel || selectedResult?.estimatedCost || '',
    ai_summary: commentary.summary
  };

  const res = await saveVacationLead(payload);
  if (res.ok) {
    const msg = document.createElement('p');
    msg.className = 'vacation-toast';
    msg.textContent = 'Tercihiniz kaydedildi. Ekibimiz profilinize uygun seçenekleri paylaşabilir.';
    $('#vacation-final-cta')?.prepend(msg);
    trackVacationEvent('vacation_lead_submit', { source, selected_option: selected });
    trackLeadSubmitted('tatil', { source, selected_option: selected });
    trackVacationEvent('vacation_option_selected', { source, saved: true });
  } else if (!full_name && !phone && !email) {
    alert('İletişim bilgisi paylaşırsanız size özel teklif hazırlayabiliriz. İsterseniz yine de devam edebilirsiniz.');
    await saveVacationLead({ ...payload, selected_option: selected });
  }
}

function setupMobileNav() {
  const toggle = $('.vacation-nav-toggle');
  const nav = $('#vacation-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

function scrollToWizard() {
  maybeFireVacationStart('hero_cta');
  document.getElementById('vacation-flow')?.scrollIntoView({ behavior: 'smooth' });
  state.stepIndex = 0;
  renderWizard();
}

async function init() {
  const [settings, scenarios] = await Promise.all([loadVacationSettings(), loadActiveScenarios()]);
  if (settings) state.settings = { ...DEFAULT_SETTINGS, ...settings };

  if (state.settings.vacation_enabled === 'false') {
    const main = document.querySelector('.vacation-main');
    if (main) {
      main.innerHTML =
        '<p class="vacation-disabled">Tatil Karar Asistanı geçici olarak kapalıdır. <a href="/">Ana sayfaya dönün</a>.</p>';
    }
    return;
  }

  if (scenarios.length) state.scenarios = scenarios;

  bootstrapTatilFromAssistantQuery(state, new URLSearchParams(window.location.search));
  if (state.vacation_goal) {
    applyGoalFlowDefaults(state);
  }

  setupMobileNav();
  renderProgress();
  renderAiPanel();
  renderWizard();

  $('#vacation-hero-cta')?.addEventListener('click', scrollToWizard);
  $('#vacation-hero-cta-secondary')?.addEventListener('click', scrollToWizard);

  await trackVacationEvent('vacation_page_view');
  document.body.classList.add('ib-ready');
}

init();
