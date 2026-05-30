import { revenueManager } from '../features/monetization/revenue-manager.js';
import {
    buildPaywallContextFromApp,
    renderPaywallV1,
    resolvePaywallState
} from '../features/billing/paywall-v1.js';
import { PRO_FEATURE } from '../features/billing/pro-features.js';

export class ComparisonUI {
    renderComparison(items = []) {
        const container = document.getElementById('comparison-content');
        if (!container) return;

        if (!Array.isArray(items) || !items.length) {
            container.innerHTML =
                '<div class="empty-state">' +
                    '<i data-lucide="columns-3"></i>' +
                    '<h3>Karşılaştırma listeniz boş</h3>' +
                    '<p>Auto analiz sonuçlarından veya seçenek kartlarından &quot;Karşılaştır&quot; ile ekleyin. Skor, maliyet ve riskler yan yana okunur.</p>' +
                    '<div class="empty-state-actions">' +
                      '<a href="/auto/" class="btn btn-primary">TCO analizini başlat</a>' +
                      '<a href="/ilanlar/" class="btn btn-outline">Seçeneklere git</a>' +
                    '</div>' +
                '</div>';
            this.loadIcons();
            return;
        }

        const categoryName = items[0]?.categoryName || 'Karşılaştırma';
        const maxValues = {
            price: Math.max(...items.map((item) => Number(item.price || 0)), 1),
            periodicCost: Math.max(...items.map((item) => Number(item.periodicCost || 0)), 1),
            monthlyPayment: Math.max(...items.map((item) => Number(item.monthlyPayment || 0)), 1)
        };

        container.innerHTML =
            '<div class="comparison-toolbar">' +
                '<div>' +
                    '<span class="assistant-kicker">' + this.escapeHtml(categoryName) + '</span>' +
                    '<h3>' + this.escapeHtml(items.length) + ' seçenek yan yana</h3>' +
                    '<p>Fiyat, dönemsel maliyet, kredi yükü, risk ve karar detayları aynı tabloda okunur.</p>' +
                '</div>' +
                '<button type="button" class="btn btn-outline" data-comparison-clear><i data-lucide="trash-2"></i> Temizle</button>' +
                '<button type="button" class="btn btn-outline" data-upsell-trigger="decision_export" data-upsell-placement="compare_export"><i data-lucide="file-down"></i> PDF export</button>' +
            '</div>' +
            '<div class="comparison-grid">' + items.map((item) => this.getComparisonCardMarkup(item, maxValues, items)).join('') + '</div>' +
            this.getComparisonAdvancedSection(items);

        this.loadIcons();
    }

