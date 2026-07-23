import type { BusinessAdvisorResult } from '../intelligence/types/advisor-result';
import type { BusinessInsight } from '../intelligence/types/business-insight';
import type { BusinessMetric } from '../intelligence/types/business-metrics';
import type { BusinessRecommendation } from '../intelligence/types/business-recommendation';

export interface BusinessAdvisorPanelProps {
  advisor: BusinessAdvisorResult;
  /** Compact mode for dashboard embed. */
  compact?: boolean;
}

function createMetricChip(metric: BusinessMetric): HTMLElement {
  const chip = document.createElement('article');
  chip.className = 'ib-biz-advisor__metric';
  chip.dataset.metricId = metric.id;
  chip.dataset.direction = metric.direction;

  const label = document.createElement('p');
  label.className = 'ib-biz-advisor__metric-label';
  label.textContent = metric.label;

  const value = document.createElement('p');
  value.className = 'ib-biz-advisor__metric-value';
  value.textContent = metric.value;

  const period = document.createElement('p');
  period.className = 'ib-biz-advisor__metric-period';
  period.textContent = metric.periodLabel;

  chip.append(label, value, period);
  return chip;
}

function createInsightItem(insight: BusinessInsight): HTMLElement {
  const li = document.createElement('li');
  li.className = `ib-biz-advisor__insight ib-biz-advisor__insight--${insight.kind}`;
  li.dataset.insightId = insight.id;
  li.dataset.severity = insight.severity;

  const title = document.createElement('h3');
  title.className = 'ib-biz-advisor__insight-title';
  title.textContent = insight.title;

  const body = document.createElement('p');
  body.className = 'ib-biz-advisor__insight-body';
  body.textContent = insight.body;

  li.append(title, body);
  return li;
}

function createRecommendationItem(rec: BusinessRecommendation): HTMLElement {
  const li = document.createElement('li');
  li.className = 'ib-biz-advisor__rec';
  li.dataset.recommendationId = rec.id;
  li.dataset.priority = rec.priority;

  const message = document.createElement('p');
  message.className = 'ib-biz-advisor__rec-message';
  message.textContent = rec.message;

  const meta = document.createElement('span');
  meta.className = 'ib-biz-advisor__rec-meta';
  meta.textContent = `${rec.title} · ${rec.priority}`;

  li.append(message, meta);
  return li;
}

/**
 * Advisor UI — renders Metrics + Insights + Recommendations from the Intelligence Engine.
 */
export function createBusinessAdvisorPanelElement(
  props: BusinessAdvisorPanelProps
): HTMLElement {
  const { advisor, compact = false } = props;

  const section = document.createElement('section');
  section.className = compact
    ? 'ib-biz-advisor ib-biz-advisor--compact'
    : 'ib-biz-advisor';
  section.setAttribute('aria-labelledby', 'business-advisor-title');
  section.dataset.advisorSource = advisor.source;

  const header = document.createElement('header');
  header.className = 'ib-biz-advisor__header';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'ib-biz-advisor__eyebrow';
  eyebrow.textContent = 'Business Intelligence · Mock';

  const title = document.createElement('h2');
  title.className = 'ib-biz-advisor__title';
  title.id = 'business-advisor-title';
  title.textContent = advisor.headline;

  const summary = document.createElement('p');
  summary.className = 'ib-biz-advisor__summary';
  summary.textContent = advisor.summary;

  header.append(eyebrow, title, summary);

  const metricsGrid = document.createElement('div');
  metricsGrid.className = 'ib-biz-advisor__metrics';
  metricsGrid.setAttribute('aria-label', 'AI metrikleri');
  for (const metric of advisor.metrics.metrics) {
    metricsGrid.appendChild(createMetricChip(metric));
  }

  const body = document.createElement('div');
  body.className = 'ib-biz-advisor__body';

  const insightsPanel = document.createElement('div');
  insightsPanel.className = 'ib-biz-advisor__column';
  const insightsTitle = document.createElement('h3');
  insightsTitle.className = 'ib-biz-advisor__column-title';
  insightsTitle.textContent = 'İçgörüler';
  const insightsList = document.createElement('ul');
  insightsList.className = 'ib-biz-advisor__insights';
  for (const insight of advisor.insights.insights) {
    insightsList.appendChild(createInsightItem(insight));
  }
  insightsPanel.append(insightsTitle, insightsList);

  const recsPanel = document.createElement('div');
  recsPanel.className = 'ib-biz-advisor__column';
  const recsTitle = document.createElement('h3');
  recsTitle.className = 'ib-biz-advisor__column-title';
  recsTitle.textContent = 'AI Önerileri';
  const recsList = document.createElement('ul');
  recsList.className = 'ib-biz-advisor__recs';
  for (const rec of advisor.recommendations.recommendations) {
    recsList.appendChild(createRecommendationItem(rec));
  }
  recsPanel.append(recsTitle, recsList);

  body.append(insightsPanel, recsPanel);
  section.append(header, metricsGrid, body);
  return section;
}

export default createBusinessAdvisorPanelElement;
