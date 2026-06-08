/**
 * AI Decision Explanation Layer for /karsilastir/.
 * Explains deterministic comparison summary only — never produces new scores/TCO/risk.
 */

import { escapeHtml } from '../core/security.js';
import { sanitizeAiNarrative } from '../engines/decision-consultant.js';
import { extractAiProxyText } from '../features/ai/ai-insight-engine.js';
import { canCallAiNarration, hasAiNarrationBudget } from '../core/scale-limits.js';
import { getResultsPlanContext } from '../features/billing/paywall-v1.js';
import { resolveComparisonTcoValue } from './comparison-decision-summary.js';

export const COMPARISON_EXPLANATION_KEYS = Object.freeze([
    'tco_explanation',
    'risk_explanation',
    'fit_explanation',
    'balanced_explanation',
    'synthesis',
    'disclaimer'
]);

export const COMPARISON_PRESCRIPTIVE_PHRASES = Object.freeze([
    'bunu seçmelisiniz',
    'bunu secmelisiniz',
    'en doğru karar',
    'en dogru karar',
    'kesinlikle alın',
    'kesinlikle alin',
    'mutlaka seçin',
    'mutlaka secin',
    'tek doğru seçenek',
    'tek dogru secenek'
]);

const EXPLANATION_TIMEOUT_MS = 8000;

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsPrescriptiveDecisionPhrase(text) {
    const normalized = String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
    return COMPARISON_PRESCRIPTIVE_PHRASES.some((phrase) => normalized.includes(phrase));
}

/**
 * @param {string} text
 * @param {number} [maxLen]
 * @returns {string}
 */
export function sanitizeComparisonExplanationText(text, maxLen = 720) {
    let out = sanitizeAiNarrative(String(text || ''), maxLen);
    for (const phrase of COMPARISON_PRESCRIPTIVE_PHRASES) {
        const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        out = out.replace(re, '').trim();
    }
    return out.replace(/\s{2,}/g, ' ').trim();
}

/**
 * @param {import('./comparison-decision-summary.js').ComparisonDecisionSummary | null} summary
 * @param {Array} [items]
 * @returns {Record<string, string> | null}
 */
export function buildDeterministicComparisonExplanation(summary, items = []) {
    if (!summary) return null;

    const tcoItem = summary.lowestTco?.item;
    const riskItem = summary.lowestRisk?.item;
    const fitItem = summary.highestFit?.item;
    const balancedItem = summary.mostBalanced?.item;
    const optionCount = Array.isArray(items) ? items.length : 0;

    const tcoTitle = tcoItem?.title || '—';
    const riskTitle = riskItem?.title || '—';
    const fitTitle = fitItem?.title || '—';
    const balancedTitle = balancedItem?.title || '—';
    const tcoDetail = summary.lowestTco?.detail || '';
    const riskDetail = summary.lowestRisk?.detail || 'risk etiketi mevcut değil';
    const fitDetail = summary.highestFit?.detail || 'skor mevcut değil';
    const balancedDetail = summary.mostBalanced?.detail || 'çoklu sinyal dengesi';

    return {
        tco_explanation:
            `${tcoTitle} seçeneği ${optionCount} seçenek arasında en düşük TCO sinyalini taşır` +
            (tcoDetail ? ` (${tcoDetail})` : '') +
            '. Bu okuma dönemsel maliyet alanından türetilir; teklif ve vergi kalemleri ayrı doğrulanmalıdır.',
        risk_explanation:
            `${riskTitle} için risk profili ${riskDetail} olarak okunuyor. Risk etiketi kural tabanlıdır; operasyonel ve piyasa belirsizlikleri ayrı değerlendirilmelidir.`,
        fit_explanation:
            `${fitTitle} en yüksek ihtiyaç uyum skoruna sahip (${fitDetail}). Uygunluk skoru profil eşleştirmesini özetler; kişisel öncelikler nihai tercihi belirler.`,
        balanced_explanation:
            `${balancedTitle} uyum, risk ve TCO sinyalleri arasında dengeli bir profil sunar (${balancedDetail}). Tek bir kriterde zirve yerine birden fazla boyutta orta-üst bandı hedefleyen seçimler için referans niteliğindedir.`,
        synthesis:
            `Karşılaştırma özeti mevcut skor, TCO ve risk sinyallerinden türetilmiştir. Maliyet odağı ${tcoTitle}, risk bandı ${riskTitle}, uyum lideri ${fitTitle} ve dengeli profil ${balancedTitle} olarak okunabilir.`,
        disclaimer:
            'Bu yorum karar desteği amaçlıdır; bağlayıcı satın alma veya finansman taahhüdü değildir. Nihai karar kullanıcıya aittir.'
    };
}

