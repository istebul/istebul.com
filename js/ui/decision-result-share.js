/**
 * Client-side Decision Share Card for Karar Merkezi result screen.
 * Builds plain-text share payload from deterministic summary only — no export/PDF/AI.
 */

export const DECISION_RESULT_SHARE_NOTE =
    'Bu özet deterministik skor, risk ve maliyet sinyallerine dayanır; nihai karar kullanıcıya aittir.';

export const DECISION_RESULT_MARKETPLACE_PHRASES = Object.freeze([
    'ilan paylaş',
    'ilan paylas',
    'liste paylaş',
    'liste paylas',
    'fiyat teklifi gönder',
    'fiyat teklifi gonder'
]);

export const DECISION_RESULT_PRESCRIPTIVE_SHARE_PHRASES = Object.freeze([
    'bunu seçmelisiniz',
    'bunu secmelisiniz',
    'en doğru karar',
    'en dogru karar',
    'kesinlikle bunu alın',
    'kesinlikle bunu alin',
    'tek doğru seçenek',
    'tek dogru secenek',
    'sizin için en iyi karar',
    'sizin icin en iyi karar'
]);

const SHARE_SUCCESS_MESSAGE = 'Karar özeti panoya kopyalandı.';
const SHARE_FAILURE_MESSAGE = 'Kopyalama başarısız. Metni seçip manuel kopyalayabilirsiniz.';

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeShareText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
}

/**
 * @param {string} text
 * @param {readonly string[]} phrases
 * @returns {boolean}
 */
function containsBannedPhrase(text, phrases) {
    const normalized = normalizeShareText(text);
    return phrases.some((phrase) => normalized.includes(phrase));
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsMarketplaceSharePhrase(text) {
    return containsBannedPhrase(text, DECISION_RESULT_MARKETPLACE_PHRASES);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsPrescriptiveSharePhrase(text) {
    return containsBannedPhrase(text, DECISION_RESULT_PRESCRIPTIVE_SHARE_PHRASES);
}

/**
 * @param {{ label?: string, value?: string, detail?: string } | undefined} item
 * @returns {string}
 */
function formatShareLine(item = {}) {
    const value = String(item.value || '—').trim();
    const detail = String(item.detail || '').trim();
    return detail ? `${value} — ${detail}` : value;
}

/**
 * @param {Record<string, { label?: string, value?: string, detail?: string }> | null | undefined} summary
 * @returns {boolean}
 */
export function shouldRenderDecisionResultShare(summary) {
    return Boolean(summary?.fit && summary?.risk && summary?.tco && summary?.profile);
}

/**
 * @param {Record<string, { label?: string, value?: string, detail?: string }> | null | undefined} summary
 * @returns {string}
 */
export function buildDecisionResultShareText(summary) {
    if (!shouldRenderDecisionResultShare(summary)) return '';

    const lines = [
        'isteBul karar özeti:',
        `Uygunluk: ${formatShareLine(summary.fit)}`,
        `Risk: ${formatShareLine(summary.risk)}`,
        `TCO: ${formatShareLine(summary.tco)}`,
        `Karar profili: ${formatShareLine(summary.profile)}`,
        `Not: ${DECISION_RESULT_SHARE_NOTE}`
    ];

    const text = lines.join('\n');
    if (containsMarketplaceSharePhrase(text) || containsPrescriptiveSharePhrase(text)) {
        return '';
    }

    return text;
}

/**
 * @param {string} text
 * @returns {Promise<{ ok: boolean, method: 'clipboard' | 'execCommand' | 'none' }>}
 */
export async function copyDecisionResultShareText(text) {
    const payload = String(text || '').trim();
    if (!payload) {
        return { ok: false, method: 'none' };
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(payload);
            return { ok: true, method: 'clipboard' };
        } catch {
            // fall through to textarea fallback
        }
    }

    if (typeof document === 'undefined') {
        return { ok: false, method: 'none' };
    }

    try {
        const textarea = document.createElement('textarea');
        textarea.value = payload;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body?.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.remove();
        return { ok, method: ok ? 'execCommand' : 'none' };
    } catch {
        return { ok: false, method: 'none' };
    }
}

/**
 * @param {(value: string) => string} escapeHtml
 * @returns {string}
 */
export function renderDecisionResultShareHtml(escapeHtml) {
    const safe = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value ?? '');

    return '<section class="decision-result-share" data-decision-result-share aria-label="Karar özetini paylaş">' +
        '<div class="decision-result-share-head">' +
            '<h4>Karar özetini paylaş</h4>' +
            '<p class="decision-result-share-lead">Uygunluk, risk ve maliyet sinyallerinden oluşan karar özetinizi paylaşabilirsiniz.</p>' +
        '</div>' +
        '<div class="decision-result-share-actions">' +
            '<button type="button" class="btn btn-primary" data-decision-result-share-copy>' +
                '<i data-lucide="copy"></i> Karar özetini kopyala' +
            '</button>' +
        '</div>' +
        '<p class="decision-result-share-feedback" data-decision-result-share-feedback hidden aria-live="polite"></p>' +
    '</section>';
}

/**
 * @param {HTMLElement | null} container
 * @param {Record<string, { label?: string, value?: string, detail?: string }> | null | undefined} summary
 */
export function bindDecisionResultShareCard(container, summary) {
    if (!container || !shouldRenderDecisionResultShare(summary)) return;

    const card = container.querySelector('[data-decision-result-share]');
    const copyBtn = container.querySelector('[data-decision-result-share-copy]');
    const feedback = container.querySelector('[data-decision-result-share-feedback]');
    const shareText = buildDecisionResultShareText(summary);

    if (!card || !copyBtn || !shareText) return;

    copyBtn.addEventListener('click', () => {
        void copyDecisionResultShareText(shareText).then((result) => {
            if (!feedback) return;
            feedback.hidden = false;
            feedback.textContent = result.ok ? SHARE_SUCCESS_MESSAGE : SHARE_FAILURE_MESSAGE;
        });
    });
}
