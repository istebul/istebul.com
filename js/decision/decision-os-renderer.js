/**
 * Decision OS v2 — premium decision-first UI renderer.
 */
import { escapeHtml } from '../core/security.js';
import { renderTurkeyBenchmarkHtml } from './decision-os-benchmark.js';
import { renderShareCardHtml } from './decision-os-share.js';
import { renderDecisionTimelineHtml } from './decision-os-timeline.js';

function esc(value) {
  return escapeHtml(String(value ?? ''));
}

function formatCost(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `≈ ₺${Math.round(n).toLocaleString('tr-TR')}`;
}

function renderAccordion(id, title, content, options = {}) {
  const open = options.open ? ' open' : '';
  return `
    <details class="dos-accordion" data-dos-accordion="${esc(id)}"${open}>
      <summary class="dos-accordion__summary">
        <span class="dos-accordion__title">${esc(title)}</span>
        <span class="dos-accordion__chevron" aria-hidden="true"></span>
      </summary>
      <div class="dos-accordion__body">
        ${content}
      </div>
    </details>`;
}

function renderHero(model) {
  const v = model.verdict;
  const topReasons = (model.whyReasons || []).slice(0, 3);

  return `
    <section class="dos-hero" data-dos-hero aria-label="AI son kararı">
      <p class="dos-hero__kicker">AI SON KARARI</p>
      <div class="dos-hero__verdict" style="--dos-verdict-color: ${esc(v.color)}">
        <span class="dos-hero__emoji" aria-hidden="true">${esc(v.emoji)}</span>
        <span class="dos-hero__label">${esc(v.label)}</span>
      </div>
      <div class="dos-hero__metrics">
        <div class="dos-hero__metric">
          <span>Karar Güveni</span>
          <strong>${esc(String(model.confidencePercent))}%</strong>
        </div>
        <div class="dos-hero__metric">
          <span>Karar Skoru</span>
          <strong>${esc(String(model.decisionScore))}<small>/100</small></strong>
        </div>
      </div>
      <div class="dos-hero__divider" aria-hidden="true"></div>
      <div class="dos-hero__section dos-hero__section--reasons">
        <h3>En önemli 3 neden</h3>
        <ul class="dos-list dos-list--check">
          ${topReasons.map((r) => `<li>${esc(r)}</li>`).join('')}
        </ul>
      </div>
      <button type="button" class="dos-hero__expand" data-dos-expand-all>
        Detaylı Analizi Aç
      </button>
    </section>`;
}

function renderStickyCard(model) {
  const v = model.verdict;
  return `
    <aside class="dos-sticky" data-dos-sticky aria-label="Sabit karar çubuğu">
      <div class="dos-sticky__inner" style="--dos-verdict-color: ${esc(v.color)}">
        <div class="dos-sticky__verdict">
          <span aria-hidden="true">${esc(v.emoji)}</span>
          <strong>${esc(v.label)}</strong>
        </div>
        <div class="dos-sticky__stats">
          <div>
            <span>Skor</span>
            <strong>${esc(String(model.decisionScore))}</strong>
          </div>
          <div>
            <span>Güven</span>
            <strong>${esc(String(model.confidencePercent))}%</strong>
          </div>
        </div>
        <button type="button" class="dos-sticky__cta" data-dos-scroll-details>
          Detay
        </button>
      </div>
    </aside>`;
}

function renderSavingsCard(model) {
  const amount = model.todaySavings ?? model.savings?.todayAmount ?? model.savings?.amount;
  if (!amount) return '';

  return `
    <section class="dos-savings" data-dos-savings>
      <p class="dos-savings__lead">Bugünkü kararın sana yaklaşık</p>
      <p class="dos-savings__amount">${formatCost(amount)}</p>
      <p class="dos-savings__suffix">tasarruf sağlayabilir.</p>
      <button type="button" class="dos-savings__link" data-dos-savings-how>
        Nasıl hesaplandı?
      </button>
      <p class="dos-savings__explain" data-dos-savings-explain hidden>
        Tahmini tasarruf, toplam maliyet ve karar skorunuzdaki optimizasyon potansiyeline göre
        yıllık bazda hesaplanmıştır. Kesin garanti değildir.
      </p>
    </section>`;
}

