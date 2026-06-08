// Lazy-loaded AI assistant UI renderer
// Extracted from UIManager to keep the initial app bundle smaller.

import {
    buildDecisionResultSummary,
    renderDecisionResultSummaryHtml,
    shouldRenderDecisionResultSummary
} from './decision-result-summary.js';
import {
    buildDeterministicDecisionResultRationale,
    hydrateDecisionResultAiRationale,
    renderDecisionResultAiRationaleHtml
} from './decision-result-ai-rationale.js';
import {
    bindDecisionResultShareCard,
    renderDecisionResultShareHtml,
    shouldRenderDecisionResultShare
} from './decision-result-share.js';
import {
    buildDecisionHistorySignalStrip,
    renderDecisionHistorySignalStripHtml
} from './decision-history-signal-strip.js';
import { canAddHistoryEntryToComparison } from './decision-history-comparison.js';
import {
    buildRecentDecisionHistorySnippetModel,
    renderRecentDecisionHistorySnippetHtml
} from './decision-history-recent-snippet.js';
import { normalizeHistoryEntryCategory } from './decision-history-category.js';

export class AssistantUI {
    renderDecisionAssistant(assistantConfig, activeCategory, answers = {}, wizardState = {}) {
        const categoryRail = document.getElementById('assistant-category-rail');
        const progress = document.getElementById('assistant-progress');
        const questionsContainer = document.getElementById('assistant-questions');
        const actionsContainer = document.querySelector('#decision-assistant-form .assistant-actions');
        const resultsContainer = document.getElementById('assistant-results');
        if (!categoryRail || !progress || !questionsContainer || !assistantConfig[activeCategory]) return;

        const categories = Object.entries(assistantConfig);
        const activeConfig = assistantConfig[activeCategory];
        const steps = Array.isArray(wizardState.steps) && wizardState.steps.length ? wizardState.steps : [{
            id: 'questions',
            label: 'Sorular',
            eyebrow: '1. adım',
            description: activeConfig.description,
            questions: activeConfig.questions
        }];
        const stepIndex = Math.max(0, Math.min(Number(wizardState.stepIndex || 0), steps.length - 1));
        const activeStep = steps[stepIndex];
        const visibleQuestionIds = new Set(activeStep.questions.map((question) => question.id));

        categoryRail.innerHTML = categories.map(([categoryId, category]) =>
            '<button type="button" class="assistant-category ' + (categoryId === activeCategory ? 'active' : '') + '" data-assistant-category="' + this.escapeHtml(categoryId) + '">' +
                '<i data-lucide="' + this.escapeHtml(category.icon) + '"></i>' +
                '<span>' + this.escapeHtml(category.name) + '</span>' +
                '<small>' + this.escapeHtml(category.description || 'Karar akışı') + '</small>' +
            '</button>'
        ).join('');

        progress.innerHTML =
            '<div class="assistant-progress-head">' +
                '<div>' +
                    '<span class="assistant-kicker">' + this.escapeHtml(activeConfig.name) + ' karar asistanı</span>' +
                    '<h3>' + this.escapeHtml(activeStep.label) + '</h3>' +
                    '<p>' + this.escapeHtml(activeStep.description || activeConfig.description) + '</p>' +
                '</div>' +
                '<span class="assistant-step-count">' + this.escapeHtml(stepIndex + 1) + '/' + this.escapeHtml(steps.length) + '</span>' +
            '</div>' +
            this.getAssistantWizardTimelineMarkup(steps, stepIndex);

        const hiddenInputs = activeConfig.questions
            .filter((question) => !visibleQuestionIds.has(question.id) && answers[question.id] !== undefined)
            .map((question) => '<input type="hidden" name="' + this.escapeHtml(question.id) + '" value="' + this.escapeHtml(answers[question.id] || '') + '">')
            .join('');

        questionsContainer.innerHTML =
            '<div class="assistant-step-intro">' +
                '<span class="assistant-kicker">' + this.escapeHtml(activeStep.eyebrow || 'Adım') + '</span>' +
                '<h4>' + this.escapeHtml(activeStep.label) + '</h4>' +
                '<p>' + this.escapeHtml(activeStep.description || '') + '</p>' +
            '</div>' +
            hiddenInputs +
            activeStep.questions.map((question, questionIndex) => this.getAssistantQuestionMarkup(question, questionIndex, answers)).join('');

        if (actionsContainer) {
            actionsContainer.innerHTML = this.getAssistantWizardActionsMarkup(stepIndex, steps.length);
        }

        if (resultsContainer && !Object.keys(answers).length) {
            resultsContainer.innerHTML = '';
        }

        this.loadIcons();
    }

    getAssistantWizardTimelineMarkup(steps, activeIndex) {
        const flow = [{ id: 'category', label: 'Kategori', done: true }].concat(steps).concat([{ id: 'result', label: 'Sonuç' }]);
        return '<div class="assistant-wizard-steps">' + flow.map((step, index) => {
            const questionIndex = index - 1;
            const isCategory = index === 0;
            const isResult = index === flow.length - 1;
            const isActive = !isCategory && !isResult && questionIndex === activeIndex;
            const isDone = isCategory || (!isResult && questionIndex < activeIndex);
            const stateClass = isActive ? 'active' : isDone ? 'done' : 'pending';
            return '<div class="assistant-wizard-step ' + stateClass + '">' +
                '<span>' + this.escapeHtml(index + 1) + '</span>' +
                '<strong>' + this.escapeHtml(step.label) + '</strong>' +
            '</div>';
        }).join('') + '</div>';
    }

