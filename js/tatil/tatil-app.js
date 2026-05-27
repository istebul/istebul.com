import { VACATION_STEPS, STEP_OPTIONS, DEFAULT_SETTINGS } from './tatil-config.js';
import {
  trackVacationEvent,
  saveVacationLead,
  loadVacationSettings,
  loadActiveScenarios
} from './tatil-intake.js';
import { buildResults, buildAiCommentary, getProgressSummary } from './tatil-engine.js';

const state = {
  stepIndex: 0,
  vacation_goal: '',
  budget_range: '',
  people_type: '',
  vacation_type: '',
  date_range: '',
  duration: '',
  user_note: '',
  selected_option: '',
  results: [],
  settings: { ...DEFAULT_SETTINGS },
  scenarios: []
};

let resultsRendered = false;

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

function currentStep() {
  return VACATION_STEPS[state.stepIndex];
}

function canAdvance() {
  const step = currentStep();
  if (!step) return false;
  if (step.id === 'goal') return Boolean(state.vacation_goal);
  if (step.id === 'budget') return Boolean(state.budget_range);
  if (step.id === 'people') return Boolean(state.people_type);
  if (step.id === 'type') return Boolean(state.vacation_type);
  if (step.id === 'date') return Boolean(state.date_range && state.duration);
  if (step.id === 'note') return true;
  return false;
}

function renderProgress() {
  const el = $('#vacation-step-progress');
  if (!el) return;
  el.innerHTML = VACATION_STEPS.map((step, i) => {
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

const STEP_FIELD = {
  goal: 'vacation_goal',
  budget: 'budget_range',
  people: 'people_type',
  type: 'vacation_type'
};

function renderOptionCards(stepId) {
  const options = STEP_OPTIONS[stepId] || [];
  const field = STEP_FIELD[stepId];
  return `
    <div class="vacation-option-grid">
      ${options
        .map((opt) => {
          const isSelected = state[field] === opt.value;
          return `
          <button type="button" class="vacation-option-card ${isSelected ? 'is-selected' : ''}"
            data-field="${field}" data-value="${escapeHtml(opt.value)}">
            ${opt.icon ? `<span class="vacation-option-icon">${opt.icon}</span>` : ''}
            <span>${escapeHtml(opt.label)}</span>
          </button>
        `;
        })
        .join('')}
    </div>
  `;
}

function renderWizard() {
  const mount = $('#vacation-wizard');
  if (!mount) return;

  if (state.stepIndex >= VACATION_STEPS.length) {
    mount.hidden = true;
    renderResults();
    return;
  }

  mount.hidden = false;
  const step = currentStep();
  let body = '';

  if (step.id === 'goal') {
    body = renderOptionCards('goal');
  } else if (step.id === 'budget') {
    body = renderOptionCards('budget');
  } else if (step.id === 'people') {
    body = renderOptionCards('people');
  } else if (step.id === 'type') {
    body = renderOptionCards('type');
  } else if (step.id === 'date') {
    body = `
      <div class="vacation-date-fields">
        <label class="vacation-field">
          <span>Tarih aralığı</span>
          <input type="date" id="vacation-date-start" value="${escapeHtml(state.date_range.split('–')[0]?.trim() || '')}">
        </label>
        <label class="vacation-field">
          <span>Süre</span>
          <select id="vacation-duration">
            <option value="">Seçin</option>
            ${STEP_OPTIONS.duration
              .map(
                (d) =>
                  `<option value="${escapeHtml(d.value)}" ${state.duration === d.value ? 'selected' : ''}>${escapeHtml(d.label)}</option>`
              )
              .join('')}
          </select>
        </label>
      </div>
    `;
  } else if (step.id === 'note') {
    body = `
      <textarea id="vacation-user-note" class="vacation-note-input" rows="4"
        placeholder="Çocukla rahat olsun, çok yorucu olmasın, bütçe aşılmasın.">${escapeHtml(state.user_note)}</textarea>
    `;
  }

  mount.innerHTML = `
    <div class="vacation-wizard-card">
      <h2>${escapeHtml(step.title)}</h2>
      ${body}
      <div class="vacation-wizard-actions">
        ${state.stepIndex > 0 ? '<button type="button" class="btn btn-ghost" id="vacation-back">Geri</button>' : ''}
        <button type="button" class="btn btn-primary" id="vacation-next" ${canAdvance() ? '' : 'disabled'}>
          ${step.id === 'note' ? 'Sonuçları gör' : 'Devam et →'}
        </button>
      </div>
    </div>
  `;

  bindWizardEvents();
  renderProgress();
  renderAiPanel();
}

function bindWizardEvents() {
  document.querySelectorAll('.vacation-option-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const value = btn.dataset.value;
      state[field] = value;
      renderWizard();
    });
  });

  $('#vacation-date-start')?.addEventListener('change', (e) => {
    state.date_range = e.target.value;
    const next = $('#vacation-next');
    if (next) next.disabled = !canAdvance();
    renderAiPanel();
  });

  $('#vacation-duration')?.addEventListener('change', (e) => {
    state.duration = e.target.value;
    const next = $('#vacation-next');
    if (next) next.disabled = !canAdvance();
    renderAiPanel();
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
    const step = currentStep();
    if (step?.id === 'note') {
      state.user_note = $('#vacation-user-note')?.value?.trim() || '';
    }
    await trackVacationEvent('vacation_step_completed', {
      step: step?.id,
      step_index: state.stepIndex
    });
    state.stepIndex += 1;
    if (state.stepIndex >= VACATION_STEPS.length) {
      showResults();
    } else {
      renderWizard();
    }
  });
}