function renderCrossDecision(model) {
  const cross = model.crossDecision || {};
  return `
    <section class="dos-cross" data-dos-cross>
      <p class="dos-cross__kicker">AI Gelecek Önerisi</p>
      <p class="dos-cross__text">
        <strong>${esc(cross.from || '')}</strong>tan önce
        <strong>${esc(cross.to || '')}</strong>
        ${esc(cross.message || '')}
      </p>
      <span class="dos-cross__beta">Beta</span>
    </section>`;
}

function renderProfileSection(model) {
  const profile = model.profile || {};
  const cards = profile.cards || [];
  const benchmarkHtml = model.turkeyBenchmark
    ? renderTurkeyBenchmarkHtml(model.turkeyBenchmark, esc)
    : '';

  return `
    <div class="dos-profile">
      <p class="dos-profile__title">Sizin Karar Karakteriniz</p>
      <div class="dos-profile__cards">
        ${cards
          .map(
            (card) => `
          <article class="dos-profile__card">
            <span class="dos-profile__icon" aria-hidden="true">${esc(card.icon)}</span>
            <span>${esc(card.label)}</span>
          </article>`
          )
          .join('')}
      </div>
      <div class="dos-profile__ai">
        <strong>AI yorumu:</strong>
        <p>"${esc(profile.aiComment || '')}"</p>
      </div>
      ${benchmarkHtml ? `<div class="dos-profile__benchmark">${benchmarkHtml}</div>` : ''}
    </div>`;
}

function renderAlternatives(model) {
  const alts = model.alternatives || [];
  if (!alts.length) {
    return '<p class="dos-muted">Alternatif seçenek bulunamadı.</p>';
  }
  return `
    <div class="dos-alts">
      ${alts
        .map(
          (alt) => `
        <article class="dos-alt-card">
          <span class="dos-alt-card__badge">${esc(alt.badge)}</span>
          <h4>${esc(alt.title)}</h4>
          <p class="dos-alt-card__score">Skor: <strong>${esc(String(alt.score))}/100</strong></p>
          ${alt.summary ? `<p class="dos-alt-card__summary">${esc(alt.summary)}</p>` : ''}
        </article>`
        )
        .join('')}
    </div>`;
}

function renderAiCommentary(model) {
  const ai = model.aiCommentary || {};
  const paragraphs = Array.isArray(ai.paragraphs) ? ai.paragraphs : [];

  if (paragraphs.length) {
    return `
      <div class="dos-ai-voice">
        ${paragraphs.map((p) => `<p class="dos-ai-voice__para">${esc(p)}</p>`).join('')}
      </div>`;
  }

  return `
    <div class="dos-ai-voice">
      <p class="dos-ai-voice__lead">"${esc(ai.preferLead || '')}"</p>
      <div class="dos-ai-voice__block">
        <strong>Sebepler</strong>
        <ul>${(ai.preferReasons || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      </div>
      ${ai.waitLead ? `<p class="dos-ai-voice__wait">${esc(ai.waitLead)}</p>` : ''}
      <ul class="dos-ai-voice__wait-list">
        ${(ai.waitReasons || []).map((r) => `<li>${esc(r)}</li>`).join('')}
      </ul>
    </div>`;
}

