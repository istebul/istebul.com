/**
 * AI Decision Memory Commentary for /gecmis insights panel.
 * Explains deterministic Decision Memory Insights only — no new scores/TCO/risk.
 */

import { postAiProxy } from '../core/ai-proxy-client.js';
import { escapeHtml } from '../core/security.js';
import { sanitizeAiNarrative } from '../engines/decision-consultant.js';
import { extractAiProxyText } from '../features/ai/ai-insight-engine.js';
import { canCallAiNarration, hasAiNarrationBudget } from '../core/scale-limits.js';
import { getResultsPlanContext } from '../features/billing/paywall-v1.js';
import {
    DECISION_MEMORY_INSIGHTS_MIN,
    buildDecisionMemoryInsightsModel
} from './decision-memory-insights.js';

export const DECISION_MEMORY_COMMENTARY_KEYS = Object.freeze([
    'category_explanation',
    'risk_explanation',
    'fit_explanation',
    'profile_explanation',
    'synthesis',
    'disclaimer'
]);

export const DECISION_MEMORY_PRESCRIPTIVE_PHRASES = Object.freeze([
    'bunu seçmelisiniz',
    'bunu secmelisiniz',
    'en doğru karar',
    'en dogru karar',
    'bundan sonra böyle yapın',
    'bundan sonra boyle yapin',
    'kesinlikle bunu alın',
    'kesinlikle bunu alin',
    'tek doğru seçenek',
    'tek dogru secenek',
    'sizin için en iyi karar',
    'sizin icin en iyi karar'
]);

const COMMENTARY_TIMEOUT_MS = 8000;

/**
 * @param {object | null | undefined} model
 * @returns {boolean}
 */
export function shouldRenderDecisionMemoryAiCommentary(model) {
    if (!model || model.softState) return false;
    if (!Array.isArray(model.insights) || !model.insights.length) return false;
    return Number(model.entryCount || 0) >= DECISION_MEMORY_INSIGHTS_MIN;
}

/**
 * @param {object | null | undefined} model
 * @returns {Record<string, string> | null}
 */
function insightValueMap(model) {
    if (!model?.insights?.length) return null;
    return Object.fromEntries(
        model.insights
            .filter((item) => item?.key && item?.value)
            .map((item) => [item.key, String(item.value)])
    );
}

/**
 * @param {object | null | undefined} model
 * @returns {Record<string, string> | null}
 */
