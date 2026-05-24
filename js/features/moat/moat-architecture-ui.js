/**
 * P3.6 Moat architecture — product + admin rendering.
 */

import { escapeHtml } from '../../core/security.js';
import {
  MOAT_LAYERS,
  computeMoatLayerHealth,
  computeDefensibilityIndex,
  assessCompetitorCopyBundle,
  mergeFlywheelMetrics
} from './moat-architecture-shared.js';
import { computeMoatDashboard } from './moat-intelligence-shared.js';
import {
  aggregateOutcomeSignalCounts,
  mergeMoatOutcomeSignals
} from './outcome-capture-shared.js';

const MATURITY_LABELS = {
  nascent: 'Başlangıç',
  building: 'Oluşuyor',
  active: 'Aktif',
  compounding: 'Bileşik'
};

const RESISTANCE_LABELS = {
  high: 'Yüksek kopya direnci',
  medium: 'Orta kopya direnci'
};

export function buildMoatMetricsFromAdminData(leads = [], feedback = [], signals = [], extra = {}) {
  const dash = computeMoatDashboard(leads, feedback, signals);
  const signalAgg = aggregateOutcomeSignalCounts(signals);
  const merged = mergeMoatOutcomeSignals(dash, signalAgg);

  const productFeedbackTotal = extra.productFeedbackTotal ?? 0;
  const productFeedbackUseful = extra.productFeedbackUseful ?? 0;

  return mergeFlywheelMetrics(merged, {
    productFeedbackTotal,
    productFeedbackUseful,
    confidenceAccuracySignals:
      extra.confidenceAccuracySignals ??
      (merged.outcomeSignalByType?.confidence_accuracy || 0),
    lifecycleEnrollments: extra.lifecycleEnrollments ?? 0,
    lifecycleMessagesSent: extra.lifecycleMessagesSent ?? 0,
    referralAttributions: extra.referralAttributions ?? 0,
    referralCodes: extra.referralCodes ?? 0,
    activePartnerEndpoints: extra.activePartnerEndpoints ?? 0,
    partnerApplications: extra.partnerApplications ?? 0
  });
}

export function renderMoatArchitectureAdminStrip(metrics = {}) {
  const layers = computeMoatLayerHealth(metrics);
  const index = computeDefensibilityIndex(layers);
  const copy = assessCompetitorCopyBundle(layers);

  const layerRows = layers
    .map(
      (layer) => `
    <tr>
      <td><code>${escapeHtml(layer.id)}</code></td>
      <td>${escapeHtml(layer.productLabel)}</td>
      <td><span class="moat-maturity moat-maturity--${layer.maturity}">${MATURITY_LABELS[layer.maturity] || layer.maturity}</span></td>
      <td><strong>${layer.score}</strong>/100</td>
      <td>${RESISTANCE_LABELS[layer.copyResistance] || layer.copyResistance}</td>
      <td class="text-muted-sm">${escapeHtml(layer.copyTimeLabel)}</td>
    </tr>`
    )
    .join('');

  return `
    <div class="moat-architecture-strip" data-moat-architecture>
      <div class="partner-ops-stat">
        <div class="partner-ops-stat-label">Defensibility index</div>
        <div class="partner-ops-stat-value">${index}</div>
        <div class="partner-ops-stat-sub">P3.6 · ${MOAT_LAYERS.length} katman</div>
      </div>
      <div class="partner-ops-stat">
        <div class="partner-ops-stat-label">Yüksek direnç katman</div>
        <div class="partner-ops-stat-value">${copy.highResistanceCount}</div>
        <div class="partner-ops-stat-sub">${escapeHtml(copy.estimatedCopyEffort)}</div>
      </div>
      <div class="partner-ops-stat" style="grid-column:span 2;">
        <div class="partner-ops-stat-label">Rakip kopya tezi</div>
        <div class="partner-ops-stat-sub" style="font-size:13px;margin-top:6px;">${escapeHtml(copy.headline)}</div>
      </div>
      <details class="moat-architecture-details" style="grid-column:1/-1;">
        <summary>Moat katman matrisi (kod + veri + ürün)</summary>
        <table class="table" style="margin-top:10px;">
          <thead>
            <tr>
              <th>ID</th>
              <th>Ürün</th>
              <th>Olgunluk</th>
              <th>Skor</th>
              <th>Direnç</th>
              <th>Kopya süresi</th>
            </tr>
          </thead>
          <tbody>${layerRows}</tbody>
        </table>
        <div class="moat-copy-path-grid">
          ${copy.layers
            .filter((l) => l.copyResistance === 'high')
            .slice(0, 4)
            .map(
              (l) => `
            <div class="moat-copy-path-card">
              <strong>${escapeHtml(l.id)}</strong>
              <p>${escapeHtml(l.competitorPath)}</p>
            </div>`
            )
            .join('')}
        </div>
      </details>
    </div>`;
}