function renderWhatIf(model) {
  if (model.whatIfInput && typeof model.whatIfInput === 'object') {
    return `
      <div class="dos-whatif" data-dos-whatif>
        <div class="dos-whatif__controls">
          <label class="dos-slider">
            <span>Bütçe değişimi <strong data-dos-whatif-budget-label>0%</strong></span>
            <input type="range" min="-20" max="20" step="1" value="0" data-dos-whatif-budget aria-label="Bütçe değişimi">
          </label>
          <label class="dos-slider">
            <span>Peşinat değişimi <strong data-dos-whatif-down-label>0%</strong></span>
            <input type="range" min="0" max="30" step="1" value="0" data-dos-whatif-down aria-label="Peşinat değişimi">
          </label>
          <label class="dos-slider">
            <span>Vade <strong data-dos-whatif-term-label>36 ay</strong></span>
            <input type="range" min="12" max="60" step="6" value="36" data-dos-whatif-term aria-label="Vade">
          </label>
          <label class="dos-select">
            <span>Risk toleransı</span>
            <select data-dos-whatif-risk aria-label="Risk toleransı">
              <option value="düşük">Düşük</option>
              <option value="orta" selected>Orta</option>
              <option value="yüksek">Yüksek</option>
            </select>
          </label>
        </div>
        <div class="dos-whatif__results" data-dos-whatif-results>
          <article class="dos-whatif__metric" data-dos-whatif-decision>
            <span>Karar</span>
            <strong>—</strong>
          </article>
          <article class="dos-whatif__metric" data-dos-whatif-risk>
            <span>Risk</span>
            <strong>—</strong>
          </article>
          <article class="dos-whatif__metric" data-dos-whatif-cost>
            <span>Toplam maliyet</span>
            <strong>—</strong>
          </article>
        </div>
      </div>`;
  }

  const scenarios = Array.isArray(model.whatIfScenarios) ? model.whatIfScenarios : [];
  if (!scenarios.length) return '<p class="dos-muted">What-if senaryosu mevcut değil.</p>';
  return `<ul class="dos-list">${scenarios.map((s) => `<li><strong>${esc(s.title)}</strong> — ${esc(s.description)}</li>`).join('')}</ul>`;
}

function renderRiskSection(risks = []) {
  if (!risks.length) return '<p class="dos-muted">Risk verisi mevcut değil.</p>';
  return `
    <ul class="dos-list dos-list--warn">
      ${risks.map((r) => `<li>${esc(r)}</li>`).join('')}
    </ul>`;
}

function renderRiskRadar(risks) {
  if (!risks.length) return '<p class="dos-muted">Risk verisi mevcut değil.</p>';
  return `
    <ul class="dos-risk-radar">
      ${risks
        .map(
          (risk) => `
        <li class="dos-risk-radar__item dos-risk-radar__item--${esc((risk.level || 'orta').toLowerCase())}">
          <strong>${esc(risk.label || risk.key || 'Risk')}</strong>
          <span>${esc(risk.level || 'orta')}</span>
          <p>${esc(risk.detail || risk.reason || '')}</p>
        </li>`
        )
        .join('')}
    </ul>`;
}

