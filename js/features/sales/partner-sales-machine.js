/**
 * P6 — B2B sales machine orchestrator (admin + partner enablement).
 */
import { renderObjectionPlaybookHtml } from './partner-objections.js';
import { renderOutboundSequenceHtml } from './partner-sales-assets.js';
import {
  logPartnerSalesTouch,
  logPartnerCrmStageChange,
  logOutboundSent,
  recommendNextSalesAction,
  scorePartnerApplication,
  SALES_TOUCH_TYPES,
  computePartnerPipelineForecast
} from './partner-sales-crm.js';
import { getPricingTalkTrack, recommendPartnerTier } from './partner-pricing-strategy.js';
import { computeOnboardingVelocity, velocityBadgeClass } from './partner-onboarding-velocity.js';
import { escapeHtml } from '../../core/dom-safe.js';
import {
  renderClosingKitSummaryHtml,
  renderFollowUpFlowsHtml
} from './partner-closing-machine.js';

let frameworkCache = null;

async function loadSalesFramework() {
  if (frameworkCache) return frameworkCache;
  try {
    const res = await fetch('/data/sales/sales-machine.json');
    frameworkCache = res.ok ? await res.json() : {};
  } catch {
    frameworkCache = {};
  }
  return frameworkCache;
}

/**
 * Admin: sales enablement panel above partner applications.
 */
export async function renderPartnerSalesEnablementPanel() {
  const framework = await loadSalesFramework();
  const objections = await renderObjectionPlaybookHtml({ compact: true });
  const outbound = await renderOutboundSequenceHtml('partner_cold_outbound', {
    company_name: 'Örnek Otomotiv',
    contact_name: 'Ayşe',
    billing_plan: 'growth'
  });

  const pipeline = (framework.partnerAePipeline || [])
    .map(
      (s) =>
        `<li><strong>${escapeHtml(s.label)}</strong> — ${escapeHtml(s.nextAction || '')} ${s.slaHours ? `<em>SLA ${s.slaHours}sa</em>` : ''}</li>`
    )
    .join('');

  const closingSummary = await renderClosingKitSummaryHtml();
  const followUps = await renderFollowUpFlowsHtml();

  return `
    <section class="ib-sales-enablement card" aria-labelledby="sales-enablement-heading">
      <h3 id="sales-enablement-heading">B2B satış makinesi (P6.2 CRM)</h3>
      <p class="text-muted">Outbound, itiraz, AE pipeline — tam closing kiti ayrı sayfada.</p>
      ${closingSummary}
      <div class="ib-sales-enablement-grid">
        <div>
          <h4>AE pipeline</h4>
          <ol class="ib-sales-pipeline-list">${pipeline}</ol>
        </div>
        <div>
          <h4>Cold outbound</h4>
          ${outbound}
        </div>
      </div>
      <h4 style="margin-top:1.25rem">Takip akışları (özet)</h4>
      <div class="ib-closing-flows-compact">${followUps}</div>
      <h4 style="margin-top:1.25rem">İtiraz playbook</h4>
      ${objections}
    </section>`;
}

export {
  renderObjectionPlaybookHtml,
  renderOutboundSequenceHtml,
  logPartnerSalesTouch,
  logPartnerCrmStageChange,
  logOutboundSent,
  recommendNextSalesAction,
  scorePartnerApplication,
  SALES_TOUCH_TYPES,
  computePartnerPipelineForecast,
  getPricingTalkTrack,
  recommendPartnerTier,
  computeOnboardingVelocity,
  velocityBadgeClass
};
export { renderPartnerPipelineBoardHtml } from './partner-crm-pipeline.js';

export async function initPartnerSalesMachineAdmin() {
  if (typeof document === 'undefined') return;
  const host = document.getElementById('partner-sales-enablement-root');
  if (!host) return;
  host.innerHTML = await renderPartnerSalesEnablementPanel();
  bindSalesCopyHandlers(host);
}

function bindSalesCopyHandlers(root) {
  root.addEventListener('click', async (event) => {
    const objBtn = event.target.closest('[data-sales-copy-objection]');
    const outBtn = event.target.closest('[data-sales-copy-outbound]');

    if (objBtn) {
      const { getObjectionById, formatObjectionCopy } = await import('./partner-objections.js');
      const item = await getObjectionById(objBtn.dataset.salesCopyObjection);
      const text = formatObjectionCopy(item);
      if (text) await copyToClipboard(text);
      return;
    }

    if (outBtn) {
      const [seqId, stepId] = (outBtn.dataset.salesCopyOutbound || '').split(':');
      const { getOutboundStep, buildOutboundVarsForApplication } = await import('./partner-sales-assets.js');
      const rendered = await getOutboundStep(seqId, stepId, buildOutboundVarsForApplication({}));
      const text = [rendered?.subject, rendered?.body].filter(Boolean).join('\n\n');
      if (text) await copyToClipboard(text);
    }
  });
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}
