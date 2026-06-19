/**
 * Shared AI platform surface — consistent branding across results, dashboard, listings, admin.
 */
import { escapeHtml } from '../core/security.js';

/** English risk keys → Turkish labels (decision engine canonical keys). */
export const RISK_KEY_LABELS_TR = Object.freeze({
  payment: 'Aylık ödeme riski',
  dti: 'Borç/gelir oranı',
  term: 'Vade riski',
  interest: 'Faiz yükü riski',
  rate: 'Faiz oranı riski',
  cashflow: 'Nakit akışı riski',
  flex: 'Erken kapama esnekliği',
  budget: 'Bütçe riski',
  location: 'Lokasyon riski',
  credit: 'Kredi yükü',
  dues: 'Aidat ve ek giderler',
  liquidity: 'Likidite riski',
  depreciation: 'Değer kaybı riski',
  season: 'Sezon/tarih riski',
  family: 'Aile uygunluğu',
  transport: 'Ulaşım riski',
  lodging: 'Konaklama riski',
  cancel: 'İptal/esneklik riski',
  tco: 'Toplam sahip olma maliyeti',
  fuel: 'Yakıt/enerji riski',
  maintenance: 'Bakım riski',
  resale: 'İkinci el değeri',
  usage: 'Kullanım uyumu'
});

/**
 * Resolve a risk item title in Turkish.
 * @param {{ key?: string, title?: string, label?: string }} risk
 */
export function resolveRiskTitleTr(risk = {}) {
  const title = String(risk.title || risk.label || '').trim();
  if (title) return title;
  const key = String(risk.key || '').trim();
  return RISK_KEY_LABELS_TR[key] || key || 'Risk';
}

/**
 * Resolve risk detail text in Turkish.
 * @param {{ description?: string, detail?: string, reason?: string }} risk
 */
export function resolveRiskDetailTr(risk = {}) {
  return String(risk.description || risk.detail || risk.reason || '').trim();
}

/**
 * Premium AI platform banner for result panels and decision surfaces.
 * @param {object} [opts]
 * @param {string} [opts.title]
 * @param {string} [opts.subtitle]
 * @param {boolean} [opts.live]
 * @param {string} [opts.variant] compact|full
 */
export function renderAiPlatformBanner(opts = {}) {
  const esc = escapeHtml;
  const variant = opts.variant === 'compact' ? 'compact' : 'full';
  const title = opts.title || 'Yapay Zeka Karar Motoru';
  const subtitle =
    opts.subtitle ||
    'Skor, risk ve maliyet kural tabanlı hesaplanır; AI yorum katmanı kararınızı açıklar.';
  const live = opts.live !== false;

  return `
    <div class="ib-ai-platform-banner ib-ai-platform-banner--${esc(variant)}" role="note" aria-label="Yapay zeka karar platformu">
      <div class="ib-ai-platform-banner__icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="currentColor"/>
        </svg>
      </div>
      <div class="ib-ai-platform-banner__copy">
        <strong>${esc(title)}</strong>
        <p>${esc(subtitle)}</p>
      </div>
      ${
        live
          ? `<span class="ib-ai-platform-banner__live"><span class="ib-ai-platform-banner__pulse" aria-hidden="true"></span>AI aktif</span>`
          : ''
      }
    </div>`;
}

/**
 * Inline AI badge for cards and list items.
 * @param {string} [label]
 */
export function renderAiBadge(label = 'AI analiz') {
  const esc = escapeHtml;
  return `<span class="ib-ai-badge" title="Yapay zeka destekli karar analizi">${esc(label)}</span>`;
}

/**
 * Load shared AI platform CSS once.
 */
export function ensureAiPlatformStyles() {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return;

  const existing = document.querySelector('link[data-ai-platform-surface]');
  if (existing) return;

  if (typeof document.createElement !== 'function') return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/css/ai-platform-surface.css';
  link.setAttribute('data-ai-platform-surface', '1');
  document.head?.appendChild(link);
}