    getAssistantQuestionMarkup(question, questionIndex, answers = {}) {
        const isChoiceQuestion = !['select', 'number'].includes(question.type);
        const fallbackValue = isChoiceQuestion ? question.options?.[0]?.value : '';
        const selected = answers[question.id] ?? fallbackValue;
        const questionClass = question.type === 'select' ? 'select-question' : question.type === 'number' ? 'number-question' : '';
        const body = question.type === 'select'
            ? this.getSelectQuestionMarkup(question, selected)
            : question.type === 'number'
                ? this.getNumberQuestionMarkup(question, selected)
                : '<div class="assistant-options">' + (Array.isArray(question.options) ? question.options : []).map((option) => {
                    const inputId = 'assistant-' + question.id + '-' + option.value;
                    return '<label class="assistant-option" for="' + this.escapeHtml(inputId) + '">' +
                        '<input type="radio" id="' + this.escapeHtml(inputId) + '" name="' + this.escapeHtml(question.id) + '" value="' + this.escapeHtml(option.value) + '" ' + (selected === option.value ? 'checked' : '') + '>' +
                        '<span>' + this.escapeHtml(option.label) + '</span>' +
                    '</label>';
                }).join('') + '</div>';

        return '<fieldset class="assistant-question ' + questionClass + '">' +
            '<legend><span>' + this.escapeHtml(questionIndex + 1) + '</span>' + this.escapeHtml(question.label) + '</legend>' +
            body +
        '</fieldset>';
    }

    getAssistantWizardActionsMarkup(stepIndex, stepCount) {
        const isFirst = stepIndex <= 0;
        const isLast = stepIndex >= stepCount - 1;
        return (isFirst ? '' : '<button type="button" class="btn btn-outline" data-assistant-prev><i data-lucide="arrow-left"></i> Önceki</button>') +
            '<button type="button" class="btn btn-outline" data-assistant-reset><i data-lucide="rotate-ccw"></i> Temizle</button>' +
            (isLast
                ? '<button type="submit" class="btn btn-primary"><i data-lucide="sparkles"></i> Sonucu hesapla</button>'
                : '<button type="button" class="btn btn-primary" data-assistant-next>Devam et <i data-lucide="arrow-right"></i></button>');
    }


    getNumberQuestionMarkup(question, selected) {
        const placeholder = question.placeholder || 'Tutar yazın';
        const min = Number.isFinite(Number(question.min)) ? question.min : 0;
        const step = Number.isFinite(Number(question.step)) ? question.step : 1000;
        return `
            <div class="assistant-number-field">
                <input class="assistant-select assistant-number-input" type="number" inputmode="numeric" name="${this.escapeHtml(question.id)}" value="${this.escapeHtml(selected || '')}" min="${this.escapeHtml(min)}" step="${this.escapeHtml(step)}" placeholder="${this.escapeHtml(placeholder)}" ${question.required === false ? '' : 'required'}>
                <span>TL</span>
            </div>
        `;
    }
    getSelectQuestionMarkup(question, selected) {
        const placeholder = question.placeholder || 'Seçim yapın';
        const options = Array.isArray(question.options) ? question.options : [];
        return `
            <select class="assistant-select" name="${this.escapeHtml(question.id)}" ${question.required ? 'required' : ''}>
                <option value="">${this.escapeHtml(placeholder)}</option>
                ${options.map((option) => `
                    <option value="${this.escapeHtml(option.value)}" ${selected === option.value ? 'selected' : ''}>${this.escapeHtml(option.label)}</option>
                `).join('')}
            </select>
        `;
    }

