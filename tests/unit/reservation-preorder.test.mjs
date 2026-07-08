import test from 'node:test';
import assert from 'node:assert/strict';

const { PreorderValidationError } = await import('../../js/restoran/restoran-api.js');
const {
  buildPreorderRequest,
  formatPreorderEtaMessage,
  formatPreorderSubmitError,
  formatPreorderTotalLabel,
  getKdsTimelineIndex,
  renderKdsTimelineHtml
} = await import('../../js/restoran/reservation-page.js');

test('buildPreorderRequest maps cart lines to preorder API input', () => {
  const request = buildPreorderRequest('res-42', [
    { id: 'soup-1', qty: 2, note: 'az tuzlu' },
    { id: 'salad-2', qty: 1 }
  ]);

  assert.deepEqual(request, {
    reservationId: 'res-42',
    items: [
      { menuItemId: 'soup-1', qty: 2, note: 'az tuzlu' },
      { menuItemId: 'salad-2', qty: 1, note: undefined }
    ]
  });
});

test('formatPreorderTotalLabel formats TRY totals', () => {
  assert.equal(formatPreorderTotalLabel(420, 'TRY'), '420 TL');
  assert.equal(formatPreorderTotalLabel(null, 'TRY'), '—');
});

test('formatPreorderSubmitError maps validation errors', () => {
  const message = formatPreorderSubmitError(
    new PreorderValidationError('Rezervasyon kimliği gerekli')
  );
  assert.equal(message, 'Rezervasyon kimliği gerekli');
});

test('formatPreorderSubmitError maps API status errors', () => {
  const message = formatPreorderSubmitError(new Error('Ön sipariş oluşturulamadı (422)'));
  assert.match(message, /HTTP 422/);
});

test('formatPreorderSubmitError maps network errors', () => {
  const message = formatPreorderSubmitError(new TypeError('Failed to fetch'));
  assert.equal(message, 'Bağlantı hatası. Lütfen tekrar deneyin.');
});

test('formatPreorderEtaMessage formats ETA copy', () => {
  assert.equal(formatPreorderEtaMessage(20), 'Tahmini hazır olma: 20 dakika');
  assert.equal(formatPreorderEtaMessage(null), '');
});

test('getKdsTimelineIndex highlights preparing step', () => {
  assert.equal(getKdsTimelineIndex('preparing'), 2);
  assert.equal(getKdsTimelineIndex('ready'), 3);
  assert.equal(getKdsTimelineIndex('served'), 4);
});

test('renderKdsTimelineHtml marks current step', () => {
  const html = renderKdsTimelineHtml('preparing');
  assert.match(html, /is-current/);
  assert.match(html, /Hazırlanıyor/);
});
