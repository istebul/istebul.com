import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatFxTry,
  formatPercentTr,
  formatSeriesDateLabel,
  renderCardHtml,
  renderFallbackHtml,
  renderSkeletonHtml,
  hydrateHomeEconomicIndicators
} from '../../js/features/home/home-economic-indicators.js';

test('formatFxTry uses Turkish currency formatting', () => {
  assert.equal(formatFxTry(45.8696), '₺45,87');
  assert.equal(formatFxTry(null), '—');
});

test('formatPercentTr uses Turkish percent formatting', () => {
  assert.equal(formatPercentTr(40), '%40,00');
  assert.equal(formatPercentTr(30.64848474), '%30,65');
});

test('formatSeriesDateLabel formats EVDS monthly dates', () => {
  assert.equal(formatSeriesDateLabel('2026-1'), 'Oca 2026');
  assert.equal(formatSeriesDateLabel('04-06-2026'), '04-06-2026');
});

test('renderCardHtml shows all economic indicators with dates', () => {
  const html = renderCardHtml({
    rates: {
      usdTry: 45.87,
      eurTry: 53.28,
      policyRate: 40,
      cpiAnnual: 30.65,
      housingLoanRate: 53.23
    },
    seriesDates: {
      usdTry: '04-06-2026',
      eurTry: '04-06-2026',
      policyRate: '04-06-2026',
      cpiAnnual: '2026-1',
      housingLoanRate: '29-05-2026'
    }
  });

  assert.match(html, /Güncel Ekonomik Göstergeler/);
  assert.match(html, /USD\/TRY/);
  assert.match(html, /EUR\/TRY/);
  assert.match(html, /Politika Faizi/);
  assert.match(html, /TÜFE Yıllık/);
  assert.match(html, /Konut Kredisi Faizi/);
  assert.match(html, /₺45,87/);
  assert.match(html, /₺53,28/);
  assert.match(html, /%40,00/);
  assert.match(html, /Kaynak: TCMB EVDS · Bilgilendirme amaçlıdır\./);
  assert.match(html, /Oca 2026/);
});

test('renderSkeletonHtml exposes loading state', () => {
  const html = renderSkeletonHtml();
  assert.match(html, /data-home-economic-state="loading"/);
  assert.match(html, /ib-home-economic__item--skeleton/);
});

test('renderFallbackHtml shows graceful message', () => {
  const html = renderFallbackHtml();
  assert.match(html, /yüklenemedi/);
  assert.match(html, /Kaynak: TCMB EVDS · Bilgilendirme amaçlıdır\./);
});

test('hydrateHomeEconomicIndicators renders card when API succeeds', async () => {
  const mount = createMount();

  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        ok: true,
        data: {
          rates: {
            usdTry: 45.87,
            eurTry: 53.28,
            policyRate: 40,
            cpiAnnual: 30.65,
            housingLoanRate: 53.23
          },
          seriesDates: {
            usdTry: '04-06-2026',
            eurTry: '04-06-2026',
            policyRate: '04-06-2026',
            cpiAnnual: '2026-1',
            housingLoanRate: '29-05-2026'
          }
        }
      };
    }
  });

  await hydrateHomeEconomicIndicators(mount);

  assert.match(mount.innerHTML, /data-home-economic-state="ready"/);
  assert.match(mount.innerHTML, /₺45,87/);
  assert.equal(mount.attributes['aria-busy'], undefined);
});

test('hydrateHomeEconomicIndicators shows fallback when API fails', async () => {
  const mount = createMount();

  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    async json() {
      return { ok: false };
    }
  });

  await hydrateHomeEconomicIndicators(mount);

  assert.match(mount.innerHTML, /data-home-economic-state="fallback"/);
  assert.match(mount.innerHTML, /yüklenemedi/);
});

function createMount() {
  return {
    innerHTML: '',
    dataset: {},
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    }
  };
}