    renderDecisionResults(result) {
        const container = document.getElementById('assistant-results');
        if (!container) return;

        const primary = result.recommendations[0];
        if (!primary) {
            container.innerHTML =
                '<div class="empty-state">' +
                    '<i data-lucide="search-x"></i>' +
                    '<h3>Sonuç üretilemedi</h3>' +
                    '<p>Cevaplarınızı değiştirerek tekrar deneyin.</p>' +
                '</div>';
            this.loadIcons();
            return;
        }

        const bestFinance = primary.financeComparisons?.[0];
        const resultSummary = buildDecisionResultSummary(result);
        const deterministicRationale = buildDeterministicDecisionResultRationale(resultSummary);
        const aiRationaleHtml = deterministicRationale
            ? renderDecisionResultAiRationaleHtml(deterministicRationale, { source: 'rules', state: 'ready' })
            : '';
        const resultSummaryHtml = shouldRenderDecisionResultSummary(result)
            ? renderDecisionResultSummaryHtml(
                resultSummary,
                (value) => this.escapeHtml(value),
                aiRationaleHtml
            )
            : '';
        const shareCardHtml = shouldRenderDecisionResultShare(resultSummary)
            ? renderDecisionResultShareHtml((value) => this.escapeHtml(value))
            : '';

        container.innerHTML =
            '<section class="assistant-decision-panel">' +
                '<div class="assistant-result-header assistant-decision-hero">' +
                    '<div>' +
                        '<span class="assistant-kicker">Karar değerlendirme paneli</span>' +
                        '<h3>' + this.escapeHtml(primary.name) + '</h3>' +
                        '<p>' + this.escapeHtml(result.summary) + '</p>' +
                        '<div class="assistant-result-badges">' +
                            '<span><i data-lucide="map-pin"></i>' + this.escapeHtml(result.categoryName) + '</span>' +
                            '<span><i data-lucide="shield-check"></i>Güven skoru ' + this.escapeHtml(primary.score) + '/100</span>' +
                            (result.dataHealth ? '<span title="Girdi kalitesi; kesin sonuç değildir"><i data-lucide="database-zap"></i>Veri güven bandı ' + this.escapeHtml(result.dataHealth.confidenceLabel || '') + '</span>' : '') +
                            '<span><i data-lucide="clock-3"></i>' + this.escapeHtml(this.formatDate(result.createdAt)) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="assistant-score assistant-score-large">' +
                        '<strong>' + this.escapeHtml(primary.score) + '</strong>' +
                        '<span>/100</span>' +
                    '</div>' +
                '</div>' +
                '<div class="assistant-decision-toolbar">' +
                    '<button type="button" class="btn btn-outline" data-assistant-edit="0"><i data-lucide="sliders-horizontal"></i> Kriterleri güncelle</button>' +
                    '<a href="/karsilastir/" class="btn btn-outline btn-sm" data-native-route><i data-lucide="columns-3"></i> Karşılaştırma merkezine git</a>' +
                    '<button type="button" class="btn btn-primary" data-browse-decision-listings><i data-lucide="list-checks"></i> Eşleşen seçenekleri aç</button>' +
                '</div>' +
                resultSummaryHtml +
                shareCardHtml +
                this.getExecutiveMetricsMarkup(result.categoryId, primary, bestFinance) +
                this.getDataHealthMarkup(result.dataHealth) +
                '<div class="assistant-answer-summary">' + result.answers.map((answer) =>
                    '<span><strong>' + this.escapeHtml(answer.label) + ':</strong> ' + this.escapeHtml(answer.value) + '</span>'
                ).join('') + '</div>' +
                this.getDecisionInsightMarkup(result.insight) +
                this.getAIDecisionExtrasMarkup(result) +
                this.getChoiceSummaryMarkup(result.categoryId, result.recommendations) +
                '<div class="assistant-recommendations">' + result.recommendations.map((item, index) =>
                    '<article class="assistant-recommendation ' + (index === 0 ? 'featured' : '') + '">' +
                        this.getRecommendationVerdictMarkup(result.categoryId, item, index, result.recommendations) +
                        '<div class="assistant-recommendation-top">' +
                            '<div>' +
                                '<span class="assistant-rank">' + (index + 1) + '. seçenek</span>' +
                                '<h4>' + this.escapeHtml(item.name) + '</h4>' +
                                '<p>' + this.escapeHtml(item.scoreNote) + '</p>' +
                            '</div>' +
                            '<strong class="assistant-price">' + this.formatPrice(item.price) + '</strong>' +
                        '</div>' +
                        this.getRecommendationHighlightsMarkup(item) +
                        '<div class="assistant-recommendation-actions"><button type="button" class="btn btn-outline" data-compare-recommendation="' + this.escapeHtml(index) + '"><i data-lucide="columns-3"></i> Karşılaştırmaya ekle</button></div>' +
                        this.getRecommendationDetailsMarkup(item.details) +
                        this.getRealisticCommentMarkup(item.realisticComment) +
                        this.getRecommendationSourceTraceMarkup(item.sourceTrace) +
                        this.getScoreBreakdownMarkup(item.scoreBreakdown, item.decisionTags) +
                        this.getCategoryCalculationMarkup(item.calculationTable) +
                        this.getCostChartMarkup(item.costChart) +
                        '<div class="assistant-cost-grid">' +
                            this.getCostMarkup(item.costs) +
                            '<div class="assistant-cost total"><span>' + this.escapeHtml(item.calculationTable?.totalLabel || 'Toplam dönemsel maliyet') + '</span><strong>' + this.formatPrice(item.yearlyCost) + '</strong></div>' +
                        '</div>' +
                        '<div class="assistant-finance"><h5>Banka kredi karşılaştırması</h5>' + this.getFinanceMarkup(item.financeComparisons) + '</div>' +
                        this.getRecommendationActionPlanMarkup(result.categoryId, item) +
                        '<div class="assistant-channels"><h5>Nereden bakabilirsiniz?</h5><div>' + this.getChannelsMarkup(item.channels) + '</div></div>' +
                    '</article>'
                ).join('') + '</div>' +
            '</section>';

        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.loadIcons();
        hydrateDecisionResultAiRationale(container, resultSummary);
        bindDecisionResultShareCard(container, resultSummary);
    }

    getAIDecisionExtrasMarkup(result) {
        if (!result.aiGenerated) return '';

        const disclaimer = '<p class="assistant-ai-disclaimer">Yapay zeka yorumu; skor ve fiyatlar kural motorundan gelir ve LLM tarafından değiştirilmez.</p>';

        const primary = result.recommendations?.[0];
        const pros = primary?.pros || [];
        const cons = primary?.cons || [];
        const risks = result.risks || [];
        const nextSteps = result.nextSteps || [];

        return '<div class="assistant-ai-extras">' + disclaimer +
            (pros.length ? '<div class="assistant-ai-box"><h5>Avantajlar</h5><ul>' + pros.map(item => '<li>' + this.escapeHtml(item) + '</li>').join('') + '</ul></div>' : '') +
            (cons.length ? '<div class="assistant-ai-box"><h5>Dikkat edilmesi gerekenler</h5><ul>' + cons.map(item => '<li>' + this.escapeHtml(item) + '</li>').join('') + '</ul></div>' : '') +
            (risks.length ? '<div class="assistant-ai-box"><h5>Riskler</h5><ul>' + risks.map(item => '<li>' + this.escapeHtml(item) + '</li>').join('') + '</ul></div>' : '') +
            (nextSteps.length ? '<div class="assistant-ai-box"><h5>Sonraki adımlar</h5><ul>' + nextSteps.map(item => '<li>' + this.escapeHtml(item) + '</li>').join('') + '</ul></div>' : '') +
        '</div>';
    }

