/**
 * Karar Mahkemesi Beta — HTML renderer and mount helper (frontend-only).
 */
import { escapeHtml } from '../../core/security.js';
import {
  buildKararMahkemesiModel,
  containsForbiddenKararPhrase,
  KARAR_MAHKEMESI_FORBIDDEN_PHRASES
} from './karar-mahkemesi-engine.js';

export const KARAR_MAHKEMESI_BETA_DISCLAIMER =
  'Bu analiz bilgilendirme amaçlıdır; nihai karar kullanıcıya aittir.';

function esc(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {string} aksiyonEtiketi
 * @returns {string}
 */
function aksiyonSlug(aksiyonEtiketi) {
  const map = {
    Al: 'al',
    Bekle: 'bekle',
    'Pazarlık yap': 'pazarlik',
    Vazgeç: 'vazgec',
    'Daha fazla veri gerekli': 'daha-fazla-veri'
  };
  return map[String(aksiyonEtiketi || '').trim()] || 'bekle';
}

/**
 * @param {object} model
 * @returns {string}
 */
export function renderKararMahkemesiBetaHtml(model = {}) {
  const beklemeSkoru = Number(model.beklemeSkoru);
  const scoreLabel = Number.isFinite(beklemeSkoru) ? `${Math.round(beklemeSkoru)}/100` : '—';
  const aksiyonEtiketi = String(model.aksiyonEtiketi || 'Bekle');
  const gerekceler = Array.isArray(model.gerekceler) ? model.gerekceler.filter(Boolean) : [];
  const disclaimer = KARAR_MAHKEMESI_BETA_DISCLAIMER;

  const gerekceItems = gerekceler
    .slice(0, 5)
    .map((item) => `<li class="karar-mahkemesi-beta__gerekce">${esc(item)}</li>`)
    .join('');

  const gerekceBlock =
    gerekceItems ?
      `<ul class="karar-mahkemesi-beta__gerekceler" aria-label="Analiz gerekçeleri">${gerekceItems}</ul>`
    : '';

  return `
    <article
      class="karar-mahkemesi-beta"
      data-karar-mahkemesi-beta
      data-bekleme-skoru="${esc(String(Number.isFinite(beklemeSkoru) ? Math.round(beklemeSkoru) : ''))}"
      data-aksiyon="${esc(aksiyonSlug(aksiyonEtiketi))}"
      aria-label="Karar Mahkemesi Beta"
    >
      <header class="karar-mahkemesi-beta__header">
        <h3 class="karar-mahkemesi-beta__title">Karar Mahkemesi Beta</h3>
        <p class="karar-mahkemesi-beta__subtitle">Pişmanlık Önleme Analizi</p>
      </header>
      <div class="karar-mahkemesi-beta__metrics">
        <div class="karar-mahkemesi-beta__metric">
          <span class="karar-mahkemesi-beta__metric-label">Bekleme Skoru</span>
          <strong class="karar-mahkemesi-beta__metric-value" data-bekleme-skoru-value>${esc(scoreLabel)}</strong>
        </div>
        <div class="karar-mahkemesi-beta__metric">
          <span class="karar-mahkemesi-beta__metric-label">Önerilen aksiyon</span>
          <strong class="karar-mahkemesi-beta__aksiyon" data-aksiyon-etiketi>${esc(aksiyonEtiketi)}</strong>
        </div>
      </div>
      ${gerekceBlock}
      <p class="karar-mahkemesi-beta__disclaimer" data-karar-mahkemesi-disclaimer>${esc(disclaimer)}</p>
    </article>
  `.trim();
}

/**
 * @param {object} params
 * @returns {boolean}
 */
export function mountKararMahkemesiBeta({ mountNode, intel, formData, topResult } = {}) {
  if (!mountNode) return false;

  try {
    const model = buildKararMahkemesiModel({ intel, formData, topResult });
    const html = renderKararMahkemesiBetaHtml(model);

    const combinedText = [html, model.aksiyonEtiketi, ...(model.gerekceler || [])].join(' ');

    if (containsForbiddenKararPhrase(combinedText)) {
      return false;
    }

    for (const phrase of KARAR_MAHKEMESI_FORBIDDEN_PHRASES) {
      if (combinedText.toLocaleLowerCase('tr-TR').includes(phrase)) {
        return false;
      }
    }

    if (typeof mountNode.insertAdjacentHTML === 'function') {
      mountNode.insertAdjacentHTML('beforeend', html);
    } else if ('innerHTML' in mountNode) {
      mountNode.innerHTML = html;
    } else {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