/**
 * @param {import('./comparison-decision-summary.js').ComparisonDecisionSummary | null} summary
 * @param {Array} [items]
 * @returns {string}
 */
export function buildComparisonExplanationPrompt(summary, items = []) {
    const list = Array.isArray(items) ? items : [];
    const ctx = {
        option_count: list.length,
        highlights: {
            lowest_tco: {
                title: summary?.lowestTco?.item?.title || null,
                detail: summary?.lowestTco?.detail || null,
                periodic_cost: resolveComparisonTcoValue(summary?.lowestTco?.item || {})
            },
            lowest_risk: {
                title: summary?.lowestRisk?.item?.title || null,
                risk_level: summary?.lowestRisk?.detail || null
            },
            highest_fit: {
                title: summary?.highestFit?.item?.title || null,
                score: summary?.highestFit?.item?.score || null
            },
            most_balanced: {
                title: summary?.mostBalanced?.item?.title || null,
                detail: summary?.mostBalanced?.detail || null
            }
        }
    };

    return [
        'Görev: Karşılaştırma merkezi için YALNIZCA geçerli JSON üret (başka metin yok).',
        'Dil: Türkçe, profesyonel, açıklayıcı; pazarlama abartısı yok.',
        'YASAK: yeni skor, TCO, risk veya uygunluk üretmek; "seçmelisiniz", "en doğru karar", "kesinlikle alın" gibi emir kipi.',
        'İZİNLİ: verilen özet sinyallerini açıklamak, maliyet/risk/uyum farklarını yorumlamak.',
        'Skor, TCO ve risk değerleri kural tabanlıdır — değiştirme iddiası yok.',
        'Anahtarlar: ' + COMPARISON_EXPLANATION_KEYS.join(', '),
        'Bağlam (JSON): ' + JSON.stringify(ctx)
    ].join('\n');
}

/**
 * @param {string} raw
 * @returns {Record<string, string> | null}
 */