    getDecisionMetricMarkup(label, value, note, icon) {
        return '<article class="assistant-executive-metric">' +
            '<i data-lucide="' + this.escapeHtml(icon) + '"></i>' +
            '<span>' + this.escapeHtml(label) + '</span>' +
            '<strong>' + this.escapeHtml(value) + '</strong>' +
            '<small>' + this.escapeHtml(note) + '</small>' +
        '</article>';
    }

    getExecutiveMetricsMarkup(categoryId, primary, bestFinance) {
        const totalPayment = bestFinance?.totalPayment || 0;
        const monthlyPayment = bestFinance?.monthlyPayment || 0;
        const labelSets = {
            arac: {
                price: 'Araç bedeli',
                period: 'Yıllık sahip olma',
                periodNote: 'Yakıt/enerji, kasko, sigorta ve bakım',
                monthly: 'En düşük taşıt kredisi',
                total: 'Toplam kredi geri ödeme'
            },
            ev: {
                price: 'Konut alım bedeli',
                period: 'Yıllık konut gideri',
                periodNote: 'Aidat/bakım, sigorta, vergi ve yenileme',
                monthly: 'Konut kredisi taksiti',
                total: 'Toplam kredi geri ödeme'
            },
            tatil: {
                price: 'Tatil paket bütçesi',
                period: 'Seyahat ek gideri',
                periodNote: 'Konaklama, ulaşım, aktivite ve sigorta',
                monthly: 'Tatil finansmanı',
                total: 'Toplam ödeme simülasyonu'
            }
        };
        const labels = labelSets[categoryId] || labelSets.arac;
        return '<div class="assistant-executive-metrics">' +
            this.getDecisionMetricMarkup(labels.price, this.formatPrice(primary.price), 'Seçilen kategoriye özel tahmini ana bedel', 'wallet') +
            this.getDecisionMetricMarkup(labels.period, this.formatPrice(primary.yearlyCost), labels.periodNote, 'calculator') +
            this.getDecisionMetricMarkup(labels.monthly, this.formatPrice(monthlyPayment), bestFinance ? bestFinance.bank + ' simülasyonu' : 'Banka verisi yok', 'landmark') +
            this.getDecisionMetricMarkup(labels.total, this.formatPrice(totalPayment), bestFinance ? bestFinance.term + ' ay vade' : 'Simülasyon bekliyor', 'receipt') +
        '</div>';
    }

    getRecommendationDetailsMarkup(details = []) {
        if (!Array.isArray(details) || !details.length) return '';
        return '<div class="assistant-detail-grid">' + details.map((detail) =>
            '<div class="assistant-detail-item">' +
                '<span>' + this.escapeHtml(detail.label) + '</span>' +
                '<strong>' + this.escapeHtml(detail.value) + '</strong>' +
            '</div>'
        ).join('') + '</div>';
    }

    getRealisticCommentMarkup(comment) {
        if (!comment) return '';
        return '<article class="assistant-realistic-comment">' +
            '<span class="assistant-kicker">Gerçekçi yorum</span>' +
            '<p>' + this.escapeHtml(comment) + '</p>' +
        '</article>';
    }


    getDataHealthMarkup(dataHealth) {
        if (!dataHealth) return '';
        const sources = Array.isArray(dataHealth.sources) ? dataHealth.sources : [];
        return '<section class="assistant-data-health">' +
            '<div class="assistant-data-health-head">' +
                '<div>' +
                    '<span class="assistant-kicker">Veri güven merkezi</span>' +
                    '<h4>' + this.escapeHtml(dataHealth.confidenceLabel || 'Veri güven bandı') + '</h4>' +
                    '<p class="assistant-trust-hint">Metodolojik destek; kesin sonuç veya finansal taahhüt değildir.</p>' +
                    '<p>' + this.escapeHtml(dataHealth.modeLabel || '') + ' · ' + this.escapeHtml(dataHealth.updatedAtLabel || '') + '</p>' +
                '</div>' +
                '<div class="assistant-data-confidence"><strong>' + this.escapeHtml(dataHealth.confidenceScore || '-') + '</strong><span>/100</span></div>' +
            '</div>' +
            '<div class="assistant-data-health-grid">' +
                '<div><span>Hazır kaynak</span><strong>' + this.escapeHtml(dataHealth.readySourceCount || 0) + '/' + this.escapeHtml(dataHealth.sourceCount || 0) + '</strong></div>' +
                '<div><span>Kredi ürünü</span><strong>' + this.escapeHtml(dataHealth.financeProductCount || 0) + '</strong></div>' +
                '<div><span>Hesap kalemi</span><strong>' + this.escapeHtml(dataHealth.calculationCount || 0) + '</strong></div>' +
                '<div><span>Sağlayıcı</span><strong>' + this.escapeHtml(dataHealth.liveProvidersEnabled ? 'Canlı' : 'Hazır') + '</strong></div>' +
            '</div>' +
            (sources.length ? '<div class="assistant-source-list">' + sources.map((source) => this.getSourcePillMarkup(source)).join('') + '</div>' : '') +
            '<p class="assistant-data-note">' + this.escapeHtml(dataHealth.providerNote || '') + '</p>' +
        '</section>';
    }