export function renderMoatArchitectureProductSection(metrics = {}) {
  const layers = computeMoatLayerHealth(metrics);
  const index = computeDefensibilityIndex(layers);
  const copy = assessCompetitorCopyBundle(layers);

  return `
    <section class="ib-moat-architecture" aria-labelledby="moat-arch-heading">
      <p class="kicker">Long-term defensibility · P3.6</p>
      <h2 id="moat-arch-heading">Moat mimarisi — rakip nasıl kopyalar?</h2>
      <p class="lead">
        Tek özellik değil, <strong>sekiz katmanlı flywheel</strong>.
        Chat arayüzü veya ilan listesi haftalar içinde kopyalanır;
        skor + partner operasyonu + anonim outcome graph <strong>12–24 ay operasyonel borç</strong> gerektirir.
      </p>

      <div class="ib-moat-defensibility-hero">
        <div>
          <span class="ib-moat-index-label">Defensibility index</span>
          <strong class="ib-moat-index-value">${index}</strong>
          <span class="text-muted-sm">/100 · operasyonel metriklerden (dürüst, erken aşama düşük olabilir)</span>
        </div>
        <p>${escapeHtml(copy.headline)}</p>
      </div>

      <div class="ib-moat-layer-grid">
        ${layers
          .map(
            (layer) => `
          <article class="ib-moat-layer-card ib-moat-layer-card--${layer.maturity}">
            <header>
              <h3>${escapeHtml(layer.productLabel)}</h3>
              <span class="ib-moat-layer-score">${layer.score}</span>
            </header>
            <p>${escapeHtml(layer.description)}</p>
            <footer>
              <span class="ib-moat-resistance ib-moat-resistance--${layer.copyResistance}">${RESISTANCE_LABELS[layer.copyResistance]}</span>
              <span class="text-muted-sm">${escapeHtml(layer.copyTimeLabel)}</span>
            </footer>
          </article>`
          )
          .join('')}
      </div>

      <details class="ib-moat-flywheel-diagram">
        <summary>Flywheel (mimari)</summary>
        <pre class="ib-moat-ascii" aria-label="Moat flywheel diagram">
Talep → Deterministik skor + TCO
           ↓
    Partner OS (skorlu lead)
           ↓
    Outcome graph (anonim)
           ↓
    Segment kalibrasyon + güven evrimi
           ↓
    Lifecycle + referral → daha fazla talep
        </pre>
      </details>
    </section>`;
}

export function renderMoatFlywheelMermaid() {
  return `\`\`\`mermaid
flowchart LR
  subgraph decision [Decision IP]
    D[Proprietary logic]
    C[Confidence evolution]
  end
  subgraph data [Anonymized data]
    O[Outcome feedback]
    R[Recommendation intelligence]
  end
  subgraph b2b [B2B network]
    P[Partner conversion]
    N[Network effects]
  end
  subgraph growth [Growth loop]
    L[Lifecycle intelligence]
    F[Referral graph]
  end
  D --> O --> P --> D
  R --> C
  P --> N
  L --> D
  F --> L
\`\`\``;
}
