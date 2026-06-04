/**
 * Finansman sonuç ekranı — TCMB referans kartı (public /api/evds-snapshot).
 */
import { escapeHtml } from '../../core/security.js';

function formatRate(value, suffix = '') {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  if (suffix === '%') return `%${n.toFixed(2).replace(/\.00$/, '')}`;
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 4 });
}

function renderCardHtml(data) {
  const rates = data?.rates || {};
  const meta = data?.dataDate
    ? `Veri tarihi: ${escapeHtml(data.dataDate)}`
    : data?.fetchedAt
      ? `Güncelleme: ${escapeHtml(new Date(data.fetchedAt).toLocaleString('tr-TR'))}`
      : '';

  return `
    <section class="finansman-v2-evds" aria-label="Son TCMB verileri" data-finansman-evds-card>
      <header class="finansman-v2-evds__head">
        <h3>Son TCMB Verileri</h3>
        <p class="finansman-v2-evds__note">Resmi EVDS referansı — simülasyon varsayımlarını kalibre eder; teklif değildir.</p>
      </header>
      <dl class="finansman-v2-evds__grid">
        <div><dt>USD/TRY</dt><dd>${escapeHtml(formatRate(rates.usdTry))}</dd></div>
        <div><dt>EUR/TRY</dt><dd>${escapeHtml(formatRate(rates.eurTry))}</dd></div>
        <div><dt>Politika faizi</dt><dd>${escapeHtml(formatRate(rates.policyRate, '%'))}</dd></div>
        <div><dt>TÜFE (yıllık)</dt><dd>${escapeHtml(formatRate(rates.cpiAnnual, '%'))}</dd></div>
      </dl>
      ${meta ? `<p class="finansman-v2-evds__meta">${meta} · <a href="/veri-kaynaklari/">Veri kaynakları</a></p>` : ''}
    </section>`;
}

export async function hydrateFinansmanEvdsCard(root) {
  if (!root) return;
  const host = root.querySelector('[data-finansman-evds-card]');
  if (host) return;

  const placeholder = document.createElement('div');
  placeholder.setAttribute('data-finansman-evds-placeholder', '');
  placeholder.hidden = true;
  root.insertBefore(placeholder, root.querySelector('.finansman-v2-kpis') || root.firstChild);

  try {
    const res = await fetch('/api/evds-snapshot', { credentials: 'same-origin' });
    const body = await res.json().catch(() => ({}));
    if (!body?.ok || !body?.data) return;

    const html = renderCardHtml(body.data);
    placeholder.outerHTML = html;
  } catch {
    /* Sessiz düşüş — karar motoru etkilenmez */
  }
}
