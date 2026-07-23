import { renderMetricGrid } from '../shared/cards.js';
import { renderNotice, renderPageHeader } from '../shared/shell.js';
import { loadDashboardMetrics } from './metrics.js';

/**
 * @typedef {import('../shared/context.js').AdminPanelContext} AdminPanelContext
 */

/**
 * @param {AdminPanelContext} context
 * @returns {Promise<string>}
 */
export async function renderDashboardPage(context) {
  const metrics = await loadDashboardMetrics(context);

  return `
    ${renderPageHeader({
      title: context.restaurantName,
      subtitle: 'Operasyon özeti',
      demo: context.mode === 'demo'
    })}
    ${renderNotice('Veriler canlı servislerden yüklenir. Demo modunda örnek tenant verisi kullanılır.', 'info')}
    <div id="garson-admin-stats" class="gai-admin-dashboard-metrics" aria-label="Özet kartlar">
      ${renderMetricGrid(metrics)}
    </div>
    <div id="garson-admin-sections" class="gai-admin-dashboard-sections" hidden aria-hidden="true"></div>
  `.trim();
}

/**
 * @param {HTMLElement} root
 * @param {AdminPanelContext} context
 */
export async function mountDashboardPage(root, context) {
  root.innerHTML = '<p class="gai-admin-empty">Özet yükleniyor…</p>';
  root.innerHTML = await renderDashboardPage(context);
  document.body.classList.add('ib-ready');
}
