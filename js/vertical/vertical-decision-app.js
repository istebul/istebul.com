import { formatTry } from '../tatil/tatil-utils.js';

/**
 * Shared decision wizard + results UI (tatil.css class names).
 * @param {object} config
 */
export function initDecisionFlow(config) {
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

  function currentStep() {
    return config.steps[state.stepIndex];
  }

  function renderProgress() {
    const el = $('#vacation-step-progress');
    if (!el) return;
    el.innerHTML = config.steps
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
    const el = $('#vacation-ai-summary');
    if (!el || !config.getProgress) return;
    el.innerHTML = config
      .getProgress(state)
      .map(
        (row) => `
    <li class="${row.value ? 'is-set' : ''}">
      <span>${escapeHtml(row.key)}</span>
      <strong>${escapeHtml(row.value || 'Belirtilmedi')}</strong>
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

    $('#vacation-back')?.addEventListener('click', () => {
      if (state.stepIndex > 0) {
        state.stepIndex -= 1;
        renderWizard();
      }
    });

    $('#vacation-next')?.addEventListener('click', async () => {
      const step = currentStep();
      if (!config.canAdvance(state, step) && step?.id !== 'note') return;
      if (config.onStepComplete) await config.onStepComplete(state, step);
      state.stepIndex += 1;
      if (state.stepIndex >= config.steps.length) {
        await showResults();
      } else {
        renderWizard();
      }
    });
  }

  function refreshNext() {
    const next = $('#vacation-next');
    if (next) next.disabled = !config.canAdvance(state, currentStep());
  }

  function renderWizard() {
    const mount = $('#vacation-wizard');
    if (!mount) return;

    if (state.stepIndex >= config.steps.length) {
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
        ${state.stepIndex > 0 ? '<button type="button" class="btn btn-ghost" id="vacation-back">Geri</button>' : ''}
        <button type="button" class="btn btn-primary" id="vacation-next" ${config.canAdvance(state, step) ? '' : 'disabled'}>
          ${state.stepIndex === config.steps.length - 1 ? 'Sonuçları gör' : 'Devam et →'}
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
    $('#vacation-wizard') && ($('#vacation-wizard').hidden = true);
    renderResults();
    await config.tracker.trackResults({
      vertical: config.vertical,
      score: state.results[0]?.score
    });
  }

  function renderResults() {
    const section = $('#vacation-results');
    if (!section || !state.results.length) return;
    section.hidden = false;

    const commentary = config.buildCommentary(state, state.results);
    const summary = config.buildSummary(state, state.results);
    const primary = getDisplayResult();
    const selectedCard = getSelectedResult();

    section.innerHTML = `
    <div class="vacation-results-header">
      <h2>${escapeHtml(config.resultsTitle || 'Kişiselleştirilmiş öneriler')}</h2>
      <p>Tahmini skor ve maliyet aralıkları bilgilendirme amaçlıdır; kesin teklif taahhüdü değildir.</p>
    </div>
    <div class="vacation-results-summary">
      <article class="vacation-summary-card"><span>Karar skoru</span><strong>${escapeHtml(String(summary.fitScore))}<small>/100</small></strong></article>
      <article class="vacation-summary-card"><span>Toplam maliyet / yük</span><strong>${escapeHtml(summary.totalCostLabel)}</strong></article>
      <article class="vacation-summary-card"><span>Aylık yük</span><strong>${escapeHtml(formatTry(summary.monthlyLoad) || '—')}</strong></article>
      <article class="vacation-summary-card"><span>Risk seviyesi</span><strong>${escapeHtml(summary.seasonRisk)}</strong></article>
    </div>
    <p class="vacation-results-top-pick">Öne çıkan: <strong>${escapeHtml(summary.topTitle)}</strong></p>
    <section class="vacation-score-panel">
      <article><span>Finansman uyumu</span><strong>${escapeHtml(summary.familyFit || primary?.metrics?.financeFit || '—')}</strong></article>
      <article><span>Nakit baskısı</span><strong>${escapeHtml(primary?.metrics?.cashPressure || primary?.metrics?.riskLevel || '—')}</strong></article>
      <article><span>Profil</span><strong>${escapeHtml(primary?.audience || '—')}</strong></article>
      <article><span>Sonraki adım</span><strong>Seçim + iletişim</strong></article>
      <article><span>Uyarı</span><strong>Bilgilendirme</strong></article>
    </section>
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
            <li><strong>Tahmini:</strong> ${escapeHtml(r.estimatedCost)}</li>
            <li><strong>Uygunluk:</strong> ${escapeHtml(r.suitability)}</li>
          </ul>
          <div class="vacation-result-why"><strong>Neden önerildi?</strong><p>${escapeHtml(r.why)}</p></div>
          <div class="vacation-result-pros"><strong>Artılar</strong><ul>${r.pros.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>
          <div class="vacation-result-cautions"><strong>Dikkat</strong><ul>${r.cautions.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul></div>
          <button type="button" class="btn btn-sm vacation-select-card-btn ${isPicked ? 'btn-primary' : 'btn-outline'}" data-option="${escapeHtml(r.id)}">
            ${isPicked ? '✓ Seçildi' : 'Bu seçeneği seç'}
          </button>
        </article>`;
        })
        .join('')}
    </div>
    ${
      !state.confirmationStep
        ? `
    <div class="vacation-selection-bar" id="vacation-selection-bar">
      <div class="vacation-selection-copy">
        <p class="vacation-selection-hint ${selectedCard ? 'hidden' : ''}">Devam etmek için bir senaryo seçin.</p>
        <p class="vacation-selection-picked ${selectedCard ? '' : 'hidden'}">Seçiminiz: <strong>${selectedCard ? escapeHtml(selectedCard.title) : ''}</strong></p>
      </div>
      <button type="button" class="btn btn-primary" id="vacation-confirm-selection" ${selectedCard ? '' : 'disabled'}>Seçimi onayla ve devam et</button>
    </div>`
        : ''
    }
    <div class="vacation-ai-comment">
      <h3>Yapay zekâ karar yorumu</h3>
      <p class="vacation-ai-lead">${escapeHtml(commentary.summary)}</p>
      <ul>${commentary.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
      <p class="vacation-ai-caution">⚠ ${escapeHtml(commentary.caution)}</p>
    </div>
    ${
      state.confirmationStep && selectedCard
        ? `
    <div class="vacation-final-cta" id="vacation-final-cta">
      <button type="button" class="btn btn-ghost btn-sm vacation-change-selection" id="vacation-change-selection">← Seçimi değiştir</button>
      <div class="vacation-selected-recap">
        <span class="vacation-selected-recap-label">Onayladığınız senaryo</span>
        <h3>${escapeHtml(selectedCard.title)}</h3>
        <p>${escapeHtml(selectedCard.estimatedCost)} · Skor ${selectedCard.score}/100</p>
      </div>
      <h3 class="vacation-final-heading">İletişim (isteğe bağlı)</h3>
      <div class="vacation-lead-form">
        <div class="form-row">
          <input type="text" id="vacation-lead-name" placeholder="Ad soyad" autocomplete="name">
          <input type="tel" id="vacation-lead-phone" placeholder="Telefon" autocomplete="tel">
          <input type="email" id="vacation-lead-email" placeholder="E-posta" autocomplete="email">
        </div>
      </div>
      <button type="button" class="btn btn-primary btn-lg" id="vacation-select-primary">Talebi gönder</button>
      <p class="vacation-disclaimer">${escapeHtml(config.disclaimer)}</p>
    </div>`
        : ''
    }`;

    bindResultsEvents(commentary);
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
    $('#vacation-confirm-selection')?.addEventListener('click', async () => {
      if (!state.selected_option) return;
      state.confirmationStep = true;
      await config.tracker.trackConfirm(state.selected_option);
      renderResults();
      $('#vacation-final-cta')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('#vacation-change-selection')?.addEventListener('click', () => {
      state.confirmationStep = false;
      renderResults();
    });
    $('#vacation-select-primary')?.addEventListener('click', () => submitLead(commentary));
  }

  async function submitLead(commentary) {
    if (!state.confirmationStep || !state.selected_option) {
      $('#vacation-selection-bar')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const selected = getSelectedResult();
    const payload = {
      full_name: $('#vacation-lead-name')?.value?.trim() || '',
      phone: $('#vacation-lead-phone')?.value?.trim() || '',
      email: $('#vacation-lead-email')?.value?.trim() || '',
      profile: { ...state },
      selected_option: state.selected_option,
      decision_score: selected?.score ?? null,
      result_summary: selected?.title || '',
      ai_summary: commentary.summary
    };
    const res = await config.tracker.saveLead(payload);
    if (res.ok) {
      const msg = document.createElement('p');
      msg.className = 'vacation-toast';
      msg.textContent = 'Tercihiniz kaydedildi. Ekibimiz profilinize uygun bilgilendirme yapabilir.';
      $('#vacation-final-cta')?.prepend(msg);
    }
  }

  function setupMobileNav() {
    const toggle = $('.vacation-nav-toggle');
    const nav = $('#vacation-nav');
    toggle?.addEventListener('click', () => {
      const open = nav?.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  async function init() {
    document.body.classList.add(config.themeClass || '');
    setupMobileNav();
    $('#vacation-hero-cta')?.addEventListener('click', () => {
      document.getElementById('vacation-flow')?.scrollIntoView({ behavior: 'smooth' });
      state.stepIndex = 0;
      renderWizard();
    });
    $('#vacation-hero-cta-secondary')?.addEventListener('click', () => {
      document.getElementById('vacation-flow')?.scrollIntoView({ behavior: 'smooth' });
    });
    await config.tracker.trackStart();
    renderWizard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}
