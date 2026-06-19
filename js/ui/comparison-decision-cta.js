/**
 * Decision Center return CTAs for the comparison hub (UX layer only).
 * Completes the journey loop: Karar Merkezi → Seçenekler → Karşılaştırma → Karar Merkezi
 */

export const COMPARISON_DECISION_CTA = Object.freeze({
    primary: {
        href: '/karar-asistani/',
        label: 'Karar analizine devam et'
    },
    secondary: {
        href: '/secenekler/',
        label: 'Daha fazla seçenek incele'
    }
});

/**
 * @param {unknown[]} items
 * @returns {boolean}
 */
export function shouldRenderComparisonDecisionCta(items = []) {
    return Array.isArray(items) && items.length > 0;
}

/**
 * @returns {string}
 */
export function renderComparisonDecisionCtaHtml() {
    const { primary, secondary } = COMPARISON_DECISION_CTA;

    return '<div class="comparison-decision-cta" data-comparison-decision-cta>' +
        '<p class="comparison-decision-cta-lead">Karşılaştırmayı okuduktan sonra karar değerlendirmesine devam edin veya seçenek havuzunu genişletin.</p>' +
        '<div class="comparison-decision-cta-actions">' +
            '<a href="' + primary.href + '" class="btn btn-primary" data-comparison-decision-cta-primary>' +
                primary.label +
            '</a>' +
            '<a href="' + secondary.href + '" class="btn btn-outline" data-comparison-decision-cta-secondary>' +
                secondary.label +
            '</a>' +
        '</div>' +
    '</div>';
}
