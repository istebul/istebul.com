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
  class FakeEl {
    constructor(tag) {
      this.tagName = String(tag).toUpperCase();
      this.children = [];
      this.dataset = {};
      this.className = '';
      this.textContent = '';
      this.href = '';
      this.attrs = {};
    }

    append(...nodes) {
      this.children.push(...nodes);
    }

    appendChild(node) {
      this.children.push(node);
      return node;
    }

    setAttribute(key, value) {
      this.attrs[key] = String(value);
    }
  }

  globalThis.document = {
    createElement(tag) {
      return new FakeEl(tag);
    }
  };
}

function collectText(node) {
  const parts = [];

  if (
    typeof node?.textContent === 'string' &&
    node.textContent
  ) {
    parts.push(node.textContent);
  }

  for (const child of node?.children ?? []) {
    parts.push(collectText(child));
  }

  return parts.join(' ');
}

function buildAnalysis(
  id,
  score,
  revenue,
  cost,
  profit,
  margin
) {
  return {
    id,
    businessId: 'business-1',
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
      }
    ],
    insights: [],
    recommendations: [],
    createdAt: '2026-07-31T12:00:00.000Z'
  };
}

test(
  'Executive Dashboard V5 renders health and highlights',
  () => {
    installDomStubs();

    const page =
      createBusinessDashboardPageElement({
        analysis: buildAnalysis(
          'current',
          86,
          120000,
          70000,
          50000,
          41.7
        ),
        previousAnalysis: buildAnalysis(
          'previous',
          74,
          100000,
          75000,
          25000,
          25
        )
      });

    const text = collectText(page);

    assert.match(text, /İşletme Sağlığı/);
    assert.match(text, /İyileşiyor/);
    assert.match(text, /86\/100/);
    assert.match(text, /74\/100/);
    assert.match(text, /Yönetici Öncelikleri/);
    assert.match(text, /En büyük iyileşme/i);
    assert.match(text, /En kritik bozulma/i);
  }
);