    getRecommendationSourceTraceMarkup(trace) {
        if (!trace) return '';
        const sources = Array.isArray(trace.sources) ? trace.sources : [];
        return '<section class="assistant-source-trace">' +
            '<div class="assistant-source-trace-head">' +
                '<div><span class="assistant-kicker">Veri izi</span><h5>' + this.escapeHtml(trace.sourceSummary || 'Kaynak özeti') + '</h5></div>' +
                '<small>' + this.escapeHtml(trace.updatedAtLabel || '') + '</small>' +
            '</div>' +
            '<p>' + this.escapeHtml(trace.calculationSummary || '') + '</p>' +
            (sources.length ? '<div class="assistant-source-list compact">' + sources.map((source) => this.getSourcePillMarkup(source)).join('') + '</div>' : '') +
        '</section>';
    }

    getSourcePillMarkup(source) {
        const content = '<span>' + this.escapeHtml(source.type || 'Kaynak') + '</span><strong>' + this.escapeHtml(source.name || 'Veri kaynağı') + '</strong><small>' + this.escapeHtml(source.status || source.cadence || '') + '</small>';
        if (source.url) {
            return '<a class="assistant-source-pill" href="' + this.safeExternalUrl(source.url) + '" target="_blank" rel="noopener noreferrer">' + content + '</a>';
        }
        return '<div class="assistant-source-pill">' + content + '</div>';
    }

    getCategoryCalculationMarkup(table) {
        if (!table || !Array.isArray(table.rows) || !table.rows.length) return '';
        return '<section class="assistant-calculation-table">' +
            '<div class="assistant-calculation-head">' +
                '<div><h5>' + this.escapeHtml(table.title || 'Hesaplama tablosu') + '</h5><p>' + this.escapeHtml(table.note || '') + '</p></div>' +
                '<strong>' + this.formatPrice(table.totalValue || 0) + '</strong>' +
            '</div>' +
            '<div class="assistant-calculation-rows">' + table.rows.map((row) =>
                '<div class="assistant-calculation-row">' +
                    '<div><span>' + this.escapeHtml(row.label) + '</span><small>' + this.escapeHtml(row.note || '') + '</small></div>' +
                    '<strong>' + this.formatPrice(row.value || 0) + '</strong>' +
                '</div>'
            ).join('') + '</div>' +
        '</section>';
    }

    getCostChartMarkup(chart = []) {
        if (!Array.isArray(chart) || !chart.length) return '';
        return '<section class="assistant-cost-chart">' +
            '<div class="assistant-chart-head"><h5>Grafikli maliyet dağılımı</h5><span>Kalemlerin toplam içindeki payı</span></div>' +
            '<div class="assistant-chart-bars">' + chart.map((item) =>
                '<div class="assistant-chart-row">' +
                    '<div><span>' + this.escapeHtml(item.label) + '</span><strong>' + this.formatPrice(item.value || 0) + '</strong></div>' +
                    '<i><b style="width: ' + this.escapeHtml(item.percent || 0) + '%"></b></i>' +
                    '<small>%' + this.escapeHtml(item.percent || 0) + '</small>' +
                '</div>'
            ).join('') + '</div>' +
        '</section>';
    }

    getChoiceSummaryMarkup(categoryId, recommendations = []) {
        const items = Array.isArray(recommendations) ? recommendations.slice(0, 3) : [];
        if (!items.length) return '';

        return '<section class="assistant-choice-summary">' +
            '<div class="assistant-choice-summary-head">' +
                '<div><span class="assistant-kicker">Seçim özeti</span><h4>İlk bakışta karar haritası</h4></div>' +
                '<small>Detaylı maliyet, kredi ve kaynak bilgileri kartların içinde devam eder.</small>' +
            '</div>' +
            '<div class="assistant-choice-grid">' + items.map((item, index) => this.getChoiceSummaryCardMarkup(categoryId, item, index, items)).join('') + '</div>' +
        '</section>';
    }

    getChoiceSummaryCardMarkup(categoryId, item, index, recommendations = []) {
        const verdict = this.getRecommendationVerdict(categoryId, item, index, recommendations);
        return '<article class="assistant-choice-card">' +
            '<span class="assistant-choice-rank">' + this.escapeHtml(index + 1) + '</span>' +
            '<div>' +
                '<strong>' + this.escapeHtml(verdict.label) + '</strong>' +
                '<p>' + this.escapeHtml(item.name || 'Seçenek') + '</p>' +
            '</div>' +
            '<small>' + this.escapeHtml(item.score || '-') + '/100 · ' + this.formatPrice(item.price || 0) + '</small>' +
        '</article>';
    }

