import { getGarsonDataClient, isGarsonSupabaseClientAvailable } from '../../data-service.js';
import { getMockDemoTenantPayload } from '../../admin-portal.js';
import { normalizeRestaurantSettings } from '../../tenant.js';
import { escapeHtml, formatDateTr } from '../shared/format.js';
import { renderMetricGrid } from '../shared/cards.js';
import { renderPageHeader, renderPanelSection } from '../shared/shell.js';
import { renderDataTable } from '../shared/table.js';

/**
 * @typedef {import('../shared/context.js').AdminPanelContext} AdminPanelContext
 */

/**
 * @param {AdminPanelContext} context
 * @returns {Promise<{ connected: boolean, webhook: string, phone: string, messages: Record<string, unknown>[] }>}
 */
export async function loadWhatsappModuleData(context) {
  const settings = normalizeRestaurantSettings(getMockDemoTenantPayload().settings);
  const client = getGarsonDataClient();
  /** @type {Record<string, unknown>[]} */
  let messages = [];

  if (isGarsonSupabaseClientAvailable(client)) {
    try {
      const { data } = await client
        .from('whatsapp_messages')
        .select('id, restaurant_id, phone, body, direction, created_at')
        .eq('restaurant_id', context.restaurantId)
        .order('created_at', { ascending: false })
        .limit(20);

      messages = (data || []).map((row) => {
        const record = /** @type {Record<string, unknown>} */ (row);
        return {
          id: String(record.id || ''),
          phone: String(record.phone || '—'),
          body: String(record.body || '—'),
          direction: String(record.direction || 'inbound') === 'outbound' ? 'Giden' : 'Gelen',
          time: formatDateTr(record.created_at)
        };
      });
    } catch {
      messages = [];
    }
  }

  return {
    connected: settings.whatsappEnabled,
    webhook: settings.whatsappEnabled ? 'Aktif' : 'Pasif',
    phone: '+90 ••• ••• •• ••',
    messages
  };
}

/**
 * @param {AdminPanelContext} context
 * @param {Awaited<ReturnType<typeof loadWhatsappModuleData>>} data
 * @returns {string}
 */
export function renderWhatsappPage(context, data) {
  const metrics = renderMetricGrid([
    {
      id: 'connection',
      label: 'Bağlantı durumu',
      value: data.connected ? 'Bağlı' : 'Kapalı',
      tone: data.connected ? 'success' : 'warning'
    },
    { id: 'webhook', label: 'Webhook durumu', value: data.webhook },
    { id: 'phone', label: 'Telefon numarası', value: data.phone }
  ]);

  const table = renderDataTable({
    id: 'gai-admin-whatsapp-table',
    emptyMessage: 'Henüz WhatsApp mesajı yok.',
    columns: [
      { key: 'phone', label: 'Numara' },
      { key: 'body', label: 'Mesaj' },
      { key: 'direction', label: 'Yön' },
      { key: 'time', label: 'Tarih' }
    ],
    rows: data.messages
  });

  return `
    ${renderPageHeader({
      title: 'WhatsApp',
      subtitle: 'Bağlantı ve son mesajlar',
      demo: context.mode === 'demo'
    })}
    ${metrics}
    ${renderPanelSection(`<h2 class="gai-section-title">Son mesajlar</h2>${table}`)}
  `.trim();
}

/**
 * @param {HTMLElement} root
 * @param {AdminPanelContext} context
 */
export async function mountWhatsappPage(root, context) {
  root.innerHTML = '<p class="gai-admin-empty">WhatsApp verileri yükleniyor…</p>';
  const data = await loadWhatsappModuleData(context);
  root.innerHTML = renderWhatsappPage(context, data);
}
