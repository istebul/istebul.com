import type {
  BusinessAlert,
  BusinessAlertResult,
  BusinessScenarioResult
} from '../document-intelligence';

export interface BusinessAlertScenarioPanelProps {
  alerts?: BusinessAlertResult;
  scenarios?: readonly {
    id: string;
    title: string;
    description: string;
    result: BusinessScenarioResult;
  }[];
}

function severityLabel(
  severity: BusinessAlert['severity']
): string {
  if (severity === 'critical') return 'Kritik';
  if (severity === 'warning') return 'Uyarı';
  if (severity === 'success') return 'Olumlu';
  return 'Bilgi';
}

function formatTry(value: number): string {
  return `${value.toLocaleString('tr-TR', {
    maximumFractionDigits: 2
  })} ₺`;
}

function formatPercent(value: number): string {
  return `%${value.toLocaleString('tr-TR', {
    maximumFractionDigits: 2
  })}`;
}

function createCounter(
  labelText: string,
  valueText: string,
  severity: string
): HTMLElement {
  const article = document.createElement('article');
  article.className = 'ib-biz-alert-counter';
  article.dataset.severity = severity;

  const value = document.createElement('strong');
  value.textContent = valueText;

  const label = document.createElement('span');
  label.textContent = labelText;

  article.append(value, label);
  return article;
}

function createAlertCard(
  alert: BusinessAlert
): HTMLElement {
  const article = document.createElement('article');
  article.className = 'ib-biz-alert-card';
  article.dataset.severity = alert.severity;

  const header = document.createElement('header');

  const badge = document.createElement('span');
  badge.textContent = severityLabel(alert.severity);

  const title = document.createElement('strong');
  title.textContent = alert.title;

  header.append(badge, title);

  const description = document.createElement('p');
  description.textContent = alert.description;

  const recommendation = document.createElement('small');
  recommendation.textContent =
    `Öneri: ${alert.recommendation}`;

  article.append(
    header,
    description,
    recommendation
  );

  return article;
}

function createScenarioCard(
  scenario: NonNullable<
    BusinessAlertScenarioPanelProps['scenarios']
  >[number]
): HTMLElement {
  const article = document.createElement('article');
  article.className = 'ib-biz-scenario-card';

  const title = document.createElement('h3');
  title.textContent = scenario.title;

  const description = document.createElement('p');
  description.textContent = scenario.description;

  const metrics = document.createElement('div');
  metrics.className = 'ib-biz-scenario-card__metrics';

  const metricValues = [
    [
      'Tahmini ciro',
      formatTry(scenario.result.projected.revenue)
    ],
    [
      'Tahmini maliyet',
      formatTry(scenario.result.projected.totalCost)
    ],
    [
      'Tahmini brüt kâr',
      formatTry(scenario.result.projected.grossProfit)
    ],
    [
      'Tahmini marj',
      formatPercent(
        scenario.result.projected.profitMargin
      )
    ]
  ];

  for (const [labelText, valueText] of metricValues) {
    const metric = document.createElement('div');

    const label = document.createElement('span');
    label.textContent = labelText;

    const value = document.createElement('strong');
    value.textContent = valueText;

    metric.append(label, value);
    metrics.appendChild(metric);
  }

  const summary = document.createElement('p');
  summary.className = 'ib-biz-scenario-card__summary';
  summary.textContent = scenario.result.summary;

  const risk = scenario.result.risks[0];

  const riskText = document.createElement('small');
  riskText.className = 'ib-biz-scenario-card__risk';
  riskText.dataset.severity = risk?.severity ?? 'info';
  riskText.textContent = risk
    ? `${risk.title}: ${risk.description}`
    : 'Senaryo riski bulunamadı.';

  article.append(
    title,
    description,
    metrics,
    summary,
    riskText
  );

  return article;
}

export function createBusinessAlertScenarioPanelElement(
  props: BusinessAlertScenarioPanelProps
): HTMLElement {
  const root = document.createElement('section');
  root.className = 'ib-biz-alert-scenario-panel';
  root.setAttribute(
    'aria-labelledby',
    'business-alert-scenario-title'
  );

  const heading = document.createElement('div');
  heading.className =
    'ib-biz-alert-scenario-panel__heading';

  const titleWrap = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.textContent = 'Yönetici erken uyarı sistemi';

  const title = document.createElement('h2');
  title.id = 'business-alert-scenario-title';
  title.textContent =
    'CEO Alarm Merkezi ve Senaryo Simülasyonu';

  titleWrap.append(eyebrow, title);

  const status = document.createElement('span');
  status.textContent =
    props.alerts?.summary.highestSeverity === 'critical'
      ? 'Acil aksiyon gerekli'
      : props.alerts?.summary.highestSeverity === 'warning'
        ? 'Yakın takip gerekli'
        : 'Kontrollü görünüm';

  heading.append(titleWrap, status);
  root.appendChild(heading);

  if (props.alerts) {
    const summary = document.createElement('p');
    summary.className =
      'ib-biz-alert-scenario-panel__summary';
    summary.textContent =
      props.alerts.executiveSummary;

    const counters = document.createElement('div');
    counters.className = 'ib-biz-alert-counters';

    counters.append(
      createCounter(
        'Kritik',
        String(props.alerts.summary.criticalCount),
        'critical'
      ),
      createCounter(
        'Uyarı',
        String(props.alerts.summary.warningCount),
        'warning'
      ),
      createCounter(
        'Bilgi',
        String(props.alerts.summary.infoCount),
        'info'
      ),
      createCounter(
        'Olumlu',
        String(props.alerts.summary.successCount),
        'success'
      )
    );

    const alerts = document.createElement('div');
    alerts.className = 'ib-biz-alert-grid';

    for (const alert of props.alerts.alerts.slice(0, 6)) {
      alerts.appendChild(createAlertCard(alert));
    }

    root.append(summary, counters, alerts);
  }

  if ((props.scenarios?.length ?? 0) > 0) {
    const scenarioTitle = document.createElement('h3');
    scenarioTitle.className =
      'ib-biz-alert-scenario-panel__scenario-title';
    scenarioTitle.textContent = 'Hazır Yönetici Senaryoları';

    const scenarioGrid = document.createElement('div');
    scenarioGrid.className = 'ib-biz-scenario-grid';

    for (const scenario of props.scenarios ?? []) {
      scenarioGrid.appendChild(
        createScenarioCard(scenario)
      );
    }

    root.append(scenarioTitle, scenarioGrid);

    const disclosure = document.createElement('small');
    disclosure.className =
      'ib-biz-alert-scenario-panel__disclosure';
    disclosure.textContent =
      props.scenarios?.[0]?.result.disclosure ?? '';

    root.appendChild(disclosure);
  }

  return root;
}

export default createBusinessAlertScenarioPanelElement;