    getRecommendationVerdict(categoryId, item = {}, index = 0, recommendations = []) {
        const prices = recommendations.map((entry) => Number(entry.price || 0)).filter((value) => value > 0);
        const costs = recommendations.map((entry) => Number(entry.yearlyCost || 0)).filter((value) => value > 0);
        const minPrice = prices.length ? Math.min(...prices) : 0;
        const minCost = costs.length ? Math.min(...costs) : 0;
        const categoryCopy = {
            arac: {
                primary: 'Araçta en dengeli karar skoru; sahip olma maliyeti ve finansman birlikte güçlü.',
                budget: 'Araç bedeli daha kontrollü; ekspertiz ve toplam sahip olma gideri yine doğrulanmalı.',
                cost: 'Yakıt, kasko, sigorta ve bakım tarafında daha sakin bir senaryo sunar.',
                alternative: 'Kullanım profili değişirse değerlendirilebilecek güçlü alternatif.'
            },
            ev: {
                primary: 'Konut tarafında lokasyon, likidite, yıllık gider ve kredi yükü birlikte dengeli.',
                budget: 'Alım bedeli daha erişilebilir; tapu, deprem ve m2 emsali ayrıca kontrol edilmeli.',
                cost: 'Aidat, bakım, vergi ve sigorta yükü daha kontrollü bir senaryo üretir.',
                alternative: 'Yaşam amacı veya yatırım beklentisi değişirse güçlü alternatif olabilir.'
            },
            tatil: {
                primary: 'Tatil planında bütçe, sezon, ulaşım ve iptal esnekliği en dengeli noktada.',
                budget: 'Paket bedeli daha kontrollü; ulaşım ve ekstra harcamalar son fiyatı belirler.',
                cost: 'Konaklama dışı ulaşım, aktivite ve sigorta yükü daha kontrollü görünür.',
                alternative: 'Tatil tarzı veya tarih değişirse değerlendirilebilecek iyi alternatif.'
            }
        };
        const copy = categoryCopy[categoryId] || categoryCopy.arac;

        if (index === 0) {
            return { icon: 'badge-check', label: 'Önerilen seçim', text: copy.primary };
        }
        if (minPrice && Number(item.price || 0) === minPrice) {
            return { icon: 'wallet-cards', label: 'Bütçe odaklı', text: copy.budget };
        }
        if (minCost && Number(item.yearlyCost || 0) === minCost) {
            return { icon: 'trending-down', label: 'Düşük giderli', text: copy.cost };
        }
        return { icon: 'route', label: 'Alternatif senaryo', text: copy.alternative };
    }

    getRecommendationVerdictMarkup(categoryId, item = {}, index = 0, recommendations = []) {
        const verdict = this.getRecommendationVerdict(categoryId, item, index, recommendations);
        return '<div class="assistant-recommendation-verdict">' +
            '<span><i data-lucide="' + this.escapeHtml(verdict.icon) + '"></i>' + this.escapeHtml(verdict.label) + '</span>' +
            '<p>' + this.escapeHtml(verdict.text) + '</p>' +
        '</div>';
    }

    getRecommendationHighlightsMarkup(item) {
        const bestFinance = item.financeComparisons?.[0];
        return '<div class="assistant-recommendation-highlights">' +
            '<span><strong>' + this.escapeHtml(item.score) + '/100</strong> uygunluk</span>' +
            '<span><strong>' + this.escapeHtml(item.riskLevel || 'Kontrol gerekli') + '</strong> risk</span>' +
            '<span><strong>' + this.formatPrice(item.yearlyCost) + '</strong> dönemsel maliyet</span>' +
            '<span><strong>' + (bestFinance ? this.formatPrice(bestFinance.monthlyPayment) + '/ay' : 'Yok') + '</strong> en iyi kredi</span>' +
        '</div>';
    }

    getScoreBreakdownMarkup(scoreBreakdown = [], tags = []) {
        const breakdown = Array.isArray(scoreBreakdown) ? scoreBreakdown : [];
        const tagMarkup = (Array.isArray(tags) ? tags : []).map((tag) => '<span>' + this.escapeHtml(tag) + '</span>').join('');
        const rows = breakdown.map((item) =>
            '<li class="' + (item.positive ? 'positive' : 'negative') + '">' +
                '<span>' + this.escapeHtml(item.label) + '</span>' +
                '<strong>' + this.escapeHtml(item.status) + ' ' + (item.delta > 0 ? '+' : '') + this.escapeHtml(item.delta) + '</strong>' +
            '</li>'
        ).join('');

        return '<div class="assistant-score-breakdown">' +
            (tagMarkup ? '<div class="assistant-decision-tags">' + tagMarkup + '</div>' : '') +
            '<ul>' + rows + '</ul>' +
        '</div>';
    }


    getDecisionInsightMarkup(insight) {
        if (!insight) return '';

        const listMarkup = (items = []) => items.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('');
        return `
            <article class="assistant-insight">
                <div>
                    <span class="assistant-kicker">Değerlendirme açıklaması</span>
                    <h4>${this.escapeHtml(insight.headline)}</h4>
                </div>
                <div class="assistant-insight-grid">
                    <div>
                        <h5>Neden?</h5>
                        <ul>${listMarkup(insight.reasons)}</ul>
                    </div>
                    <div>
                        <h5>Dikkat</h5>
                        <ul>${listMarkup(insight.cautions)}</ul>
                    </div>
                    <div>
                        <h5>Sonraki adım</h5>
                        <ul>${listMarkup(insight.nextSteps)}</ul>
                    </div>
                </div>
            </article>
        `;
    }

    renderHistoryAuthGate() {
        const container = document.getElementById('history-list');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state history-auth-gate">
                <i data-lucide="lock-keyhole"></i>
                <h3>Geçmiş için giriş yapın</h3>
                <p>Karar, bütçe, konum ve arama geçmişiniz yalnızca hesabınıza bağlı olarak saklanır.</p>
                <div class="history-auth-actions">
                    <button type="button" class="btn btn-primary" data-auth-open="login" data-history-login><i data-lucide="log-in"></i> Hesabına gir</button>
                    <button type="button" class="btn btn-outline" data-auth-open="register" data-history-register aria-label="Analizini kaydet ve devam et"><i data-lucide="user-plus"></i> Analizini kaydet</button>
                </div>
            </div>
        `;
        this.loadIcons();
    }

    renderDecisionHistory(history = []) {
        const doc = globalThis.document;
        if (!doc?.getElementById) return;
        const container = doc.getElementById('history-list');
        if (!container) return;

        if (!history.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="clock"></i>
                    <h3>Geçmiş bulunamadı</h3>
                    <p>Akıllı karar akışını tamamladığınızda sonuçlar burada saklanacak.</p>
                </div>
            `;
            this.loadIcons();
            return;
        }