export function buildDeterministicDecisionMemoryCommentary(model) {
    if (!shouldRenderDecisionMemoryAiCommentary(model)) return null;

    const values = insightValueMap(model);
    if (!values) return null;

    const entryCount = Number(model.entryCount || 0);
    const topCategory = values['top-category'] || '—';
    const riskTendency = values['risk-tendency'] || '—';
    const averageFit = values['average-fit'] || null;
    const topProfile = values['top-profile'] || '—';

    const commentary = {
        category_explanation:
            `En sık görülen kategori ${topCategory} olarak okunuyor. Bu dağılım yalnızca kayıtlı geçmiş karar türlerini özetler; gelecekteki tercihlerinizi yönlendirmez.`,
        risk_explanation:
            `Son kayıtlarda baskın risk eğilimi ${riskTendency} olarak görünüyor. Risk etiketleri kural tabanlı sinyallerden türetilir; piyasa ve operasyonel belirsizlikler ayrı değerlendirilmelidir.`,
        fit_explanation: averageFit
            ? `Ortalama uygunluk skoru ${averageFit} düzeyinde okunuyor. Skor mevcut kayıtlardaki uygunluk sinyallerinin ortalamasıdır; kişisel öncelikler nihai tercihi belirler.`
            : 'Ortalama uygunluk skoru için yeterli sayısal sinyal bulunmuyor; mevcut kayıtlarda skor alanı boş veya eksik olabilir.',
        profile_explanation:
            `En sık görülen karar profili / etiket "${topProfile}" olarak öne çıkıyor. Bu okuma kayıtlı profil ve etiket alanlarının tekrarına dayanır.`,
        synthesis:
            `Son ${entryCount} karar kaydındaki kategori, risk, uygunluk ve profil sinyalleri birlikte okunduğunda geçmiş karar deseninizin özeti oluşur; nihai tercih kullanıcıya aittir.`,
        disclaimer:
            'Bu yorum karar desteği amaçlıdır; bağlayıcı satın alma veya finansman taahhüdü değildir. Nihai karar kullanıcıya aittir.'
    };

    return commentary;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsPrescriptiveMemoryCommentaryPhrase(text) {
    const normalized = String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
    return DECISION_MEMORY_PRESCRIPTIVE_PHRASES.some((phrase) => normalized.includes(phrase));
}

/**
 * @param {string} text
 * @param {number} [maxLen]
 * @returns {string}
 */
export function sanitizeDecisionMemoryCommentaryText(text, maxLen = 720) {
    let out = sanitizeAiNarrative(String(text || ''), maxLen);
    for (const phrase of DECISION_MEMORY_PRESCRIPTIVE_PHRASES) {
        const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        out = out.replace(re, '').trim();
    }
    return out.replace(/\s{2,}/g, ' ').trim();
}

/**
 * @param {object | null | undefined} model
 * @returns {string}
 */
export function buildDecisionMemoryCommentaryPrompt(model) {
    const ctx = {
        entry_count: model?.entryCount || 0,
        insights: Array.isArray(model?.insights)
            ? model.insights.map((item) => ({
                key: item.key,
                label: item.label,
                value: item.value
            }))
            : []
    };

    return [
        'Görev: Karar geçmişi içgörü özeti için YALNIZCA geçerli JSON üret (başka metin yok).',
        'Dil: Türkçe, profesyonel, açıklayıcı; pazarlama abartısı yok.',
        'YASAK: yeni skor, TCO, risk veya uygunluk üretmek; gelecekteki karar emri vermek.',
        'YASAK ifadeler: "seçmelisiniz", "en doğru karar", "bundan sonra böyle yapın", "kesinlikle bunu alın", "tek doğru seçenek".',
        'İZİNLİ: verilen içgörü sinyallerini açıklamak, geçmiş desenleri yorumlamak.',
        'Anahtarlar: ' + DECISION_MEMORY_COMMENTARY_KEYS.join(', '),
        'Bağlam (JSON): ' + JSON.stringify(ctx)
    ].join('\n');
}

/**
 * @param {string} raw
 * @returns {Record<string, string> | null}
 */
export function parseDecisionMemoryCommentary(raw) {
    if (!raw || typeof raw !== 'string') return null;

    const trimmed = raw.trim();
    const jsonSlice = trimmed.startsWith('{') ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonSlice) return null;

    let parsed;
    try {
        parsed = JSON.parse(jsonSlice);
    } catch {
        return null;
    }
    if (!parsed || typeof parsed !== 'object') return null;

    const out = {};
    for (const key of DECISION_MEMORY_COMMENTARY_KEYS) {
        const rawValue = String(parsed[key] || '');
        if (!rawValue || containsPrescriptiveMemoryCommentaryPhrase(rawValue)) return null;
        const value = sanitizeDecisionMemoryCommentaryText(rawValue, key === 'synthesis' ? 520 : 360);
        if (!value || containsPrescriptiveMemoryCommentaryPhrase(value)) return null;
        out[key] = value;
    }

    if (!out.synthesis) return null;
    return out;
}

/**
 * @param {Record<string, string> | null} ai
 * @param {Record<string, string> | null} deterministic
 * @returns {{ data: Record<string, string>, source: 'ai' | 'rules' }}
 */
export function mergeDecisionMemoryCommentary(ai, deterministic) {
    const base = deterministic || {};
    if (!ai) return { data: base, source: 'rules' };

    const merged = { ...base };
    for (const key of DECISION_MEMORY_COMMENTARY_KEYS) {
        if (ai[key]) merged[key] = ai[key];
    }
    return { data: merged, source: 'ai' };
}

/**
 * @param {Record<string, string> | null} commentary
 * @param {{ source?: string, state?: string }} [options]
 * @returns {string}
 */
export function renderDecisionMemoryAiCommentaryHtml(commentary, options = {}) {
    if (!commentary) return '';

    const source = options.source || 'rules';
    const state = options.state || 'ready';
    const safe = (value) => escapeHtml(String(value ?? ''));

    const sourceLabel =
        state === 'loading'
            ? 'AI yorumu hazırlanıyor…'
            : source === 'ai'
                ? 'AI destekli yorum'
                : 'Kural tabanlı yorum';

    const bullets = [
        { key: 'category_explanation', label: 'Kategori deseni' },
        { key: 'risk_explanation', label: 'Risk eğilimi' },
        { key: 'fit_explanation', label: 'Uygunluk ortalaması' },
        { key: 'profile_explanation', label: 'Profil / etiket' }
    ];

    return '<section class="decision-memory-ai-commentary" data-decision-memory-ai-commentary data-memory-ai-state="' + safe(state) + '" data-memory-ai-source="' + safe(source) + '">' +
        '<header class="decision-memory-ai-commentary-head">' +
            '<div>' +
                '<h4>AI destekli geçmiş yorumu</h4>' +
                '<p class="decision-memory-ai-commentary-lead">Bu yorum yalnızca geçmiş karar kayıtlarınızdaki mevcut içgörü sinyallerini açıklar; nihai karar kullanıcıya aittir.</p>' +
            '</div>' +
            '<span class="decision-memory-ai-commentary-badge" data-memory-ai-badge>' + safe(sourceLabel) + '</span>' +
        '</header>' +
        '<p class="decision-memory-ai-commentary-synthesis" data-memory-ai-synthesis>' + safe(commentary.synthesis) + '</p>' +
        '<ul class="decision-memory-ai-commentary-list">' +
            bullets.map((item) =>
                '<li data-memory-ai-point="' + safe(item.key) + '">' +
                    '<strong>' + safe(item.label) + '</strong>' +
                    '<span>' + safe(commentary[item.key] || '—') + '</span>' +
                '</li>'
            ).join('') +
        '</ul>' +
        '<p class="decision-memory-ai-commentary-disclaimer">' + safe(commentary.disclaimer || '') + '</p>' +
    '</section>';
}

