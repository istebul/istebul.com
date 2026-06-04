/**
 * Finansman sonuç ekranı — TCMB referans kartı (public /api/evds-snapshot).
 */
import { escapeHtml } from '../../core/security.js';

function formatRate(value, suffix = '') {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  if (suffix === '%') return `%${n.toFixed(2).replace(/\.00$/, '')}`;
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function renderCardHtml(data) {
  const rates = data?.rates || {};
  const dataDate = data?.dataDate
    ? escapeHtml(data.dataDate)
    : data?.fetchedAt
      ? escapeHtml(new Date(data.fetchedAt).toLocaleDateString('tr-TR'))
      : '—';

  return `
    <section class="finansman-v2-evds" aria-label="TCMB referans verileri" data-finansman-evds-card>
      <header class="finansman-v2-evds__head">
        <h3>TCMB Referans Verileri</h3>
        <p class="finansman-v2-evds__note">TCMB EVDS verileri bilgilendirme amaçlı referans olarak kullanılır. Gösterilen oranlar banka teklifi, kredi önerisi veya finansal tavsiye değildir.</p>
      </header>
      <dl class="finansman-v2-evds__grid">
        <div><dt>USD/TRY</dt><dd>${escapeHtml(formatRate(rates.usdTry))}</dd></div>
        <div><dt>EUR/TRY</dt><dd>${escapeHtml(formatRate(rates.eurTry))}</dd></div>
        <div><dt>TCMB politika faizi (referans)</dt><dd>${escapeHtml(formatRate(rates.policyRate, '%'))}</dd></div>
        <div><dt>Veri tarihi</dt><dd>${dataDate}</dd></div>
      </dl>
      <p class="finansman-v2-evds__meta">
        Kaynak:
        <a href="https://evds3.tcmb.gov.tr/" rel="noopener noreferrer" target="_blank">TCMB EVDS (Canlı referans veri)</a>
        · <a href="/veri-kaynaklari/">Veri kaynakları</a>
      </p>
    </section>`;
}

/**
 * @param {HTMLElement | null} root — .finansman-v2-root (içinde [data-finansman-evds-mount] olmalı)
 */
export async function hydrateFinansmanEvdsCard(root) {
  if (!root) return;

  const mount = root.querySelector('[data-finansman-evds-mount]');
  if (!mount || mount.querySelector('[data-finansman-evds-card]')) return;

  mount.hidden = false;
  mount.setAttribute('aria-busy', 'true');
  mount.innerHTML =
    '<p class="finansman-v2-evds__loading">TCMB referans verileri yükleniyor…</p>';

  try {
    const res = await fetch('/api/evds-snapshot', { credentials: 'same-origin' });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || !body?.ok || !body?.data) {
      mount.hidden = true;
      mount.innerHTML = '';
      mount.removeAttribute('aria-busy');
      return;
    }

    mount.innerHTML = renderCardHtml(body.data);
    mount.removeAttribute('aria-busy');
  } catch {
    mount.hidden = true;
    mount.innerHTML = '';
    mount.removeAttribute('aria-busy');
  }
}
