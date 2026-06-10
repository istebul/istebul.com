/**
 * AI Decision Rationale Layer for Karar Merkezi result screen.
 * Explains deterministic Decision Result Summary only — never produces new scores/TCO/risk/fit.
 */

import { escapeHtml } from '../core/security.js';
import { sanitizeAiNarrative } from '../engines/decision-consultant.js';
import { extractAiProxyText } from '../features/ai/ai-insight-engine.js';
import { canCallAiNarration, hasAiNarrationBudget } from '../core/scale-limits.js';
import { getResultsPlanContext } from '../features/billing/paywall-v1.js';

export const DECISION_RESULT_RATIONALE_KEYS = Object.freeze([
    'fit_explanation',
    'risk_explanation',
    'tco_explanation',
    'profile_explanation',
    'synthesis',
    'disclaimer'
]);

export const DECISION_RESULT_PRESCRIPTIVE_PHRASES = Object.freeze([
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

const RATIONALE_TIMEOUT_MS = 8000;

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsPrescriptiveRationalePhrase(text) {
    const normalized = String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
    return DECISION_RESULT_PRESCRIPTIVE_PHRASES.some((phrase) => normalized.includes(phrase));
}

/**
 * @param {string} text
 * @param {number} [maxLen]
 * @returns {string}
 */
export function sanitizeDecisionResultRationaleText(text, maxLen = 720) {
    let out = sanitizeAiNarrative(String(text || ''), maxLen);
    for (const phrase of DECISION_RESULT_PRESCRIPTIVE_PHRASES) {
        const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        out = out.replace(re, '').trim();
    }
    return out.replace(/\s{2,}/g, ' ').trim();
}

/**
 * @param {Record<string, { label?: string, value?: string, detail?: string }> | null} summary
 * @returns {Record<string, string> | null}
 */
export function buildDeterministicDecisionResultRationale(summary) {
    if (!summary) return null;

    const fit = summary.fit || {};
    const risk = summary.risk || {};
    const tco = summary.tco || {};
    const profile = summary.profile || {};

    const fitValue = fit.value || '—';
    const riskValue = risk.value || '—';
    const tcoValue = tco.value || '—';
    const profileValue = profile.value || '—';

    return {
        fit_explanation:
            `Uygunluk özeti ${fitValue} olarak okunuyor. ${fit.detail || 'Skor mevcut sonuçtan türetilir.'} ` +
            'Uygunluk skoru profil eşleştirmesini özetler; kişisel öncelikler nihai tercihi belirler.',
        risk_explanation:
            `Risk özeti ${riskValue} bandında görünüyor. ${risk.detail || 'Risk etiketi kural tabanlıdır.'} ` +
            'Operasyonel ve piyasa belirsizlikleri ayrı değerlendirilmelidir.',
        tco_explanation:
            `TCO özeti ${tcoValue} düzeyinde okunur (${tco.detail || 'dönemsel maliyet'}). ` +
            'Bu okuma dönemsel maliyet alanından türetilir; teklif ve vergi kalemleri ayrı doğrulanmalıdır.',
        profile_explanation:
            `Karar profili "${profileValue}" olarak özetleniyor. ${profile.detail || 'Profil girdileri mevcut cevaplardan türetilir.'}`,
        synthesis:
            `Ön değerlendirme özeti mevcut uygunluk (${fitValue}), risk (${riskValue}), TCO (${tcoValue}) ve profil sinyallerinden okunur.`,
        disclaimer:
            'Bu gerekçe ön değerlendirme ve karar desteği amaçlıdır; bağlayıcı satın alma veya finansman taahhüdü değildir. Tam analiz ilgili kategori akışında tamamlanır.'
    };
}

/**
 * @param {Record<string, { label?: string, value?: string, detail?: string }> | null} summary
 * @returns {string}
 */
export function buildDecisionResultRationalePrompt(summary) {
    const ctx = {
        signals: {
            fit: {
                label: summary?.fit?.label || 'Uygunluk özeti',
                value: summary?.fit?.value || null,
                detail: summary?.fit?.detail || null
            },
            risk: {
                label: summary?.risk?.label || 'Risk özeti',
                value: summary?.risk?.value || null,
                detail: summary?.risk?.detail || null
            },
            tco: {
                label: summary?.tco?.label || 'TCO özeti',
                value: summary?.tco?.value || null,
                detail: summary?.tco?.detail || null
            },
            profile: {
                label: summary?.profile?.label || 'Karar profili özeti',
                value: summary?.profile?.value || null,
                detail: summary?.profile?.detail || null
            }
        }
    };

    return [
        'Görev: Ön değerlendirme özeti için YALNIZCA geçerli JSON üret (başka metin yok).',
        'Dil: Türkçe, profesyonel, açıklayıcı; pazarlama abartısı yok.',
        'YASAK: yeni skor, TCO, risk veya uygunluk üretmek; "seçmelisiniz", "en doğru karar", "kesinlikle bunu alın", "tek doğru seçenek", "sizin için en iyi karar" gibi emir kipi.',
        'İZİNLİ: verilen özet sinyallerini açıklamak, skor/risk/TCO/uygunluk farklarını yorumlamak.',
        'Skor, TCO ve risk değerleri kural tabanlıdır — değiştirme iddiası yok.',
        'Anahtarlar: ' + DECISION_RESULT_RATIONALE_KEYS.join(', '),
        'Bağlam (JSON): ' + JSON.stringify(ctx)
    ].join('\n');
}

/**
 * @param {string} raw
 * @returns {Record<string, string> | null}
 */
export function parseDecisionResultRationale(raw) {
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
    for (const key of DECISION_RESULT_RATIONALE_KEYS) {
        const rawValue = String(parsed[key] || '');
        if (!rawValue || containsPrescriptiveRationalePhrase(rawValue)) return null;
        const value = sanitizeDecisionResultRationaleText(rawValue, key === 'synthesis' ? 520 : 360);
        if (!value || containsPrescriptiveRationalePhrase(value)) return null;
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
export function mergeDecisionResultRationale(ai, deterministic) {
    const base = deterministic || {};
    if (!ai) return { data: base, source: 'rules' };

    const merged = { ...base };
    for (const key of DECISION_RESULT_RATIONALE_KEYS) {
        if (ai[key]) merged[key] = ai[key];
    }
    return { data: merged, source: 'ai' };
}

/**
 * @param {Record<string, string> | null} rationale
 * @param {{ source?: string, state?: string }} [options]
 * @returns {string}
 */
export function renderDecisionResultAiRationaleHtml(rationale, options = {}) {
    if (!rationale) return '';

    const source = options.source || 'rules';
    const state = options.state || 'ready';
    const safe = (value) => escapeHtml(String(value ?? ''));

    const sourceLabel =
        state === 'loading'
            ? 'AI gerekçesi hazırlanıyor…'
            : source === 'ai'
                ? 'AI destekli gerekçe'
                : 'Kural tabanlı gerekçe';

    const bullets = [
        { key: 'fit_explanation', label: 'Uygunluk özeti' },
        { key: 'risk_explanation', label: 'Risk özeti' },
        { key: 'tco_explanation', label: 'TCO özeti' },
        { key: 'profile_explanation', label: 'Karar profili özeti' }
    ];

    return '<aside class="decision-result-ai-rationale" data-decision-result-ai-rationale data-decision-ai-state="' + safe(state) + '" data-decision-ai-source="' + safe(source) + '">' +
        '<header class="decision-result-ai-rationale-head">' +
            '<div>' +
                '<h4>AI destekli karar gerekçesi</h4>' +
                '<p class="decision-result-ai-rationale-lead">Bu gerekçe ön değerlendirmedeki skor, risk, TCO ve uygunluk sinyallerini açıklar; tam analiz ilgili kategori akışında tamamlanır.</p>' +
            '</div>' +
            '<span class="decision-result-ai-rationale-badge" data-decision-ai-badge>' + safe(sourceLabel) + '</span>' +
        '</header>' +
        '<p class="decision-result-ai-rationale-synthesis" data-decision-ai-synthesis>' + safe(rationale.synthesis) + '</p>' +
        '<ul class="decision-result-ai-rationale-list">' +
            bullets.map((item) =>
                '<li data-decision-ai-point="' + safe(item.key) + '">' +
                    '<strong>' + safe(item.label) + '</strong>' +
                    '<span>' + safe(rationale[item.key] || '—') + '</span>' +
                '</li>'
            ).join('') +
        '</ul>' +
        '<p class="decision-result-ai-rationale-disclaimer">' + safe(rationale.disclaimer || '') + '</p>' +
    '</aside>';
}

/**
 * @param {HTMLElement | null} root
 * @param {Record<string, string>} rationale
 * @param {{ source?: string, state?: string }} [options]
 */
export function hydrateDecisionResultAiRationalePanel(root, rationale, options = {}) {
    const panel = root?.querySelector?.('[data-decision-result-ai-rationale]');
    if (!panel || !rationale) return;

    const source = options.source || 'rules';
    const state = options.state || 'ready';
    panel.dataset.decisionAiState = state;
    panel.dataset.decisionAiSource = source;

    const badge = panel.querySelector('[data-decision-ai-badge]');
    const synthesis = panel.querySelector('[data-decision-ai-synthesis]');
    const disclaimer = panel.querySelector('.decision-result-ai-rationale-disclaimer');

    if (badge) {
        badge.textContent =
            state === 'loading'
                ? 'AI gerekçesi hazırlanıyor…'
                : source === 'ai'
                    ? 'AI destekli gerekçe'
                    : 'Kural tabanlı gerekçe';
    }
    if (synthesis) synthesis.textContent = rationale.synthesis || '';
    if (disclaimer) disclaimer.textContent = rationale.disclaimer || '';

    for (const key of ['fit_explanation', 'risk_explanation', 'tco_explanation', 'profile_explanation']) {
        const row = panel.querySelector(`[data-decision-ai-point="${key}"] span`);
        if (row) row.textContent = rationale[key] || '—';
    }
}

/**
 * @param {Record<string, { label?: string, value?: string, detail?: string }> | null} summary
 * @param {{ skipProxy?: boolean }} [options]
 * @returns {Promise<{ rationale: Record<string, string>, source: 'ai' | 'rules' }>}
 */
export async function fetchDecisionResultAiRationale(summary, options = {}) {
    const deterministic = buildDeterministicDecisionResultRationale(summary);
    if (!deterministic) {
        return { rationale: {}, source: 'rules' };
    }

    if (options.skipProxy) {
        return { rationale: deterministic, source: 'rules' };
    }

    const { planTier } = getResultsPlanContext();
    const pro = planTier === 'pro';

    if (!hasAiNarrationBudget({ pro })) {
        return { rationale: deterministic, source: 'rules' };
    }
    if (!canCallAiNarration({ pro })) {
        return { rationale: deterministic, source: 'rules' };
    }

    const prompt = buildDecisionResultRationalePrompt(summary);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RATIONALE_TIMEOUT_MS);

    try {
        const res = await fetch('/ai-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                context: { category: 'decision-result-rationale-v1' }
            }),
            signal: controller.signal
        });

        if (!res.ok) {
            return { rationale: deterministic, source: 'rules' };
        }

        const data = await res.json().catch(() => ({}));
        const parsed = parseDecisionResultRationale(extractAiProxyText(data));
        const { data: merged, source } = mergeDecisionResultRationale(parsed, deterministic);
        return { rationale: merged, source };
    } catch {
        return { rationale: deterministic, source: 'rules' };
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * @param {HTMLElement | null} container
 * @param {Record<string, { label?: string, value?: string, detail?: string }> | null} summary
 */
export function hydrateDecisionResultAiRationale(container, summary) {
    if (!container || !summary) return;

    const panel = container.querySelector('[data-decision-result-ai-rationale]');
    if (!panel) return;

    const deterministic = buildDeterministicDecisionResultRationale(summary);
    if (!deterministic) return;

    void fetchDecisionResultAiRationale(summary)
        .then(({ rationale, source }) => {
            if (!container.isConnected) return;
            if (!container.querySelector('[data-decision-result-ai-rationale]')) return;
            if (source !== 'ai') return;
            hydrateDecisionResultAiRationalePanel(container, rationale, { source, state: 'ready' });
        })
        .catch(() => {
            /* deterministic copy already rendered; keep user flow uninterrupted */
        });
}