        container.innerHTML = history.map((item) => {
            const category = normalizeHistoryEntryCategory(item);
            const isAuto = category.isAuto;
            const answers = Array.isArray(item.answers)
                ? item.answers
                : Object.entries(item.answers || {}).map(([label, value]) => ({ label, value }));
            const signalStripHtml = renderDecisionHistorySignalStripHtml(
                buildDecisionHistorySignalStrip(item),
                this.escapeHtml.bind(this)
            );
            const canCompare = canAddHistoryEntryToComparison(item);

            return `
            <article class="decision-history-card ${isAuto ? 'decision-history-card-auto' : ''}">
                <div class="decision-history-main">
                    <div>
                        <span class="assistant-kicker" data-history-category="${this.escapeHtml(category.categoryId)}">${this.escapeHtml(category.categoryName)}</span>
                        <h3>${this.escapeHtml(item.topPick?.name || 'Kaydedilen karar')}</h3>
                        <p>${this.escapeHtml(item.summary || 'Özet bulunamadı.')}</p>
                    </div>
                    <div class="decision-history-score">
                        <strong>${this.escapeHtml(item.score ?? item.topPick?.score ?? '-')}</strong>
                        <span>/100</span>
                    </div>
                </div>
                ${signalStripHtml}
                <div class="decision-history-metrics">
                    <span><strong>${isAuto ? 'Tahmini fiyat' : 'Fiyat'}:</strong> ${this.formatPrice(item.topPick?.price || 0)}</span>
                    <span><strong>${isAuto ? '12 aylık maliyet' : 'Dönemsel maliyet'}:</strong> ${this.formatPrice(item.topPick?.yearlyCost || 0)}</span>
                    <span><strong>${isAuto ? 'Aylık bütçe etkisi' : 'Aylık kredi'}:</strong> ${this.formatPrice(item.topPick?.monthlyPayment || 0)}</span>
                    <span><strong>Tarih:</strong> ${this.formatDate(item.createdAt)}</span>
                </div>
                <div class="decision-history-answers">
                    ${answers.slice(0, 6).map((answer) => `<span>${this.escapeHtml(answer.label)}: ${this.escapeHtml(answer.value)}</span>`).join('')}
                </div>
                <div class="decision-history-actions">
                    <button type="button" class="btn btn-primary" data-decision-repeat="${this.escapeHtml(item.id)}">
                        <i data-lucide="refresh-cw"></i> ${isAuto ? 'Yeni Auto analizi' : 'Tekrar aç'}
                    </button>
                    ${canCompare ? `<button type="button" class="btn btn-outline" data-decision-compare-add="${this.escapeHtml(item.id)}">
                        <i data-lucide="scale"></i> Karşılaştırmaya ekle
                    </button>` : ''}
                    <button type="button" class="btn btn-outline" data-decision-delete="${this.escapeHtml(item.id)}">
                        <i data-lucide="trash-2"></i> Sil
                    </button>
                </div>
                ${canCompare ? `<div class="decision-history-actions-links">
                    <a href="/karsilastir/" class="decision-history-compare-link" data-native-route>Karşılaştırma merkezine git</a>
                </div>` : ''}
            </article>
        `}).join('');

