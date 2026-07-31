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
      this.tagName = String(tagName).toUpperCase();
      this.children = [];
      this.dataset = {};
      this.attrs = {};
      this.className = '';
      this.textContent = '';
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

  if (node?.textContent) {
    values.push(node.textContent);
  }

  for (const child of node?.children ?? []) {
    values.push(collectText(child));
  }

  return values.join(' ');
}

function analysis(
  id,
  date,
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
    createdAt: date
  };
}

test(
  'Executive Dashboard V7 renders alerts and scenarios',
  () => {
    installDomStubs();

    const analyses = [
      analysis(
        'latest',
        '2026-04-01T00:00:00.000Z',
        80000,
        90000,
        -10000,
        -12.5,
        700,
        35
      ),
      analysis(
        'previous',
        '2026-03-01T00:00:00.000Z',
        120000,
        70000,
        50000,
        41.67,
        1000,
        60
      ),
      analysis(
        'older',
        '2026-02-01T00:00:00.000Z',
        130000,
        68000,
        62000,
        47.69,
        1100,
        68
      )
    ];

    const page =
      createBusinessDashboardPageElement({
        analysis: analyses[0],
        previousAnalysis: analyses[1],
        analyses
      });

    const text = collectText(page);

    assert.match(text, /CEO Alarm Merkezi/);
    assert.match(text, /Kritik/);
    assert.match(text, /Sağlık skorunda hızlı düşüş/);
    assert.match(text, /Hazır Yönetici Senaryoları/);
    assert.match(text, /Büyüme Senaryosu/);
    assert.match(text, /Maliyet Optimizasyonu/);
    assert.match(text, /Stres Testi/);
    assert.match(text, /garanti/i);
  }
);