async function showResults() {
  state.results = buildResults(state, state.scenarios);
  resultsRendered = true;
  renderWizard();
  renderResults();
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
  const disclaimer =
    state.settings.vacation_disclaimer_text || DEFAULT_SETTINGS.vacation_disclaimer_text;
  const partnerEnabled = state.settings.vacation_partner_cta_enabled === 'true';

  section.innerHTML = `
    <div class="vacation-results-header">
      <h2>Size özel öneriler</h2>
      <p>Tahmini skor ve maliyet aralıkları — kesin fiyat taahhüdü değildir.</p>
    </div>
    <div class="vacation-result-cards">
      ${state.results
        .map(
          (r) => `
        <article class="vacation-result-card ${r.badge.className}">
          <div class="vacation-result-badge">${escapeHtml(r.badge.label)}</div>
          <div class="vacation-result-score" aria-label="Karar skoru">${r.score}<span>/100</span></div>
          <img src="${escapeHtml(r.image_url)}" alt="" loading="lazy" width="400" height="220">
          <h3>${escapeHtml(r.title)}</h3>
          <p>${escapeHtml(r.description)}</p>
          <ul class="vacation-result-meta">
            <li><strong>Tahmini maliyet:</strong> ${escapeHtml(r.estimatedCost)}</li>
            <li><strong>Kime uygun:</strong> ${escapeHtml(r.audience)}</li>
          </ul>
          <div class="vacation-result-pros">
            <strong>Artılar</strong>
            <ul>${r.pros.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
          </div>
          <div class="vacation-result-cautions">
            <strong>Dikkat</strong>
            <ul>${r.cautions.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
          </div>
          <button type="button" class="btn btn-outline btn-sm vacation-detail-btn" data-option="${escapeHtml(r.id)}">
            Detayları incele →
          </button>
        </article>
      `
        )
        .join('')}
    </div>

    <div class="vacation-ai-comment" id="vacation-ai-comment">
      <h3>Yapay zekâ yorumu</h3>
      <p>${escapeHtml(commentary.summary)}</p>
      <ul>${commentary.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
      <p class="vacation-ai-caution">⚠ ${escapeHtml(commentary.caution)}</p>
    </div>

    <div class="vacation-final-cta">
      <h3>Nihai kararınızı verin</h3>
      <div class="vacation-lead-form" id="vacation-lead-form">
        <div class="form-row">
          <input type="text" id="vacation-lead-name" placeholder="Ad soyad (isteğe bağlı)" autocomplete="name">
          <input type="tel" id="vacation-lead-phone" placeholder="Telefon (isteğe bağlı)" autocomplete="tel">
          <input type="email" id="vacation-lead-email" placeholder="E-posta (isteğe bağlı)" autocomplete="email">
        </div>
      </div>
      <button type="button" class="btn btn-primary btn-lg" id="vacation-select-primary">
        Bu tatili seç
      </button>
      <div class="vacation-final-secondary">
        <button type="button" class="btn btn-ghost" id="vacation-alt-economic">Daha ekonomik alternatif üret</button>
        <button type="button" class="btn btn-ghost" id="vacation-alt-comfort">Daha konforlu alternatif üret</button>
        <button type="button" class="btn btn-ghost" id="vacation-partner-cta" ${partnerEnabled ? '' : 'disabled'} title="${partnerEnabled ? '' : 'Partner teklifleri şu an kapalı'}">
          Partner tekliflerini görmek istiyorum
        </button>
      </div>
      <p class="vacation-disclaimer">${escapeHtml(disclaimer)}</p>
    </div>
  `;

  bindResultsEvents(commentary);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bindResultsEvents(commentary) {
  document.querySelectorAll('.vacation-detail-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.option;
      state.selected_option = id;
      trackVacationEvent('vacation_option_selected', { option: id });
      const card = state.results.find((r) => r.id === id);
      if (card) {
        alert(
          `${card.title}\n\nKarar skoru: ${card.score}/100\nTahmini maliyet: ${card.estimatedCost}\n\n${card.description}`
        );
      }
    });
  });

  $('#vacation-select-primary')?.addEventListener('click', () => submitLead('primary', commentary));
  $('#vacation-alt-economic')?.addEventListener('click', () => regenerateVariant('economic'));
  $('#vacation-alt-comfort')?.addEventListener('click', () => regenerateVariant('comfort'));
  $('#vacation-partner-cta')?.addEventListener('click', () => {
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
  renderResults();
  trackVacationEvent('vacation_option_selected', { variant: mode });
}

async function submitLead(source, commentary) {
  const full_name = $('#vacation-lead-name')?.value?.trim() || '';
  const phone = $('#vacation-lead-phone')?.value?.trim() || '';
  const email = $('#vacation-lead-email')?.value?.trim() || '';
  const selected = state.selected_option || state.results[0]?.id || '';

  const payload = {
    full_name,
    phone,
    email,
    vacation_goal: state.vacation_goal,
    budget_range: state.budget_range,
    people_type: state.people_type,
    vacation_type: state.vacation_type,
    date_range: state.date_range,
    duration: state.duration,
    user_note: state.user_note,
    selected_option: selected,
    decision_score: state.results[0]?.score || null,
    estimated_cost_range: state.results[0]?.estimatedCost || '',
    ai_summary: commentary.summary
  };

  const res = await saveVacationLead(payload);
  if (res.ok) {
    const msg = document.createElement('p');
    msg.className = 'vacation-toast';
    msg.textContent = 'Tercihiniz kaydedildi. Ekibimiz profilinize uygun seçenekleri paylaşabilir.';
    $('#vacation-final-cta')?.prepend(msg);
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
  document.getElementById('vacation-flow')?.scrollIntoView({ behavior: 'smooth' });
  state.stepIndex = 0;
  renderWizard();
}

async function init() {
  if (state.settings.vacation_enabled === 'false') {
    const main = document.querySelector('.vacation-main');
    if (main) {
      main.innerHTML =
        '<p class="vacation-disabled">Tatil Karar Asistanı geçici olarak kapalıdır. <a href="/">Ana sayfaya dönün</a>.</p>';
    }
    return;
  }

  const [settings, scenarios] = await Promise.all([loadVacationSettings(), loadActiveScenarios()]);
  if (settings) state.settings = { ...DEFAULT_SETTINGS, ...settings };
  if (scenarios.length) state.scenarios = scenarios;

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