    getComparisonCardMarkup(item, maxValues, allItems = []) {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        const maxScore = Math.max(...allItems.map((i) => Number(i.score || 0)), 0);
        const isLeader = item.score && Number(item.score) >= maxScore && maxScore > 0;

        return '<article class="comparison-card ' + (item.sourceType === 'isteBul Auto' ? 'comparison-card-auto' : '') + '">' +
            (item.image ? '<div class="comparison-vehicle-visual"><img src="' + this.escapeHtml(item.image) + '" alt="' + this.escapeHtml(item.title || 'Araç') + '" loading="lazy"></div>' : '') +
            (isLeader ? '<div class="comparison-leader-badge">🏆 En güçlü eşleşme</div>' : '') +
            '<div class="comparison-card-head">' +
                '<div>' +
                    '<span class="assistant-kicker">' + this.escapeHtml(item.sourceType || 'Seçenek') + '</span>' +
                    '<h4>' + this.escapeHtml(item.title || 'Karşılaştırma seçeneği') + '</h4>' +
                '</div>' +
                '<button type="button" class="icon-btn" title="Karşılaştırmadan çıkar" data-comparison-remove="' + this.escapeHtml(item.id) + '"><i data-lucide="x"></i></button>' +
            '</div>' +
            '<div class="comparison-score-row premium-score-row">' +
                '<strong>' + this.escapeHtml(item.score || '-') + '</strong>' +
                '<span>Kural tabanlı skor</span>' +
                '<em>' + this.escapeHtml(item.confidenceLabel || item.riskLevel || 'Kontrol gerekli') + '</em>' +
            '</div>' +
            this.getComparisonScoreBreakdownMarkup(item.scoreBreakdown) +
            '<div class="comparison-metrics">' +
                '<div><span>Ana bedel</span><strong>' + this.formatPrice(item.price || 0) + '</strong></div>' +
                '<div><span>Dönemsel maliyet</span><strong>' + this.formatPrice(item.periodicCost || 0) + '</strong></div>' +
                '<div><span>Aylık ödeme</span><strong>' + this.formatPrice(item.monthlyPayment || 0) + '</strong></div>' +
            '</div>' +
            this.getCostBreakdownMarkup(item) +
            this.getComparisonGraphMarkup(item, maxValues) +
            (tags.length ? '<div class="comparison-tags">' + tags.map((tag) => '<span>' + this.escapeHtml(tag) + '</span>').join('') + '</div>' : '') +
            (Array.isArray(item.reasons) && item.reasons.length ? 
              '<div class="comparison-breakdown"><div><span>Güçlü taraflar</span><strong>' + this.escapeHtml(item.reasons.slice(0,2).join(' • ')) + '</strong></div></div>' : '') +
            (Array.isArray(item.risks) && item.risks.length ? 
              '<div class="comparison-breakdown"><div><span>Dikkat</span><strong>' + this.escapeHtml(item.risks.slice(0,2).join(' • ')) + '</strong></div></div>' : '') +
            '<p class="comparison-comment">' + this.escapeHtml(item.comment || 'Bu seçenek fiyat, yan maliyet ve finansman etkisiyle değerlendirildi.') + '</p>' +
        '</article>';
    }


    getComparisonScoreBreakdownMarkup(scoreBreakdown = []) {
        const breakdown = Array.isArray(scoreBreakdown) ? scoreBreakdown : [];
        if (!breakdown.length) return '';

        return '<div class="comparison-score-factors">' +
            '<span class="assistant-kicker">Skor faktörleri</span>' +
            '<ul>' + breakdown.slice(0, 4).map((factor) =>
                '<li class="' + (factor.positive ? 'positive' : 'negative') + '">' +
                    '<span>' + this.escapeHtml(factor.label) + '</span>' +
                    '<strong>' + this.escapeHtml(factor.status) + '</strong>' +
                '</li>'
            ).join('') + '</ul>' +
        '</div>';
    }

    getCostBreakdownMarkup(item) {
        const breakdown = item.costBreakdown || {};
        const entries = Object.entries(breakdown)
            .filter(([, value]) => Number(value || 0) > 0)
            .slice(0, 6);

        if (!entries.length) return '';

        const labels = {
            fuelCost: 'Yakıt / enerji',
            kasko: 'Kasko',
            traffic: 'Trafik sigortası',
            maintenance: 'Bakım',
            mtv: 'MTV',
            depreciation: 'Değer kaybı',
            insurance: 'Sigorta',
            propertyTax: 'Emlak vergisi',
            dues: 'Aidat',
            renewal: 'Yenileme',
            reserve: 'Bakım rezervi',
            transport: 'Ulaşım',
            activities: 'Aktiviteler',
            foodExtras: 'Ek harcama'
        };

        return '<div class="comparison-breakdown">' +
            entries.map(([key, value]) =>
                '<div><span>' + this.escapeHtml(labels[key] || key) + '</span><strong>' +
                this.formatPrice(value) + '</strong></div>'
            ).join('') +
        '</div>';
    }

