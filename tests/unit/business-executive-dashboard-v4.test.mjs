import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
  createBusinessDashboardPageElement,
  mountBusinessDashboardPage
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

    replaceChildren(...nodes) {
      this.children = [...nodes];
    }

    setAttribute(key, value) {
      this.attrs[key] = String(value);
    }

    querySelector(selector) {
      const className = selector.startsWith('.')
        ? selector.slice(1)
        : null;

      const dataKey =
        selector === '[data-business-dashboard-empty]'
          ? 'businessDashboardEmpty'
          : null;

      const walk = (node) => {
        if (
          className &&
          String(node.className)
            .split(/\s+/)
            .includes(className)
        ) {
          return node;
        }

        if (
          dataKey &&
          node.dataset?.[dataKey] !== undefined
        ) {
          return node;
        }

        for (const child of node.children ?? []) {
          const found = walk(child);
          if (found) return found;
        }

        return null;
      };

      return walk(this);
    }
  }

  globalThis.document = {
    createElement(tag) {
      return new FakeEl(tag);
    }
  };
}

function collectText(node) {
  if (typeof node === 'string') {
    return node;
  }

  const parts = [];

  if (
    typeof node?.textContent === 'string' &&
    node.textContent
  ) {
    parts.push(node.textContent);
  }

  for (const child of node?.children ?? []) {
    const childText = collectText(child);

    if (childText) {
      parts.push(childText);
    }
  }

  return parts.join(' ');
}

const analysis = {
  id: 'analysis-1',
  businessId: 'business-1',
  documentId: 'document-1',
  analysisType: 'management-summary',
  category: 'sales',
  score: 88,
  summary: 'Temmuz satış performansı güçlü.',
  kpis: [
    {
      id: 'semantic_total_revenue',
      label: 'Toplam Ciro',
      value: 104500,
      unit: 'TRY'
    },
    {
      id: 'semantic_gross_profit',
      label: 'Brüt Kâr',
      value: 37100,
      unit: 'TRY'
    },
    {
      id: 'semantic_profit_margin',
      label: 'Kâr Marjı',
      value: 35.5,
      unit: '%'
    }
  ],
  insights: [
    {
      id: 'insight-1',
      title: 'Satış verisi incelendi',
      description: 'Üç kayıt analiz edildi.',
      severity: 'success',
      source: 'test'
    }
  ],
  recommendations: [
    'En güçlü ürün grubuna odaklanın.'
  ],
  createdAt: '2026-07-30T20:00:00.000Z'
};

test('Executive Dashboard renders live analysis KPI values', () => {
  installDomStubs();

  const page = createBusinessDashboardPageElement({
    analysis
  });

  const text = collectText(page);

  assert.match(text, /Toplam Ciro/);
  assert.match(text, /104\.500 ₺/);
  assert.match(text, /Brüt Kâr/);
  assert.match(text, /Kâr Marjı/);
  assert.match(text, /88\/100/);
  assert.match(text, /Temmuz satış performansı güçlü/);
  assert.match(text, /En güçlü ürün grubuna odaklanın/);
});

test('Executive Dashboard shows empty state without analyses', async () => {
  installDomStubs();

  const container = document.createElement('div');

  await mountBusinessDashboardPage(container, {
    businessId: 'business-1',
    runtime: {
      documentAnalyses: {
        async listByBusiness() {
          return [];
        }
      }
    }
  });

  assert.ok(
    container.querySelector(
      '[data-business-dashboard-empty]'
    )
  );

  assert.match(
    collectText(container),
    /Henüz canlı analiz bulunmuyor/
  );
});
