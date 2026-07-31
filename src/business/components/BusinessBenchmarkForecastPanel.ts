import type {
  BusinessBenchmarkResult,
  BusinessForecastResult,
  BusinessKpiForecast
} from '../document-intelligence';

export interface BusinessBenchmarkForecastPanelProps {
  benchmark?: BusinessBenchmarkResult;
  forecast?: BusinessForecastResult;
}

function formatValue(
  value: number,
  unit?: string
): string {
  const formatted = value.toLocaleString('tr-TR', {
    maximumFractionDigits: 2
  });

  if (unit === 'TRY') return `${formatted} ₺`;
  if (unit === '%') return `%${formatted}`;
  if (unit) return `${formatted} ${unit}`;

  return formatted;
}

function confidenceLabel(
  confidence: BusinessKpiForecast['confidence']
): string {
  if (confidence === 'high') return 'Yüksek güven';
  if (confidence === 'medium') return 'Orta güven';
  return 'Düşük güven';
}

function directionLabel(
  forecast: BusinessKpiForecast
): string {
  if (forecast.direction === 'up') {
    return 'Yükseliş eğilimi';
  }

  if (forecast.direction === 'down') {
    return 'Düşüş eğilimi';
  }

  return 'Stabil eğilim';
}

function createMetric(
  labelText: string,
  valueText: string,
  detailText?: string
): HTMLElement {
  const article = document.createElement('article');
  article.className =
    'ib-biz-intelligence-panel__metric';

  const label = document.createElement('span');
  label.className =
    'ib-biz-intelligence-panel__metric-label';
  label.textContent = labelText;

  const value = document.createElement('strong');
  value.className =
    'ib-biz-intelligence-panel__metric-value';
  value.textContent = valueText;

  article.append(label, value);

  if (detailText) {
    const detail = document.createElement('small');
    detail.className =
      'ib-biz-intelligence-panel__metric-detail';
    detail.textContent = detailText;
    article.appendChild(detail);
  }

  return article;
}

function createForecastCard(
  forecast: BusinessKpiForecast
): HTMLElement {
  const article = document.createElement('article');
  article.className = 'ib-biz-forecast-card';
  article.dataset.direction = forecast.direction;
  article.dataset.confidence = forecast.confidence;

  const header = document.createElement('div');
  header.className = 'ib-biz-forecast-card__header';

  const title = document.createElement('strong');
  title.textContent = forecast.label;

  const badge = document.createElement('span');
  badge.textContent = confidenceLabel(
    forecast.confidence
  );

  header.append(title, badge);

  const current = document.createElement('p');
  current.className = 'ib-biz-forecast-card__current';
  current.textContent =
    `Güncel: ${formatValue(
      forecast.currentValue,
      forecast.unit
    )}`;

  const direction = document.createElement('p');
  direction.className =
    'ib-biz-forecast-card__direction';
  direction.textContent =
    `${directionLabel(forecast)} · ` +
    `${forecast.dataPointCount} veri noktası`;

  const projections = document.createElement('div');
  projections.className =
    'ib-biz-forecast-card__projections';

  for (const projection of forecast.projections) {
    projections.appendChild(
      createMetric(
        `${projection.horizonDays} gün`,
        formatValue(
          projection.projectedValue,
          forecast.unit
        ),
        projection.percentageChange === null
          ? 'Başlangıç değeri sıfır'
          : `%${projection.percentageChange >= 0 ? '+' : ''}` +
            projection.percentageChange.toLocaleString(
              'tr-TR',
              {
                maximumFractionDigits: 2
              }
            )
      )
    );
  }

  article.append(
    header,
    current,
    direction,
    projections
  );

  return article;
}

function createBenchmarkSection(
  benchmark: BusinessBenchmarkResult
): HTMLElement {
  const section = document.createElement('section');
  section.className =
    'ib-biz-intelligence-panel__benchmark';

  const title = document.createElement('h3');
  title.textContent = 'Benchmark Değerlendirmesi';

  const summary = document.createElement('p');
  summary.textContent = benchmark.summary;

  const grid = document.createElement('div');
  grid.className =
    'ib-biz-intelligence-panel__metrics';

  grid.append(
    createMetric(
      'Sağlık persentili',
      `${benchmark.score.percentile}. persentil`,
      benchmark.score.statusLabel
    ),
    createMetric(
      'En güçlü alan',
      benchmark.strongest?.label ?? '—',
      benchmark.strongest
        ? `${benchmark.strongest.percentile}. persentil`
        : 'Karşılaştırılabilir veri yok'
    ),
    createMetric(
      'En büyük performans boşluğu',
      benchmark.weakest?.label ?? '—',
      benchmark.weakest
        ? `${benchmark.weakest.percentile}. persentil`
        : 'Karşılaştırılabilir veri yok'
    )
  );

  const disclosure = document.createElement('small');
  disclosure.className =
    'ib-biz-intelligence-panel__disclosure';
  disclosure.textContent = benchmark.disclosure;

  section.append(title, summary, grid, disclosure);
  return section;
}

function createForecastSection(
  forecast: BusinessForecastResult
): HTMLElement {
  const section = document.createElement('section');
  section.className =
    'ib-biz-intelligence-panel__forecast';

  const title = document.createElement('h3');
  title.textContent = '30 / 90 / 365 Günlük Projeksiyon';

  const summary = document.createElement('p');
  summary.textContent = forecast.summary;

  if (!forecast.hasForecastData) {
    const empty = document.createElement('div');
    empty.className =
      'ib-biz-intelligence-panel__empty';
    empty.textContent =
      'Tahmin oluşturmak için en az üç dönem analizi gerekir.';

    section.append(title, summary, empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'ib-biz-forecast-grid';

  for (const item of forecast.forecasts) {
    grid.appendChild(createForecastCard(item));
  }

  const disclosure = document.createElement('small');
  disclosure.className =
    'ib-biz-intelligence-panel__disclosure';
  disclosure.textContent = forecast.disclosure;

  section.append(title, summary, grid, disclosure);
  return section;
}

export function createBusinessBenchmarkForecastPanelElement(
  props: BusinessBenchmarkForecastPanelProps
): HTMLElement {
  const root = document.createElement('section');
  root.className = 'ib-biz-intelligence-panel';
  root.setAttribute(
    'aria-labelledby',
    'business-intelligence-panel-title'
  );

  const header = document.createElement('header');
  header.className =
    'ib-biz-intelligence-panel__header';

  const headingWrap = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className =
    'ib-biz-intelligence-panel__eyebrow';
  eyebrow.textContent = 'Karar zekâsı';

  const title = document.createElement('h2');
  title.id = 'business-intelligence-panel-title';
  title.textContent =
    'Benchmark ve Gelecek Projeksiyonu';

  headingWrap.append(eyebrow, title);

  const status = document.createElement('span');
  status.className =
    'ib-biz-intelligence-panel__status';
  status.textContent =
    props.forecast?.hasForecastData
      ? 'Tahmin hazır'
      : 'Geçmiş veri bekleniyor';

  header.append(headingWrap, status);
  root.appendChild(header);

  if (props.benchmark) {
    root.appendChild(
      createBenchmarkSection(props.benchmark)
    );
  }

  if (props.forecast) {
    root.appendChild(
      createForecastSection(props.forecast)
    );
  }

  return root;
}

export default
  createBusinessBenchmarkForecastPanelElement;