export function parseComparisonExplanation(raw) {
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
    for (const key of COMPARISON_EXPLANATION_KEYS) {
        const value = sanitizeComparisonExplanationText(parsed[key], key === 'synthesis' ? 520 : 360);
        if (!value || containsPrescriptiveDecisionPhrase(value)) return null;
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
export function mergeComparisonExplanation(ai, deterministic) {
    const base = deterministic || {};
    if (!ai) return { data: base, source: 'rules' };

    const merged = { ...base };
    for (const key of COMPARISON_EXPLANATION_KEYS) {
        if (ai[key]) merged[key] = ai[key];
    }
    return { data: merged, source: 'ai' };
}

/**
 * @param {Record<string, string> | null} explanation
 * @param {{ source?: string, state?: string }} [options]
 * @returns {string}
 */
export function renderComparisonAiExplanationHtml(explanation, options = {}) {
    if (!explanation) return '';

    const source = options.source || 'rules';
    const state = options.state || 'ready';
    const safe = (value) => escapeHtml(String(value ?? ''));

    const sourceLabel =
        state === 'loading'
            ? 'AI yorumu hazırlanıyor…'
            : source === 'ai'
                ? 'AI destekli açıklama'
                : 'Kural tabanlı açıklama';

    const bullets = [
        { key: 'tco_explanation', label: 'TCO avantajı' },
        { key: 'risk_explanation', label: 'Risk avantajı' },
        { key: 'fit_explanation', label: 'İhtiyaç uyumu' },
        { key: 'balanced_explanation', label: 'Dengeli profil' }
    ];

    return '<aside class="comparison-ai-explanation" data-comparison-ai-commentary data-comparison-ai-state="' + safe(state) + '" data-comparison-ai-source="' + safe(source) + '">' +
        '<header class="comparison-ai-explanation-head">' +
            '<div>' +
                '<h4>AI destekli karar yorumu</h4>' +
                '<p class="comparison-ai-explanation-lead">Bu yorum mevcut skor, TCO ve risk sinyallerini açıklar; nihai karar kullanıcıya aittir.</p>' +
            '</div>' +
            '<span class="comparison-ai-explanation-badge" data-comparison-ai-badge>' + safe(sourceLabel) + '</span>' +
        '</header>' +
        '<p class="comparison-ai-explanation-synthesis" data-comparison-ai-synthesis>' + safe(explanation.synthesis) + '</p>' +
        '<ul class="comparison-ai-explanation-list">' +
            bullets.map((item) =>
                '<li data-comparison-ai-point="' + safe(item.key) + '">' +
                    '<strong>' + safe(item.label) + '</strong>' +
                    '<span>' + safe(explanation[item.key] || '—') + '</span>' +
                '</li>'
            ).join('') +
        '</ul>' +
        '<p class="comparison-ai-explanation-disclaimer">' + safe(explanation.disclaimer || '') + '</p>' +
    '</aside>';
}

/**
 * @param {HTMLElement | null} root
 * @param {Record<string, string>} explanation
 * @param {{ source?: string, state?: string }} [options]
 */
export function hydrateComparisonAiExplanationPanel(root, explanation, options = {}) {
    const panel = root?.querySelector?.('[data-comparison-ai-commentary]');
    if (!panel || !explanation) return;

    const source = options.source || 'rules';
    const state = options.state || 'ready';
    panel.dataset.comparisonAiState = state;
    panel.dataset.comparisonAiSource = source;

    const badge = panel.querySelector('[data-comparison-ai-badge]');
    const synthesis = panel.querySelector('[data-comparison-ai-synthesis]');
    const disclaimer = panel.querySelector('.comparison-ai-explanation-disclaimer');

    if (badge) {
        badge.textContent =
            state === 'loading'
                ? 'AI yorumu hazırlanıyor…'
                : source === 'ai'
                    ? 'AI destekli açıklama'
                    : 'Kural tabanlı açıklama';
    }
    if (synthesis) synthesis.textContent = explanation.synthesis || '';
    if (disclaimer) disclaimer.textContent = explanation.disclaimer || '';

    for (const key of ['tco_explanation', 'risk_explanation', 'fit_explanation', 'balanced_explanation']) {
        const row = panel.querySelector(`[data-comparison-ai-point="${key}"] span`);
        if (row) row.textContent = explanation[key] || '—';
    }
}

/**
 * @param {import('./comparison-decision-summary.js').ComparisonDecisionSummary | null} summary
 * @param {Array} [items]
 * @param {{ skipProxy?: boolean }} [options]
 * @returns {Promise<{ explanation: Record<string, string>, source: 'ai' | 'rules' }>}
 */
export async function fetchComparisonAiExplanation(summary, items = [], options = {}) {
    const deterministic = buildDeterministicComparisonExplanation(summary, items);
    if (!deterministic) {
        return { explanation: {}, source: 'rules' };
    }

    if (options.skipProxy) {
        return { explanation: deterministic, source: 'rules' };
    }

    const { planTier } = getResultsPlanContext();
    const pro = planTier === 'pro';

    if (!hasAiNarrationBudget({ pro })) {
        return { explanation: deterministic, source: 'rules' };
    }
    if (!canCallAiNarration({ pro })) {
        return { explanation: deterministic, source: 'rules' };
    }

    const prompt = buildComparisonExplanationPrompt(summary, items);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXPLANATION_TIMEOUT_MS);

    try {
        const res = await fetch('/ai-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                context: { category: 'comparison-decision-explanation-v1' }
            }),
            signal: controller.signal
        });

        if (!res.ok) {
            return { explanation: deterministic, source: 'rules' };
        }

        const data = await res.json().catch(() => ({}));
        const parsed = parseComparisonExplanation(extractAiProxyText(data));
        const { data: merged, source } = mergeComparisonExplanation(parsed, deterministic);
        return { explanation: merged, source };
    } catch {
        return { explanation: deterministic, source: 'rules' };
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * @param {HTMLElement | null} container
 * @param {import('./comparison-decision-summary.js').ComparisonDecisionSummary | null} summary
 * @param {Array} [items]
 */
export function hydrateComparisonAiExplanation(container, summary, items = []) {
    if (!container || !summary) return;

    const panel = container.querySelector('[data-comparison-ai-commentary]');
    if (!panel) return;

    const deterministic = buildDeterministicComparisonExplanation(summary, items);
    if (!deterministic) return;

    void fetchComparisonAiExplanation(summary, items)
        .then(({ explanation, source }) => {
            if (!container.isConnected) return;
            if (!container.querySelector('[data-comparison-ai-commentary]')) return;
            if (source !== 'ai') return;
            hydrateComparisonAiExplanationPanel(container, explanation, { source, state: 'ready' });
        })
        .catch(() => {
            /* deterministic copy already rendered; keep user flow uninterrupted */
        });
}