function renderMemorySection(model) {
  const memory = model.memory;
  if (!memory || memory.version !== 'memory-lite-v1') {
    return '<p class="dos-muted">Henüz yeterli karar geçmişi yok. Birkaç analiz sonrası profiliniz oluşacak.</p>';
  }

  const insights = Array.isArray(memory.insights) ? memory.insights : [];
  const trend = memory.trend?.explanation || '';

  return `
    <div class="dos-memory">
      ${trend ? `<p class="dos-memory__trend">${esc(trend)}</p>` : ''}
      ${insights.length ? `<ul class="dos-list">${insights.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
    </div>`;
}

function renderExecutiveSection(model) {
  const summary = model.executiveSummary || model.decisionQuality?.summary || '';
  if (!summary) return '<p class="dos-muted">Executive özet henüz hazır değil.</p>';
  return `<p class="dos-executive">${esc(summary)}</p>`;
}

function renderCostSection(model) {
  const cost = model.costSummary || {};
  return `
    <div class="dos-cost">
      <p class="dos-cost__total">${esc(cost.formatted || '—')}</p>
      <p class="dos-cost__summary">${esc(cost.summary || '')}</p>
    </div>`;
}

function renderProInsights(model) {
  const items = Array.isArray(model.proInsights) ? model.proInsights : [];
  return `
    <div class="dos-pro" data-dos-pro>
      ${items
        .map(
          (item) => `
        <article class="dos-pro__item dos-pro__item--locked" data-dos-pro-item="${esc(item.id)}">
          <span class="dos-pro__lock" aria-hidden="true">🔒</span>
          <span class="dos-pro__label">${esc(item.label)}</span>
          <span class="dos-pro__badge">Pro</span>
        </article>`
        )
        .join('')}
      <p class="dos-pro__hint">Pro üyelikle detaylı senaryo analizlerine erişebilirsiniz.</p>
    </div>`;
}

function renderScoreTransparency(factors) {
  if (!factors.length) return '<p class="dos-muted">Skor faktörleri mevcut değil.</p>';
  return `
    <ul class="dos-factors">
      ${factors
        .map(
          (f) => `
        <li>
          <strong>${esc(f.label)}</strong>
          <span class="dos-factors__impact">${esc(f.impact || '')}</span>
          <p>${esc(f.reason || '')}</p>
        </li>`
        )
        .join('')}
    </ul>`;
}

function renderReportSection() {
  return `
    <div class="dos-report" data-dos-report>
      <div class="dos-report__preview" data-dos-report-preview>
        <p class="dos-report__brand">isteBul Karar Raporu</p>
        <p class="dos-report__hint">Premium PDF görünümüne benzer özet rapor</p>
      </div>
      <div class="dos-report__actions">
        <button type="button" class="dos-btn dos-btn--primary" data-dos-report-download>
          İndir
        </button>
        <button type="button" class="dos-btn dos-btn--secondary" data-dos-report-copy>
          Kopyala
        </button>
      </div>
      <p class="dos-report__feedback" data-dos-report-feedback hidden aria-live="polite"></p>
    </div>`;
}

function renderTimelineSection(model) {
  const entries = Array.isArray(model.timeline) ? model.timeline : [];
  return `
    <section class="dos-timeline-section" data-dos-timeline>
      <h3 class="dos-timeline-section__title">Karar Geçmişim</h3>
      ${renderDecisionTimelineHtml(entries, esc)}
    </section>`;
}

/**
 * @param {object} model
 * @returns {string}
 */
export function renderDecisionOsPanel(model = {}) {
  const accordions = [
    renderAccordion('why', 'Neden önerildi', `
      <ul class="dos-list dos-list--check">
        ${(model.whyReasons || []).map((r) => `<li>${esc(r)}</li>`).join('')}
      </ul>`),
    renderAccordion('risks', 'Riskler', renderRiskSection(model.risks)),
    renderAccordion('cost', 'Maliyet', renderCostSection(model)),
    renderAccordion('ai', 'AI açıklaması', renderAiCommentary(model)),
    renderAccordion('alternatives', 'Alternatifler', renderAlternatives(model)),
    renderAccordion('memory', 'Memory', renderMemorySection(model)),
    renderAccordion('what-if', 'What-if', renderWhatIf(model)),
    renderAccordion('executive', 'Executive', renderExecutiveSection(model)),
    renderAccordion('report', 'Rapor', renderReportSection()),
    renderAccordion('risk-radar', 'Risk Radar', renderRiskRadar(model.riskRadar || [])),
    renderAccordion('profile', 'Karar Profili', renderProfileSection(model)),
    renderAccordion('score-transparency', 'Skor Şeffaflığı', renderScoreTransparency(model.scoreFactors || [])),
    renderAccordion('pro-insights', 'Pro Insights', renderProInsights(model))
  ].join('');

  return `
    <div class="dos-root" data-decision-os-root data-vertical="${esc(model.vertical)}" data-dos-phase="hero">
      <div class="dos-layout">
        <div class="dos-main">
          ${renderHero(model)}
          ${renderSavingsCard(model)}
          ${renderShareCardHtml(model)}
          ${renderTimelineSection(model)}
          ${renderCrossDecision(model)}
          <div class="dos-accordions" data-dos-accordions hidden>
            ${accordions}
          </div>
          <div class="dos-legacy-slot" data-dos-legacy hidden></div>
        </div>
        ${renderStickyCard(model)}
      </div>
    </div>`;
}

export function ensureDecisionOsStyles() {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return;

  const existing = document.querySelector('link[data-decision-os-styles]');
  if (existing) return;
  if (typeof document.createElement !== 'function') return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/css/decision-os.css';
  link.setAttribute('data-decision-os-styles', '1');
  document.head?.appendChild(link);
}
