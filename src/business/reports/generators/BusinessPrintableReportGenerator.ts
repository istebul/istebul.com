import type {
  BusinessReportInput
} from '../models/BusinessReportInput';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value: string | Date): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('tr-TR', {
    dateStyle: 'long',
    timeStyle: 'short'
  });
}

function formatKpiValue(
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

function createSectionId(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createBoardSummary(
  input: BusinessReportInput
): string[] {
  const { analysis, executiveReport } = input;

  const criticalCount = analysis.insights.filter(
    (item) => item.severity === 'critical'
  ).length;

  const warningCount = analysis.insights.filter(
    (item) => item.severity === 'warning'
  ).length;

  const actionPlanCount =
    executiveReport?.actionPlan.summary.actionPlanCount ?? 0;

  const stepCount =
    executiveReport?.actionPlan.summary.stepCount ?? 0;

  return [
    `İşletme sağlık skoru ${analysis.score}/100 seviyesindedir.`,
    `${analysis.kpis.length} temel performans göstergesi incelenmiştir.`,
    `${criticalCount} kritik ve ${warningCount} uyarı seviyesinde konu belirlenmiştir.`,
    `${actionPlanCount} yönetici aksiyon planında toplam ${stepCount} uygulanabilir adım oluşturulmuştur.`
  ];
}

function createExecutiveSectionsHtml(
  input: BusinessReportInput
): string {
  return (
    input.executiveReport?.sections
      .map((section, index) => {
        const id = createSectionId(section.title);

        return `
          <section
            id="${escapeHtml(id)}"
            class="report-section ${
              index > 0 ? 'report-section--breakable' : ''
            }"
          >
            <div class="section-heading">
              <span>${String(index + 1).padStart(2, '0')}</span>
              <h2>${escapeHtml(section.title)}</h2>
            </div>

            <ul class="executive-list">
              ${section.content
                .map(
                  (item) =>
                    `<li>${escapeHtml(item)}</li>`
                )
                .join('')}
            </ul>
          </section>
        `;
      })
      .join('') ?? ''
  );
}

function createContentsHtml(
  input: BusinessReportInput
): string {
  const sections =
    input.executiveReport?.sections ?? [];

  return sections
    .map(
      (section, index) => `
        <li>
          <a href="#${escapeHtml(
            createSectionId(section.title)
          )}">
            <span>${String(index + 1).padStart(2, '0')}</span>
            ${escapeHtml(section.title)}
          </a>
        </li>
      `
    )
    .join('');
}

function benchmarkLevelLabel(
  value: string
): string {
  if (value === 'strong') return 'Güçlü';
  if (value === 'weak') return 'Geliştirme alanı';
  if (value === 'average') return 'Referansa yakın';
  return 'Veri yok';
}

function forecastDirectionLabel(
  value: string
): string {
  if (value === 'up') return 'Yükseliş';
  if (value === 'down') return 'Düşüş';
  return 'Stabil';
}

function forecastConfidenceLabel(
  value: string
): string {
  if (value === 'high') return 'Yüksek';
  if (value === 'medium') return 'Orta';
  return 'Düşük';
}

function createBenchmarkRows(
  input: BusinessReportInput
): string {
  const items = input.benchmark?.kpis ?? [];

  if (items.length === 0) {
    return `
      <tr>
        <td colspan="6">
          Benchmark değerlendirmesi için
          karşılaştırılabilir KPI bulunamadı.
        </td>
      </tr>
    `;
  }

  return items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.label)}</td>
          <td>${escapeHtml(
            formatKpiValue(item.value, item.unit)
          )}</td>
          <td>${escapeHtml(
            formatKpiValue(
              item.referenceMedian,
              item.unit
            )
          )}</td>
          <td>${item.percentile}. persentil</td>
          <td>${escapeHtml(
            benchmarkLevelLabel(item.level)
          )}</td>
          <td>${escapeHtml(item.statusLabel)}</td>
        </tr>
      `
    )
    .join('');
}

function createForecastRows(
  input: BusinessReportInput
): string {
  const forecasts =
    input.forecast?.forecasts ?? [];

  if (forecasts.length === 0) {
    return `
      <tr>
        <td colspan="7">
          Tahmin üretmek için aynı KPI kimliğine sahip
          en az üç dönem analizi gerekir.
        </td>
      </tr>
    `;
  }

  return forecasts
    .map((forecast) => {
      const projection30 =
        forecast.projections.find(
          (item) => item.horizonDays === 30
        );

      const projection90 =
        forecast.projections.find(
          (item) => item.horizonDays === 90
        );

      const projection365 =
        forecast.projections.find(
          (item) => item.horizonDays === 365
        );

      return `
        <tr>
          <td>${escapeHtml(forecast.label)}</td>
          <td>${escapeHtml(
            formatKpiValue(
              forecast.currentValue,
              forecast.unit
            )
          )}</td>
          <td>${escapeHtml(
            formatKpiValue(
              projection30?.projectedValue ?? 0,
              forecast.unit
            )
          )}</td>
          <td>${escapeHtml(
            formatKpiValue(
              projection90?.projectedValue ?? 0,
              forecast.unit
            )
          )}</td>
          <td>${escapeHtml(
            formatKpiValue(
              projection365?.projectedValue ?? 0,
              forecast.unit
            )
          )}</td>
          <td>${escapeHtml(
            forecastDirectionLabel(
              forecast.direction
            )
          )}</td>
          <td>${escapeHtml(
            forecastConfidenceLabel(
              forecast.confidence
            )
          )}</td>
        </tr>
      `;
    })
    .join('');
}

function createActionPlanRows(
  input: BusinessReportInput
): string {
  const plans =
    input.executiveReport?.actionPlan.actionPlans ?? [];

  if (plans.length === 0) {
    return `
      <tr>
        <td colspan="5">
          Yapılandırılmış aksiyon planı bulunamadı.
        </td>
      </tr>
    `;
  }

  return plans
    .map(
      (plan) => `
        <tr>
          <td>${escapeHtml(plan.title)}</td>
          <td>${escapeHtml(plan.priority)}</td>
          <td>${plan.estimatedImpact}/100</td>
          <td>${plan.estimatedEffort}/100</td>
          <td>${plan.steps.length}</td>
        </tr>
      `
    )
    .join('');
}

export function createPrintableBusinessReportHtml(
  input: BusinessReportInput
): string {
  const { analysis, executiveReport } = input;

  const kpiRows = analysis.kpis
    .map(
      (kpi) => `
        <tr>
          <td>${escapeHtml(kpi.label)}</td>
          <td>${escapeHtml(
            formatKpiValue(kpi.value, kpi.unit)
          )}</td>
          <td>${escapeHtml(kpi.unit ?? '—')}</td>
        </tr>
      `
    )
    .join('');

  const boardSummaryItems = createBoardSummary(input)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

  const contentsItems = createContentsHtml(input);
  const executiveSectionHtml =
    createExecutiveSectionsHtml(input);

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >
  <title>${escapeHtml(
    input.businessName
  )} — İSTEBUL Business Yönetici Raporu</title>

  <style>
    :root {
      font-family:
        Inter, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif;
      color: #162033;
      background: #eef3f9;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #eef3f9;
    }

    .report {
      width: min(1040px, calc(100% - 32px));
      margin: 24px auto;
      background: #ffffff;
      box-shadow: 0 18px 55px rgba(22, 32, 51, 0.12);
    }

    .cover {
      min-height: 760px;
      padding: 58px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #ffffff;
      background:
        radial-gradient(
          circle at 88% 12%,
          rgba(76, 139, 255, 0.42),
          transparent 32%
        ),
        linear-gradient(145deg, #0d1b35, #123f86);
    }

    .cover__brand {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
    }

    .cover__brand strong {
      font-size: 26px;
    }

    .cover__badge {
      padding: 8px 14px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .cover__content {
      max-width: 720px;
    }

    .cover__eyebrow {
      margin: 0 0 18px;
      color: #aecdff;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .cover h1 {
      margin: 0;
      font-size: 54px;
      line-height: 1.08;
    }

    .cover__subtitle {
      margin: 22px 0 0;
      font-size: 21px;
      line-height: 1.6;
      color: #dce8ff;
    }

    .cover__meta {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
    }

    .cover__meta article {
      padding: 18px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.08);
    }

    .cover__meta span {
      display: block;
      margin-bottom: 8px;
      color: #aecdff;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .report-body {
      padding: 48px;
    }

    .report-section {
      margin-top: 46px;
    }

    .section-heading {
      display: flex;
      align-items: center;
      gap: 14px;
      padding-bottom: 14px;
      border-bottom: 2px solid #e8edf5;
    }

    .section-heading span {
      color: #135df5;
      font-size: 13px;
      font-weight: 900;
    }

    h2 {
      margin: 0;
      font-size: 25px;
    }

    .board-summary {
      padding: 26px;
      border-radius: 20px;
      background: #f2f6fc;
      border: 1px solid #dfe7f3;
    }

    .score-grid {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(170px, 1fr));
      gap: 14px;
      margin-top: 24px;
    }

    .score-card {
      padding: 20px;
      border: 1px solid #e3e9f2;
      border-radius: 16px;
      background: #ffffff;
    }

    .score-card span {
      display: block;
      margin-bottom: 8px;
      color: #637083;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .score-card strong {
      color: #135df5;
      font-size: 30px;
    }

    .contents {
      list-style: none;
      margin: 20px 0 0;
      padding: 0;
    }

    .contents li {
      border-bottom: 1px solid #e3e9f2;
    }

    .contents a {
      display: flex;
      gap: 16px;
      padding: 13px 0;
      color: #162033;
      text-decoration: none;
    }

    .contents a span {
      color: #135df5;
      font-weight: 900;
    }

    table {
      width: 100%;
      margin-top: 18px;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 13px 14px;
      border-bottom: 1px solid #e3e9f2;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #f2f6fc;
      font-size: 12px;
      text-transform: uppercase;
    }

    .report-note {
      margin-top: 16px;
      padding: 13px 15px;
      border: 1px solid #dce7f7;
      border-radius: 12px;
      background: #eef4ff;
      color: #536176;
      font-size: 12px;
      line-height: 1.6;
    }

    .executive-list {
      margin: 20px 0 0;
      padding-left: 22px;
    }

    .executive-list li {
      margin-bottom: 14px;
      line-height: 1.65;
    }

    footer {
      margin-top: 56px;
      padding: 22px 0 4px;
      border-top: 1px solid #e3e9f2;
      color: #637083;
      font-size: 11px;
      line-height: 1.6;
    }

    @page {
      size: A4;
      margin: 15mm;
    }

    @media print {
      body {
        background: #ffffff;
      }

      .report {
        width: 100%;
        margin: 0;
        box-shadow: none;
      }

      .cover {
        min-height: 267mm;
        break-after: page;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .report-body {
        padding: 0;
      }

      .contents-section {
        break-after: page;
      }

      .report-section {
        break-inside: avoid;
      }

      .report-section--breakable {
        break-before: auto;
      }

      table,
      .board-summary,
      .score-grid {
        break-inside: avoid;
      }

      a {
        color: inherit;
      }
    }

    @media (max-width: 720px) {
      .cover,
      .report-body {
        padding: 28px;
      }

      .cover h1 {
        font-size: 38px;
      }
    }
  </style>
</head>

<body>
  <main class="report">
    <section class="cover">
      <header class="cover__brand">
        <strong>İSTEBUL Business</strong>
        <span class="cover__badge">
          Kurumsal Yönetici Raporu
        </span>
      </header>

      <div class="cover__content">
        <p class="cover__eyebrow">
          Yönetim Kurulu ve Üst Yönetim
        </p>

        <h1>${escapeHtml(input.businessName)}</h1>

        <p class="cover__subtitle">
          ${escapeHtml(
            executiveReport?.title ??
              'İşletme Performans ve Karar Destek Raporu'
          )}
        </p>
      </div>

      <div class="cover__meta">
        <article>
          <span>Analiz türü</span>
          <strong>${escapeHtml(
            analysis.analysisType
          )}</strong>
        </article>

        <article>
          <span>Kategori</span>
          <strong>${escapeHtml(analysis.category)}</strong>
        </article>

        <article>
          <span>Rapor tarihi</span>
          <strong>${escapeHtml(
            formatDate(
              executiveReport?.generatedAt ??
                analysis.createdAt
            )
          )}</strong>
        </article>
      </div>
    </section>

    <div class="report-body">
      <section class="report-section">
        <div class="section-heading">
          <span>00</span>
          <h2>Yönetim Kurulu Özeti</h2>
        </div>

        <div class="board-summary">
          <p>${escapeHtml(analysis.summary)}</p>
          <ul>${boardSummaryItems}</ul>
        </div>

        <div class="score-grid">
          <article class="score-card">
            <span>Sağlık skoru</span>
            <strong>${analysis.score}/100</strong>
          </article>

          <article class="score-card">
            <span>KPI</span>
            <strong>${analysis.kpis.length}</strong>
          </article>

          <article class="score-card">
            <span>İçgörü</span>
            <strong>${analysis.insights.length}</strong>
          </article>

          <article class="score-card">
            <span>Aksiyon planı</span>
            <strong>${
              executiveReport?.actionPlan.summary
                .actionPlanCount ?? 0
            }</strong>
          </article>
        </div>
      </section>

      <section class="report-section contents-section">
        <div class="section-heading">
          <span>İÇ</span>
          <h2>İçindekiler</h2>
        </div>

        <ol class="contents">
          ${contentsItems}
        </ol>
      </section>

      <section class="report-section">
        <div class="section-heading">
          <span>KPI</span>
          <h2>Temel Performans Göstergeleri</h2>
        </div>

        <table>
          <thead>
            <tr>
              <th>Gösterge</th>
              <th>Değer</th>
              <th>Birim</th>
            </tr>
          </thead>
          <tbody>${kpiRows}</tbody>
        </table>
      </section>

      <section class="report-section">
        <div class="section-heading">
          <span>BM</span>
          <h2>Benchmark Değerlendirmesi</h2>
        </div>

        <p>
          ${escapeHtml(
            input.benchmark?.summary ??
              'Benchmark değerlendirmesi bulunamadı.'
          )}
        </p>

        <table>
          <thead>
            <tr>
              <th>Gösterge</th>
              <th>Güncel</th>
              <th>Referans Medyan</th>
              <th>Persentil</th>
              <th>Seviye</th>
              <th>Değerlendirme</th>
            </tr>
          </thead>
          <tbody>
            ${createBenchmarkRows(input)}
          </tbody>
        </table>

        ${
          input.benchmark?.disclosure
            ? `
              <p class="report-note">
                ${escapeHtml(
                  input.benchmark.disclosure
                )}
              </p>
            `
            : ''
        }
      </section>

      <section class="report-section">
        <div class="section-heading">
          <span>FC</span>
          <h2>30 / 90 / 365 Günlük Projeksiyon</h2>
        </div>

        <p>
          ${escapeHtml(
            input.forecast?.summary ??
              'Tahmin sonucu bulunamadı.'
          )}
        </p>

        <table>
          <thead>
            <tr>
              <th>KPI</th>
              <th>Güncel</th>
              <th>30 Gün</th>
              <th>90 Gün</th>
              <th>365 Gün</th>
              <th>Yön</th>
              <th>Güven</th>
            </tr>
          </thead>
          <tbody>
            ${createForecastRows(input)}
          </tbody>
        </table>

        ${
          input.forecast?.disclosure
            ? `
              <p class="report-note">
                ${escapeHtml(
                  input.forecast.disclosure
                )}
              </p>
            `
            : ''
        }
      </section>

      <section class="report-section">
        <div class="section-heading">
          <span>AP</span>
          <h2>Aksiyon Planı Özeti</h2>
        </div>

        <table>
          <thead>
            <tr>
              <th>Aksiyon planı</th>
              <th>Öncelik</th>
              <th>Etki</th>
              <th>Efor</th>
              <th>Adım</th>
            </tr>
          </thead>
          <tbody>${createActionPlanRows(input)}</tbody>
        </table>
      </section>

      ${executiveSectionHtml}

      <footer>
        Bu rapor İSTEBUL Business tarafından mevcut işletme
        verileri üzerinden otomatik olarak hazırlanmıştır.
        Karar destek amaçlıdır; mali müşavirlik, hukuk,
        bağımsız denetim veya yatırım danışmanlığı raporu
        niteliğinde değildir.
      </footer>
    </div>
  </main>
</body>
</html>`;
}

export function openPrintableBusinessReport(
  input: BusinessReportInput
): void {
  const html =
    createPrintableBusinessReportHtml(input);

  const blob = new Blob([html], {
    type: 'text/html;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const reportWindow = window.open(url, '_blank');

  if (!reportWindow) {
    URL.revokeObjectURL(url);

    throw new Error(
      'Rapor penceresi açılamadı. Açılır pencere izni verin.'
    );
  }

  reportWindow.opener = null;

  window.setTimeout(() => {
    reportWindow.focus();
    reportWindow.print();
  }, 700);

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
}
