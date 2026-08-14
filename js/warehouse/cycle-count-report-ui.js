function byId(id) {
  return document.getElementById(id);
}

function text(value) {
  return String(
    value ?? ""
  ).trim();
}

function formatNumber(
  value,
  maximumFractionDigits = 2
) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "tr-TR",
    {
      maximumFractionDigits
    }
  ).format(number);
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "short",
      timeStyle: "short"
    }
  ).format(date);
}

function clearElement(element) {
  if (element) {
    element.replaceChildren();
  }
}

function appendMetric(
  host,
  label,
  value
) {
  const card =
    document.createElement(
      "div"
    );

  const small =
    document.createElement(
      "small"
    );

  const strong =
    document.createElement(
      "strong"
    );

  small.textContent =
    label;

  strong.textContent =
    text(value) || "—";

  card.append(
    small,
    strong
  );

  host.append(card);
}

function appendCell(
  row,
  value
) {
  const cell =
    document.createElement(
      "td"
    );

  cell.textContent =
    text(value) || "—";

  row.append(cell);
}

function renderReport(report) {
  const section =
    byId(
      "sayim-rapor-detayi"
    );

  const title =
    byId(
      "sayim-rapor-basligi"
    );

  const metrics =
    byId(
      "sayim-rapor-metrikleri"
    );

  const body =
    byId(
      "sayim-rapor-satirlari"
    );

  if (
    !section ||
    !metrics ||
    !body
  ) {
    return;
  }

  clearElement(metrics);
  clearElement(body);

  const summary =
    report?.summary || {};

  const items =
    Array.isArray(
      report?.items
    )
      ? report.items
      : [];

  if (title) {
    title.textContent =
      `${
        text(
          report?.cycleCountNumber
        ) ||
        "Sayım"
      } · Tamamlanmış Rapor`;
  }

  appendMetric(
    metrics,
    "Toplam satır",
    formatNumber(
      summary.totalItems,
      0
    )
  );

  appendMetric(
    metrics,
    "Eşleşen satır",
    formatNumber(
      summary.matchedItems,
      0
    )
  );

  appendMetric(
    metrics,
    "Farklı satır",
    formatNumber(
      summary.varianceItems,
      0
    )
  );

  appendMetric(
    metrics,
    "Yeniden sayım",
    formatNumber(
      summary.recountItems,
      0
    )
  );

  appendMetric(
    metrics,
    "Düzeltilen",
    formatNumber(
      summary.adjustedItems,
      0
    )
  );

  appendMetric(
    metrics,
    "Hasarlı",
    formatNumber(
      summary.damagedItems,
      0
    )
  );

  appendMetric(
    metrics,
    "Doğruluk",
    `${
      formatNumber(
        summary.accuracyPercentage
      )
    }%`
  );

  appendMetric(
    metrics,
    "Mutlak fark",
    formatNumber(
      summary
        .totalAbsoluteVarianceQuantity
    )
  );

  appendMetric(
    metrics,
    "Tamamlanma",
    formatDateTime(
      summary.completedAt ||
      report.generatedAt
    )
  );

  for (const item of items) {
    const row =
      document.createElement(
        "tr"
      );

    appendCell(
      row,
      item.lineNumber
    );

    appendCell(
      row,
      item.locationCode
    );

    appendCell(
      row,
      [
        item.productCode,
        item.productName
      ]
        .filter(Boolean)
        .join(" · ")
    );

    appendCell(
      row,
      item.skuCode
    );

    appendCell(
      row,
      item.stockStatus
    );

    appendCell(
      row,
      formatNumber(
        item.expectedQuantity
      )
    );

    appendCell(
      row,
      formatNumber(
        item.firstCountQuantity
      )
    );

    appendCell(
      row,
      formatNumber(
        item.secondCountQuantity
      )
    );

    appendCell(
      row,
      formatNumber(
        item.finalCountQuantity
      )
    );

    appendCell(
      row,
      formatNumber(
        item.damagedQuantity
      )
    );

    appendCell(
      row,
      formatNumber(
        item.varianceQuantity
      )
    );

    appendCell(
      row,
      item.status
    );

    body.append(row);
  }

  section.hidden =
    false;
}

function clearReport() {
  const section =
    byId(
      "sayim-rapor-detayi"
    );

  if (section) {
    section.hidden =
      true;
  }
}

document.addEventListener(
  "warehouse:cycle-count-report-data",
  (event) => {
    renderReport(
      event.detail?.report ||
      null
    );
  }
);

document.addEventListener(
  "warehouse:cycle-count-report-clear",
  clearReport
);

document.addEventListener(
  "DOMContentLoaded",
  () => {
    byId(
      "sayim-rapor-yazdir"
    )?.addEventListener(
      "click",
      () => {
        window.print();
      }
    );
  }
);