    getComparisonGraphMarkup(item, maxValues) {
        const metrics = [
            { label: 'Fiyat', value: Number(item.price || 0), max: maxValues.price },
            { label: 'Yan maliyet', value: Number(item.periodicCost || 0), max: maxValues.periodicCost },
            { label: 'Aylık kredi', value: Number(item.monthlyPayment || 0), max: maxValues.monthlyPayment }
        ];

        return '<div class="comparison-mini-graph">' + metrics.map((metric) => {
            const percent = Math.max(4, Math.min(100, Math.round((metric.value / Math.max(metric.max, 1)) * 100)));
            return '<div class="comparison-graph-row">' +
                '<span>' + this.escapeHtml(metric.label) + '</span>' +
                '<i><b style="width:' + this.escapeHtml(percent) + '%"></b></i>' +
                '<strong>' + this.formatPrice(metric.value) + '</strong>' +
            '</div>';
        }).join('') + '</div>';
    }

    getComparisonAdvancedSection(items = []) {
        const ctx = buildPaywallContextFromApp();
        const state = resolvePaywallState(ctx);
        if (state === 'pro' || revenueManager.isPremium) {
            return this.getComparisonMatrixMarkup(items);
        }
        if (items.length < 2) {
            return this.getComparisonMatrixMarkup(items);
        }
        return renderPaywallV1({
            feature: PRO_FEATURE.COMPARISON_ADVANCED,
            state,
            compact: true,
            paymentReady: true
        });
    }

    getComparisonMatrixMarkup(items = []) {
        const rows = this.getComparisonMatrixRows(items);
        return '<section class="comparison-matrix">' +
            '<div class="comparison-matrix-head">' +
                '<div>' +
                    '<span class="assistant-kicker">Detay matrisi</span>' +
                    '<h3>Kategoriye özel karar tablosu</h3>' +
                '</div>' +
                '<p>Her sütun seçilen bir seçenek, her satır karar kalemidir.</p>' +
            '</div>' +
            '<div class="comparison-table-wrap">' +
                '<table class="comparison-table">' +
                    '<thead><tr><th>Kriter</th>' + items.map((item) => '<th>' + this.escapeHtml(item.title || 'Seçenek') + '</th>').join('') + '</tr></thead>' +
                    '<tbody>' + rows.map((row) => '<tr><td>' + this.escapeHtml(row.label) + '</td>' + items.map((item) => '<td>' + this.escapeHtml(row.get(item)) + '</td>').join('') + '</tr>').join('') + '</tbody>' +
                '</table>' +
            '</div>' +
        '</section>';
    }

    getComparisonMatrixRows(items = []) {
        const money = (value) => Number(value || 0) > 0 ? this.formatPrice(value) : '-';
        const rows = [
            { label: 'Kaynak', get: (item) => item.sourceType || '-' },
            { label: 'Uyum skoru', get: (item) => item.score ? item.score + '/100' : '-' },
            { label: 'Risk', get: (item) => item.riskLevel || '-' },
            { label: 'Ana bedel', get: (item) => money(item.price) },
            { label: 'Dönemsel maliyet', get: (item) => money(item.periodicCost) },
            { label: 'Aylık ödeme', get: (item) => money(item.monthlyPayment) },
            { label: 'Toplam geri ödeme', get: (item) => money(item.totalPayment) }
        ];

        const detailLabels = [...new Set(items.flatMap((item) => (item.details || []).map((detail) => detail.label)))].slice(0, 6);
        detailLabels.forEach((label) => {
            rows.push({
                label,
                get: (item) => (item.details || []).find((detail) => detail.label === label)?.value || '-'
            });
        });

        const calculationLabels = [...new Set(items.flatMap((item) => (item.calculationRows || []).map((row) => row.label)))].slice(0, 10);
        calculationLabels.forEach((label) => {
            rows.push({
                label,
                get: (item) => {
                    const row = (item.calculationRows || []).find((entry) => entry.label === label);
                    return row ? money(row.value) : '-';
                }
            });
        });

        return rows;
    }

}

let installed = false;

export function installComparisonUI(UIManagerClass) {
    if (installed) return;
    installed = true;

    for (const name of Object.getOwnPropertyNames(ComparisonUI.prototype)) {
        if (name == 'constructor') continue;
        UIManagerClass.prototype[name] = ComparisonUI.prototype[name];
    }
}
