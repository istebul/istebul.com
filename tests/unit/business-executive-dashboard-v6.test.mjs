import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  fileURLToPath,
  pathToFileURL
} from 'node:url';

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

register(
  pathToFileURL(
    path.join(
      __dirname,
      '../helpers/business-ts-resolve.mjs'
    )
  ).href
);

const {
  createBusinessDashboardPageElement
} = await import(
  '../../src/business/pages/BusinessDashboardPage.ts'
);

function installDomStubs() {
  class FakeElement {
    constructor(tagName) {
      this.tagName =
        String(tagName).toUpperCase();
      this.children = [];
      this.dataset = {};
      this.attrs = {};
      this.className = '';
      this.textContent = '';
      this.href = '';
    }

    append(...children) {
      this.children.push(...children);
    }

    appendChild(child) {
      this.children.push(child);
      return child;
    }

    setAttribute(name, value) {
      this.attrs[name] = String(value);
    }
  }

  globalThis.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    }
  };
}

function collectText(node) {
  const values = [];

  if (
    typeof node?.textContent === 'string' &&
    node.textContent
  ) {
    values.push(node.textContent);
  }

  for (const child of node?.children ?? []) {
    values.push(collectText(child));
  }

  return values.join(' ');
}

function analysis(
  id,
  createdAt,
  revenue,
  cost,
  profit,
  margin,
  quantity,
  score
) {
  return {
    id,
    businessId: 'business-001',
    documentId: `document-${id}`,
    analysisType: 'management-summary',
    category: 'sales',
    score,
    summary: 'Yönetici performans özeti.',
    kpis: [
      {
        id: 'semantic_total_revenue',
        label: 'Toplam Ciro',
        value: revenue,
        unit: 'TRY'
      },
      {
        id: 'semantic_total_cost',
        label: 'Toplam Maliyet',
        value: cost,
        unit: 'TRY'
      },
      {
        id: 'semantic_gross_profit',
        label: 'Brüt Kâr',
        value: profit,
        unit: 'TRY'
      },
      {
        id: 'semantic_profit_margin',
        label: 'Kâr Marjı',
        value: margin,
        unit: '%'
      },
      {
        id: 'semantic_total_quantity',
        label: 'Toplam Satış Adedi',
        value: quantity,
        unit: 'adet'
      }
    ],
    insights: [],
    recommendations: [],
    createdAt
  };
}

test(
  'Executive Dashboard V6 renders benchmark and forecasts',
  () => {
    installDomStubs();

    const analyses = [
      analysis(
        'april',
        '2026-04-01T00:00:00.000Z',
        160000,
        86000,
        74000,
        46.25,
        160,
        78
      ),
      analysis(
        'march',
        '2026-03-01T00:00:00.000Z',
        140000,
        84000,
        56000,
        40,
        140,
        72
      ),
      analysis(
        'february',
        '2026-02-01T00:00:00.000Z',
        120000,
        82000,
        38000,
        31.67,
        120,
        66
      ),
      analysis(
        'january',
        '2026-01-01T00:00:00.000Z',
        100000,
        80000,
        20000,
        20,
        100,
        60
      )
    ];

    const page =
      createBusinessDashboardPageElement({
        analysis: analyses[0],
        previousAnalysis: analyses[1],
        analyses
      });

    const text = collectText(page);

    assert.match(
      text,
      /Benchmark ve Gelecek Projeksiyonu/
    );

    assert.match(
      text,
      /Benchmark Değerlendirmesi/
    );

    assert.match(
      text,
      /Sağlık persentili/
    );

    assert.match(
      text,
      /30 \/ 90 \/ 365 Günlük Projeksiyon/
    );

    assert.match(
      text,
      /Toplam Ciro/
    );

    assert.match(
      text,
      /Tahmin hazır/
    );

    assert.match(
      text,
      /garanti/i
    );
  }
);
