/**
 * P6.1 — Partner closing machine (deck, pricing, docs, emails, flows).
 */
import { escapeHtml } from '../../core/dom-safe.js';
import { interpolateOutboundTemplate, buildOutboundVarsForApplication } from './partner-sales-assets.js';
import { renderObjectionPlaybookHtml, getObjectionById, formatObjectionCopy } from './partner-objections.js';
import { buildOfferApplicationUrl, buildQuoteRequestUrl } from '../partner/partner-offers.js';

const cache = {};

async function loadJson(path) {
  if (cache[path]) return cache[path];
  try {
    const res = await fetch(path);
    cache[path] = res.ok ? await res.json() : {};
  } catch {
    cache[path] = {};
  }
  return cache[path];
}

export async function loadClosingMachine() {
  return loadJson('/data/sales/closing-machine.json');
}

export async function renderSalesDeckHtml(options = {}) {
  const deck = await loadJson('/data/sales/partner-sales-deck.json');
  const slides = deck.slides || [];

  return `
    <div class="ib-closing-deck" role="region" aria-label="Satış destesi">
      <header class="ib-closing-deck-header">
        <h2>${escapeHtml(deck.title || 'Satış destesi')}</h2>
        <p>${escapeHtml(deck.subtitle || '')}</p>
      </header>
      <ol class="ib-closing-deck-slides">
        ${slides
          .map(
            (s, i) => `
          <li class="ib-closing-slide" data-slide-id="${escapeHtml(s.id)}">
            <span class="ib-closing-slide-num">${i + 1}</span>
            <h3>${escapeHtml(s.headline)}</h3>
            <ul>${(s.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
            ${options.showNotes && s.speakerNote ? `<p class="ib-closing-speaker-note"><em>${escapeHtml(s.speakerNote)}</em></p>` : ''}
            <button type="button" class="btn btn-ghost btn-sm" data-closing-copy-slide="${escapeHtml(s.id)}">Slayt kopyala</button>
          </li>`
          )
          .join('')}
      </ol>
    </div>`;
}

export async function renderPricingSheetHtml(origin) {
  const sheet = await loadJson('/data/sales/pricing-sheet.json');
  const base = origin || 'https://www.istebul.com';

  const tierCards = (sheet.tiers || [])
    .map(
      (t) => `
    <article class="ib-pricing-sheet-tier">
      <h3>${escapeHtml(t.name)}</h3>
      <p class="ib-pricing-sheet-price">${escapeHtml(t.priceDisplay)}</p>
      <p class="text-muted">${escapeHtml(t.billing)}</p>
      <ul>${(t.includes || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
      <p><strong>İdeal:</strong> ${escapeHtml(t.idealFor)}</p>
      <a class="btn btn-sm secondary" href="${escapeHtml(buildQuoteRequestUrl(t.id === 'pilot' ? 'starter' : t.id, base))}">Teklif iste</a>
    </article>`
    )
    .join('');

  const rows = (sheet.comparisonRows || [])
    .map((r) => {
      const cells = ['pilot', 'starter', 'growth', 'enterprise']
        .map((k) => `<td>${escapeHtml(String(r[k] ?? '—'))}</td>`)
        .join('');
      return `<tr><th scope="row">${escapeHtml(r.label)}</th>${cells}</tr>`;
    })
    .join('');

  return `
    <div class="ib-pricing-sheet">
      <p class="ib-pricing-disclaimer">${escapeHtml(sheet.disclaimer || '')}</p>
      <div class="ib-pricing-sheet-grid">${tierCards}</div>
      <table class="table ib-pricing-sheet-table">
        <thead><tr><th></th><th>Pilot</th><th>Starter</th><th>Growth</th><th>Enterprise</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${sheet.talkTrack ? `
        <aside class="ib-pricing-talktrack">
          <p><strong>Anchor:</strong> ${escapeHtml(sheet.talkTrack.anchor)}</p>
          <p><strong>İndirim:</strong> ${escapeHtml(sheet.talkTrack.discountPolicy)}</p>
          <p><strong>Kapanış:</strong> ${escapeHtml(sheet.talkTrack.close)}</p>
        </aside>` : ''}
    </div>`;
}

export async function renderOnboardingDocsHtml(ctx = {}) {
  const pack = await loadJson('/data/sales/onboarding-docs.json');
  const vars = buildOutboundVarsForApplication(ctx);
  const origin = ctx.origin || 'https://www.istebul.com';

  const docs = (pack.docs || [])
    .map((doc) => {
      const sections = (doc.sections || [])
        .map((sec) => {
          const body = interpolateOutboundTemplate(sec.body, {
            ...vars,
            docs_link: `${origin}/partner-docs.html`,
            onboarding_link: vars.onboarding_link
          });
          return `<h4>${escapeHtml(sec.heading)}</h4><p>${escapeHtml(body)}</p>`;
        })
        .join('');
      return `
        <article class="ib-onboarding-doc">
          <h3>${escapeHtml(doc.title)} <span class="ib-sales-tag">${escapeHtml(doc.audience)}</span></h3>
          ${sections}
          <button type="button" class="btn btn-ghost btn-sm" data-closing-copy-doc="${escapeHtml(doc.id)}">Paket kopyala</button>
        </article>`;
    })
    .join('');

  const links = (pack.quickLinks || [])
    .map((l) => `<li><a href="${escapeHtml(l.path)}">${escapeHtml(l.label)}</a></li>`)
    .join('');

  return `
    <div class="ib-onboarding-docs-pack">
      <h2>${escapeHtml(pack.title || 'Onboarding')}</h2>
      <ul class="ib-onboarding-quicklinks">${links}</ul>
      ${docs}
    </div>`;
}

export async function renderEmailTemplatesHtml(ctx = {}) {
  const data = await loadJson('/data/sales/email-templates.json');
  const vars = {
    ...buildOutboundVarsForApplication(ctx),
    closing_kit_link: `${ctx.origin || 'https://www.istebul.com'}/partner-closing-kit.html`,
    pricing_link: `${ctx.origin || 'https://www.istebul.com'}/partner-planlar.html`,
    price_band: ctx.price_band || 'Growth referans bandı',
    demo_date: ctx.demo_date || 'TBD',
    objection_summary: ctx.objection_summary || '',
    objection_response: ctx.objection_response || '',
    close_line: ctx.close_line || 'Pilot ile başlayalım.'
  };

  return (data.templates || [])
    .map((t) => {
      const merged = { ...(data.defaults || {}), ...vars };
      const subject = interpolateOutboundTemplate(t.subject || '', merged);
      const body = interpolateOutboundTemplate(t.body || '', merged);
      return `
        <details class="ib-email-template" data-template-id="${escapeHtml(t.id)}" data-stage="${escapeHtml(t.stage)}">
          <summary>${escapeHtml(t.id)} · ${escapeHtml(t.stage)}</summary>
          <p><strong>Konu:</strong> ${escapeHtml(subject)}</p>
          <pre class="ib-sales-outbound-body">${escapeHtml(body)}</pre>
          <button type="button" class="btn btn-ghost btn-sm" data-closing-copy-email="${escapeHtml(t.id)}">E-posta kopyala</button>
        </details>`;
    })
    .join('');
}

export async function renderFollowUpFlowsHtml() {
  const data = await loadJson('/data/sales/follow-up-flows.json');

  return (data.flows || [])
    .map(
      (flow) => `
      <article class="ib-followup-flow" data-flow-id="${escapeHtml(flow.id)}">
        <h3>${escapeHtml(flow.name)}</h3>
        <p class="text-muted">Tetik: ${escapeHtml(JSON.stringify(flow.trigger || {}))}</p>
        <ol>
          ${(flow.steps || [])
            .map(
              (step) => `
            <li>
              <strong>Gün +${step.day}</strong> · ${escapeHtml(step.action)}
              ${step.templateId ? ` · şablon <code>${escapeHtml(step.templateId)}</code>` : ''}
              ${step.sequenceId ? ` · seq ${escapeHtml(step.sequenceId)}` : ''}
              ${step.note ? ` — ${escapeHtml(step.note)}` : ''}
            </li>`
            )
            .join('')}
        </ol>
        ${flow.lifecycleFlow ? `<p>Lifecycle: <code>${escapeHtml(flow.lifecycleFlow)}</code></p>` : ''}
      </article>`
    )
    .join('');
}

/**
 * Full closing kit page body.
 */
export async function renderClosingKitPage(ctx = {}) {
  const machine = await loadClosingMachine();
  const origin = ctx.origin || (typeof window !== 'undefined' ? window.location.origin : 'https://www.istebul.com');

  const [deck, pricing, objections, onboarding, emails, flows] = await Promise.all([
    renderSalesDeckHtml({ showNotes: true }),
    renderPricingSheetHtml(origin),
    renderObjectionPlaybookHtml({ compact: false }),
    renderOnboardingDocsHtml({ ...ctx, origin }),
    renderEmailTemplatesHtml({ ...ctx, origin }),
    renderFollowUpFlowsHtml()
  ]);

  return `
    <div class="ib-closing-kit" data-version="${escapeHtml(machine.version || 'p6.1')}">
      <p class="kicker">P6.1 · Closing machine</p>
      <h1>Partner satış kiti</h1>
      <p class="lead">Deck, fiyat sayfası, itirazlar, onboarding paketi, e-posta şablonları ve takip akışları — tek ekranda kopyala-yapıştır.</p>

      <nav class="ib-closing-nav" aria-label="Kiti bölümleri">
        <a href="#closing-deck">Deste</a>
        <a href="#closing-pricing">Fiyat</a>
        <a href="#closing-objections">İtiraz</a>
        <a href="#closing-onboarding">Onboarding</a>
        <a href="#closing-emails">E-posta</a>
        <a href="#closing-flows">Takip</a>
      </nav>

      <section id="closing-deck" class="ib-closing-section">${deck}</section>
      <section id="closing-pricing" class="ib-closing-section">${pricing}</section>
      <section id="closing-objections" class="ib-closing-section"><h2 class="section-title">İtiraz yönetimi</h2>${objections}</section>
      <section id="closing-onboarding" class="ib-closing-section">${onboarding}</section>
      <section id="closing-emails" class="ib-closing-section"><h2 class="section-title">E-posta şablonları</h2>${emails}</section>
      <section id="closing-flows" class="ib-closing-section"><h2 class="section-title">Takip akışları</h2>${flows}</section>
    </div>`;
}

export async function getEmailTemplateById(templateId, ctx = {}) {
  const data = await loadJson('/data/sales/email-templates.json');
  const t = (data.templates || []).find((x) => x.id === templateId);
  if (!t) return null;
  const merged = {
    ...(data.defaults || {}),
    ...buildOutboundVarsForApplication(ctx),
    closing_kit_link: `${ctx.origin || 'https://www.istebul.com'}/partner-closing-kit.html`,
    pricing_link: `${ctx.origin || 'https://www.istebul.com'}/partner-planlar.html`
  };
  return {
    subject: interpolateOutboundTemplate(t.subject || '', merged),
    body: interpolateOutboundTemplate(t.body || '', merged),
    stage: t.stage
  };
}

export async function getFollowUpFlowForStatus(status, velocityHealth) {
  const data = await loadJson('/data/sales/follow-up-flows.json');
  return (data.flows || []).find((f) => {
    const t = f.trigger || {};
    if (t.applicationStatus && t.applicationStatus !== status) return false;
    if (t.velocityHealth && velocityHealth && !t.velocityHealth.includes(velocityHealth)) return false;
    return true;
  });
}

export async function renderClosingKitSummaryHtml() {
  const machine = await loadClosingMachine();
  const assets = machine.assets || {};
  return `
    <div class="ib-closing-admin-cta">
      <a class="btn btn-primary btn-sm" href="/partner-closing-kit.html" target="_blank" rel="noopener">Tam closing kiti aç</a>
      <span class="text-muted" style="margin-left:0.5rem">Deck · Fiyat · İtiraz · Onboarding · E-posta · Takip (${escapeHtml(machine.version || 'p6.1')})</span>
      <ul class="text-muted-sm" style="margin:0.5rem 0 0;padding-left:1.25rem;font-size:0.8rem">
        ${Object.entries(assets).map(([k, v]) => `<li>${escapeHtml(k)} → ${escapeHtml(v)}</li>`).join('')}
      </ul>
    </div>`;
}

export async function initClosingKitPage() {
  if (typeof document === 'undefined') return;
  const root = document.getElementById('partner-closing-kit-root');
  if (!root) return;

  root.innerHTML = await renderClosingKitPage({ origin: window.location.origin });
  bindClosingCopyHandlers(root);
}

async function bindClosingCopyHandlers(root) {
  const deck = await loadJson('/data/sales/partner-sales-deck.json');

  root.addEventListener('click', async (event) => {
    const slideBtn = event.target.closest('[data-closing-copy-slide]');
    const emailBtn = event.target.closest('[data-closing-copy-email]');
    const docBtn = event.target.closest('[data-closing-copy-doc]');
    const objBtn = event.target.closest('[data-sales-copy-objection]');

    if (slideBtn) {
      const slide = (deck.slides || []).find((s) => s.id === slideBtn.dataset.closingCopySlide);
      const text = slide
        ? `${slide.headline}\n\n${(slide.bullets || []).map((b) => `• ${b}`).join('\n')}\n\n${slide.speakerNote || ''}`
        : '';
      await copyText(text);
      return;
    }

    if (emailBtn) {
      const tpl = await getEmailTemplateById(emailBtn.dataset.closingCopyEmail, {
        origin: window.location.origin
      });
      if (tpl) await copyText(`${tpl.subject}\n\n${tpl.body}`);
      return;
    }

    if (docBtn) {
      const pack = await loadJson('/data/sales/onboarding-docs.json');
      const doc = (pack.docs || []).find((d) => d.id === docBtn.dataset.closingCopyDoc);
      if (doc) {
        const text = (doc.sections || []).map((s) => `${s.heading}\n${s.body}`).join('\n\n');
        await copyText(`${doc.title}\n\n${text}`);
      }
      return;
    }

    if (objBtn) {
      const item = await getObjectionById(objBtn.dataset.salesCopyObjection);
      await copyText(formatObjectionCopy(item));
    }
  });
}

async function copyText(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}
