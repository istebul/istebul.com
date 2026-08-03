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

function analysis(id, date, score, revenue, cost) {
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
        value: revenue - cost,
        unit: 'TRY'
      },
      {
        id: 'semantic_profit_margin',
        label: 'Kâr Marjı',
        value: ((revenue - cost) / revenue) * 100,
        unit: '%'
      },
      {
        id: 'semantic_total_quantity',
        label: 'Satış Adedi',
        value: 800,
        unit: 'adet'
      }
    ],
    insights: [],
    recommendations: [
      'Maliyet kalemlerini bugün gözden geçir.',
      'Satış artırıcı kampanya planla.'
    ],
    createdAt: date
  };
}

test(
  'Executive Dashboard V8 renders Executive Copilot',
  () => {
    installDomStubs();

    const analyses = [
      analysis(
        'current',
        '2026-08-01T00:00:00.000Z',
        35,
        80000,
        90000
      ),
      analysis(
        'previous',
        '2026-07-01T00:00:00.000Z',
        60,
        120000,
        70000
      ),
      analysis(
        'older',
        '2026-06-01T00:00:00.000Z',
        68,
        130000,
        68000
      )
    ];

    const page =
      createBusinessDashboardPageElement({
        analysis: analyses[0],
        previousAnalysis: analyses[1],
        analyses
      });

    const text = collectText(page);

    assert.match(text, /Executive Copilot/);
    assert.match(text, /İşletme sağlık skoru/);
    assert.match(text, /En kritik risk/);
    assert.match(text, /En güçlü fırsat/);
    assert.match(text, /Öncelikli Yönetici Aksiyonları/);
    assert.match(text, /Veri güveni/);
    assert.match(text, /garanti/i);
  }
);