        this.loadIcons();
    }

    renderRecentDecisionHistorySnippet(history = []) {
        const doc = globalThis.document;
        if (!doc?.getElementById) return;
        const host = doc.getElementById('decision-history-recent-snippet-host');
        if (!host) return;

        const html = renderRecentDecisionHistorySnippetHtml(
            buildRecentDecisionHistorySnippetModel(history),
            this.escapeHtml.bind(this),
            this.formatDate.bind(this)
        );
        host.innerHTML = html;
        if (html) this.loadIcons();
    }

    getCostMarkup(costs = []) {
        return costs.map((cost) => `
            <div class="assistant-cost">
                <span>${this.escapeHtml(cost.label)}</span>
                <strong>${this.formatPrice(cost.value)}</strong>
            </div>
        `).join('');
    }

    getFinanceMarkup(financeComparisons = []) {
        return `
            <div class="assistant-finance-table">
                ${financeComparisons.map((finance) => `
                    <div class="assistant-finance-row">
                        <span>${this.escapeHtml(finance.bank)}</span>
                        <strong>${this.formatPrice(finance.monthlyPayment)}/ay</strong>
                        <small>${this.escapeHtml(finance.term)} ay, %${this.escapeHtml(finance.rate)} aylık, kredi ${this.formatPrice(finance.principal)}</small>
                    </div>
                `).join('')}
            </div>
        `;
    }


    getRecommendationActionPlanMarkup(categoryId, item = {}) {
        const firstChannel = item.channels?.[0]?.url || 'https://www.sahibinden.com/';
        const plans = {
            arac: [
                { icon: 'search-check', title: 'Seçeneği doğrula', text: 'KM, tramer, fiyat ve satıcı bilgisini aynı model ilanlarla karşılaştırın.', url: firstChannel },
                { icon: 'landmark', title: 'Krediyi netleştir', text: 'Aylık taksit yerine toplam geri ödeme ve kredi kullandırım oranını kontrol edin.', url: 'https://www.hangikredi.com/kredi/tasit-kredisi' },
                { icon: 'shield-check', title: 'Sigorta + ekspertiz', text: 'Kasko, trafik sigortası ve ekspertiz sonucu olmadan kapora göndermeyin.', url: 'https://www.sigortam.net/' }
            ],
            ev: [
                { icon: 'map-pinned', title: 'Benzer seçenek analizi', text: 'Aynı il/ilçede m2, bina yaşı, aidat ve ulaşım etkisini yan yana okuyun.', url: firstChannel },
                { icon: 'landmark', title: 'Konut kredisi', text: 'Ekspertiz değeri, peşinat ihtiyacı ve toplam geri ödeme planını netleştirin.', url: 'https://www.hangikredi.com/kredi/konut-kredisi' },
                { icon: 'file-check-2', title: 'Tapu + deprem kontrolü', text: 'Tapu, imar, DASK, deprem performansı ve aidat borcunu satın alma öncesi doğrulayın.', url: 'https://www.tkgm.gov.tr/' }
            ],
            tatil: [
                { icon: 'calendar-check', title: 'Rezervasyon koşulu', text: 'Sezon, oda tipi, çocuk/ek kişi ücreti ve iptal şartını paket fiyatına dahil edin.', url: firstChannel },
                { icon: 'plane-takeoff', title: 'Ulaşımı karşılaştır', text: 'Uçuş saati, bagaj, transfer ve araç kiralama maliyetini ayrı görün.', url: 'https://www.enuygun.com/' },
                { icon: 'shield', title: 'Seyahat güveni', text: 'Sigorta, esnek tarih ve erken rezervasyon farkını son karar öncesi kontrol edin.', url: 'https://www.etstur.com/' }
            ]
        };
        const actions = plans[categoryId] || plans.arac;
        return '<section class="assistant-action-plan">' +
            '<div class="assistant-action-plan-head"><span class="assistant-kicker">Satın alma aksiyonları</span><h5>Kararı uygulamaya geçir</h5></div>' +
            '<div class="assistant-action-plan-grid">' + actions.map((action) =>
                '<a href="' + this.safeExternalUrl(action.url) + '" target="_blank" rel="noopener noreferrer" class="assistant-action-step">' +
                    '<i data-lucide="' + this.escapeHtml(action.icon) + '"></i>' +
                    '<strong>' + this.escapeHtml(action.title) + '</strong>' +
                    '<span>' + this.escapeHtml(action.text) + '</span>' +
                '</a>'
            ).join('') + '</div>' +
        '</section>';
    }

    getChannelsMarkup(channels = []) {
        return channels.map((channel) => `
            <a href="${this.safeExternalUrl(channel.url)}" target="_blank" rel="noopener noreferrer" class="assistant-channel">
                <i data-lucide="external-link"></i>
                ${this.escapeHtml(channel.label)}
            </a>
        `).join('');
    }

    setActiveCategory(categoryId, categories = []) {
        const doc = globalThis.document;
        if (!doc?.getElementById) return;
        const label = doc.getElementById('active-category-label');
        const category = categories.find((item) => item.id === categoryId);

        doc.querySelectorAll('[data-category]').forEach((element) => {
            element.classList.toggle('active', !!categoryId && element.dataset.category === categoryId);
        });

        if (label) {
            label.textContent = category ? `${category.name} seçenekleri` : 'Öne çıkan seçenekler';
        }
    }

    getCategoryVisualIcon(categoryId, fallbackIcon = "tag") {
        const visualIcons = {
            arac: "car-front",
            ev: "house",
            tatil: "plane-takeoff"
        };

        return visualIcons[categoryId] || fallbackIcon;
    }

    getCategoryCardMarkup(category, activeCategory = null) {
        if (category.comingSoon) {
            return `
            <div class="category-card category-card-${this.escapeHtml(category.id)} is-coming-soon" aria-disabled="true">
                <span class="category-visual category-visual-${this.escapeHtml(category.id)}" aria-hidden="true">
                    <i data-lucide="${this.escapeHtml(this.getCategoryVisualIcon(category.id, category.icon))}"></i>
                </span>
                <h3>${this.escapeHtml(category.name)}</h3>
                <span class="category-count">Yakında</span>
            </div>`;
        }

        return `
            <button type="button" class="category-card category-card-${this.escapeHtml(category.id)} ${category.id === activeCategory ? "active" : ""}" data-assistant-start="${this.escapeHtml(category.id)}">
                <span class="category-visual category-visual-${this.escapeHtml(category.id)}" aria-hidden="true">
                    <i data-lucide="${this.escapeHtml(this.getCategoryVisualIcon(category.id, category.icon))}"></i>
                </span>
                <h3>${this.escapeHtml(category.name)}</h3>
                <span class="category-count">${category.id === 'arac' ? 'Karar analizi' : this.escapeHtml(category.count || 0) + ' seçenek'}</span>
            </button>
        `;
    }

    getCategoryButtonMarkup(category, activeCategory = null) {
        return `
            <button type="button" class="category-card category-card-${this.escapeHtml(category.id)} ${category.id === activeCategory ? "active" : ""}" data-assistant-start="${this.escapeHtml(category.id)}">
                <span class="category-visual category-visual-${this.escapeHtml(category.id)}" aria-hidden="true">
                    <i data-lucide="${this.escapeHtml(this.getCategoryVisualIcon(category.id, category.icon))}"></i>
                </span>
                <span>${this.escapeHtml(category.name)}</span>
            </button>
        `;
    }

}

const installedClasses = new WeakSet();

export function installAssistantUI(UIManagerClass) {
    if (!UIManagerClass || installedClasses.has(UIManagerClass)) return;
    installedClasses.add(UIManagerClass);

    for (const name of Object.getOwnPropertyNames(AssistantUI.prototype)) {
        if (name === 'constructor') continue;
        UIManagerClass.prototype[name] = AssistantUI.prototype[name];
    }
}