/**
 * @param {HTMLElement | null} root
 * @param {Record<string, string>} commentary
 * @param {{ source?: string, state?: string }} [options]
 */
export function hydrateDecisionMemoryAiCommentaryPanel(root, commentary, options = {}) {
    const panel = root?.querySelector?.('[data-decision-memory-ai-commentary]');
    if (!panel || !commentary) return;

    const source = options.source || 'rules';
    const state = options.state || 'ready';
    panel.dataset.memoryAiState = state;
    panel.dataset.memoryAiSource = source;

    const badge = panel.querySelector('[data-memory-ai-badge]');
    const synthesis = panel.querySelector('[data-memory-ai-synthesis]');
    const disclaimer = panel.querySelector('.decision-memory-ai-commentary-disclaimer');

    if (badge) {
        badge.textContent =
            state === 'loading'
                ? 'AI yorumu hazırlanıyor…'
                : source === 'ai'
                    ? 'AI destekli yorum'
                    : 'Kural tabanlı yorum';
    }
    if (synthesis) synthesis.textContent = commentary.synthesis || '';
    if (disclaimer) disclaimer.textContent = commentary.disclaimer || '';

    for (const key of ['category_explanation', 'risk_explanation', 'fit_explanation', 'profile_explanation']) {
        const row = panel.querySelector(`[data-memory-ai-point="${key}"] span`);
        if (row) row.textContent = commentary[key] || '—';
    }
}

/**
 * @param {object | null | undefined} model
 * @param {{ skipProxy?: boolean }} [options]
 * @returns {Promise<{ commentary: Record<string, string>, source: 'ai' | 'rules' }>}
 */
export async function fetchDecisionMemoryAiCommentary(model, options = {}) {
    const deterministic = buildDeterministicDecisionMemoryCommentary(model);
    if (!deterministic) {
        return { commentary: {}, source: 'rules' };
    }

    if (options.skipProxy) {
        return { commentary: deterministic, source: 'rules' };
    }

    const { planTier } = getResultsPlanContext();
    const pro = planTier === 'pro';

    if (!hasAiNarrationBudget({ pro })) {
        return { commentary: deterministic, source: 'rules' };
    }
    if (!canCallAiNarration({ pro })) {
        return { commentary: deterministic, source: 'rules' };
    }

    const prompt = buildDecisionMemoryCommentaryPrompt(model);

    try {
        const proxy = await postAiProxy({
            prompt,
            context: { category: 'decision-memory-commentary-v1' },
            timeoutMs: COMMENTARY_TIMEOUT_MS
        });

        if (!proxy.ok) {
            return { commentary: deterministic, source: 'rules' };
        }

        const parsed = parseDecisionMemoryCommentary(extractAiProxyText(proxy.data));
        const { data: merged, source } = mergeDecisionMemoryCommentary(parsed, deterministic);
        return { commentary: merged, source };
    } catch {
        return { commentary: deterministic, source: 'rules' };
    }
}

/**
 * @param {HTMLElement | null} host
 * @param {object | null | undefined} model
 */
export function hydrateDecisionMemoryAiCommentary(host, model) {
    if (!host || !shouldRenderDecisionMemoryAiCommentary(model)) return;

    const panel = host.querySelector('[data-decision-memory-ai-commentary]');
    if (!panel) return;

    const deterministic = buildDeterministicDecisionMemoryCommentary(model);
    if (!deterministic) return;

    void fetchDecisionMemoryAiCommentary(model)
        .then(({ commentary, source }) => {
            if (!host.isConnected) return;
            if (!host.querySelector('[data-decision-memory-ai-commentary]')) return;
            if (source !== 'ai') return;
            hydrateDecisionMemoryAiCommentaryPanel(host, commentary, { source, state: 'ready' });
        })
        .catch(() => {
            /* deterministic copy already rendered */
        });
}
