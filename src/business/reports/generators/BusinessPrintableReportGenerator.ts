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

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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

function createReportHtml(
  input: BusinessReportInput
): string {
  const { analysis } = input;

  const kpiRows = analysis.kpis
    .map(
      (kpi) => `
        <tr>
          <td>${escapeHtml(kpi.label)}</td>
          <td>${escapeHtml(
            formatKpiValue(kpi.value, kpi.unit)
          )}</td>
        </tr>
      `
    )
    .join('');

  const insightItems = analysis.insights
    .map(
      (insight) => `
        <li>
          <strong>${escapeHtml(insight.title)}</strong>
          <p>${escapeHtml(insight.description)}</p>
        </li>
      `
    )
    .join('');

  const recommendationItems = analysis.recommendations
    .map(
      (recommendation, index) => `
        <li>
          <strong>${index + 1}.</strong>
          ${escapeHtml(recommendation)}
        </li>
      `
    )
    .join('');

  const executiveSectionHtml =
    input.executiveReport?.sections
      .map(
        (section) => `
          <section>
            <h2>${escapeHtml(section.title)}</h2>
            <ul>
              ${section.content
                .map(
                  (item) =>
                    `<li>${escapeHtml(item)}</li>`
                )
                .join('')}
            </ul>
          </section>
        `
      )
      .join('') ?? '';

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >
  <title>İSTEBUL Business Yönetici Raporu</title>
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
      width: min(960px, calc(100% - 32px));
      margin: 24px auto;
      padding: 48px;
      background: #ffffff;
      border-radius: 22px;
      box-shadow: 0 18px 55px rgba(22, 32, 51, 0.12);
    }

    .brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding-bottom: 28px;
      border-bottom: 2px solid #e8edf5;
    }

    .brand strong {
      font-size: 24px;
      color: #135df5;
    }

    .badge {
      display: inline-flex;
      padding: 7px 12px;
      border-radius: 999px;
      color: #135df5;
      background: #eaf1ff;
      font-size: 12px;
      font-weight: 700;
    }

    h1 {
      margin: 42px 0 8px;
      font-size: 34px;
    }

    h2 {
      margin-top: 40px;
      font-size: 23px;
    }

    p {
      line-height: 1.65;
    }

    .meta-grid,
    .score-grid {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-top: 24px;
    }

    .card {
      padding: 20px;
      border: 1px solid #e3e9f2;
      border-radius: 16px;
      background: #f9fbfe;
    }

    .card span {
      display: block;
      margin-bottom: 8px;
      color: #637083;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .score {
      font-size: 32px;
      font-weight: 800;
      color: #135df5;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 18px;
    }

    th,
    td {
      padding: 13px 14px;
      border-bottom: 1px solid #e3e9f2;
      text-align: left;
    }

    th {
      background: #f2f6fc;
    }

    li {
      margin-bottom: 14px;
      line-height: 1.55;
    }

    li p {
      margin: 5px 0 0;
    }

    footer {
      margin-top: 52px;
      padding-top: 20px;
      border-top: 1px solid #e3e9f2;
      color: #637083;
      font-size: 12px;
    }

    @media print {
      body {
        background: #ffffff;
      }

      .report {
        width: 100%;
        margin: 0;
        padding: 20mm 16mm;
        border-radius: 0;
        box-shadow: none;
      }

      h2,
      table,
      ul {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <main class="report">
    <header class="brand">
      <strong>İSTEBUL Business</strong>
      <span class="badge">Yönetici Raporu</span>
    </header>

    <h1>${escapeHtml(input.businessName)}</h1>

    <p>${escapeHtml(analysis.summary)}</p>

    <section class="meta-grid">
      <article class="card">
        <span>Analiz türü</span>
        <strong>${escapeHtml(analysis.analysisType)}</strong>
      </article>

      <article class="card">
        <span>Kategori</span>
        <strong>${escapeHtml(analysis.category)}</strong>
      </article>

      <article class="card">
        <span>Rapor tarihi</span>
        <strong>${escapeHtml(
          formatDate(analysis.createdAt)
        )}</strong>
      </article>
    </section>

    <section class="score-grid">
      <article class="card">
        <span>Belge sağlık skoru</span>
        <div class="score">${analysis.score}/100</div>
      </article>

      <article class="card">
        <span>KPI sayısı</span>
        <div class="score">${analysis.kpis.length}</div>
      </article>

      <article class="card">
        <span>İçgörü sayısı</span>
        <div class="score">${analysis.insights.length}</div>
      </article>
    </section>

    <section>
      <h2>Temel performans göstergeleri</h2>
      <table>
        <thead>
          <tr>
            <th>Gösterge</th>
            <th>Değer</th>
          </tr>
        </thead>
        <tbody>${kpiRows}</tbody>
      </table>
    </section>

    <section>
      <h2>İçgörüler</h2>
      <ul>${insightItems}</ul>
    </section>

    <section>
      <h2>Önerilen aksiyonlar</h2>
      <ol>${recommendationItems}</ol>
    </section>

    ${executiveSectionHtml}

    <footer>
      Bu rapor İSTEBUL Business tarafından mevcut belge
      verileri üzerinden hazırlanmıştır. Karar destek
      amaçlıdır; mali, hukuki veya bağımsız denetim raporu
      niteliğinde değildir.
    </footer>
  </main>
</body>
</html>`;
}

export function openPrintableBusinessReport(
  input: BusinessReportInput
): void {
  const html = createReportHtml(input);
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
