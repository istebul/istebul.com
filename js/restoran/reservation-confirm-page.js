import {
  buildGoogleCalendarUrl,
  buildReservationConfirmUrl,
  formatReservationStatusLabel,
  getRestaurantReservation,
  parseReservationCodeFromSearch
} from './restoran-api.js';

const MISSING_CODE_MESSAGE = 'Rezervasyon kodu bulunamadı.';
const LOOKUP_ERROR_MESSAGE = 'Rezervasyon bilgisi şu anda görüntülenemiyor.';

/**
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function $(id) {
  return document.getElementById(id);
}

/**
 * @param {'loading'|'ready'|'missing'|'error'} state
 * @param {string} [message]
 */
function setPageState(state, message = '') {
  const status = $('confirm-status');
  const panel = $('confirm-panel');
  const missing = $('confirm-missing');
  const error = $('confirm-error');

  if (status) {
    status.hidden = state !== 'loading';
    status.textContent = message || 'Rezervasyon bilgileri yükleniyor…';
  }

  if (panel) panel.hidden = state !== 'ready';
  if (missing) missing.hidden = state !== 'missing';
  if (error) {
    error.hidden = state !== 'error';
    const errorText = $('confirm-error-text');
    if (errorText) errorText.textContent = message || LOOKUP_ERROR_MESSAGE;
  }
}

/**
 * @param {import('./restoran-api.js').NormalizedReservationResult} reservation
 */
function renderReservation(reservation) {
  const code = $('confirm-code');
  const status = $('confirm-reservation-status');
  const restaurant = $('confirm-restaurant');
  const datetime = $('confirm-datetime');
  const guests = $('confirm-guests');
  const customer = $('confirm-customer');
  const noteRow = $('confirm-note-row');
  const note = $('confirm-note');
  const calendarLink = /** @type {HTMLAnchorElement|null} */ ($('confirm-calendar-link'));

  const restaurantName = reservation.businessName || 'Restoran';
  const date = reservation.date || '—';
  const time = reservation.time || '—';

  if (code) code.textContent = reservation.code;
  if (status) status.textContent = formatReservationStatusLabel(reservation.status);
  if (restaurant) restaurant.textContent = restaurantName;
  if (datetime) datetime.textContent = `${date} ${time}`;
  if (guests) guests.textContent = `${reservation.guestCount} kişi`;
  if (customer) customer.textContent = reservation.customerName || '—';

  if (noteRow && note) {
    if (reservation.note) {
      noteRow.hidden = false;
      note.textContent = reservation.note;
    } else {
      noteRow.hidden = true;
      note.textContent = '';
    }
  }

  if (calendarLink && reservation.date && reservation.time) {
    calendarLink.href = buildGoogleCalendarUrl({
      title: `${restaurantName} rezervasyonu`,
      date: reservation.date,
      time: reservation.time,
      description: `Rezervasyon kodu: ${reservation.code}`
    });
  }

  document.title = `Rezervasyon ${reservation.code} | GarsonAI — isteBul`;
  setPageState('ready');
}

async function boot() {
  document.body.classList.add('ib-ready');

  const reservationCode = parseReservationCodeFromSearch(window.location.search);
  if (!reservationCode) {
    const missingText = $('confirm-missing-text');
    if (missingText) missingText.textContent = MISSING_CODE_MESSAGE;
    setPageState('missing');
    return;
  }

  setPageState('loading');

  try {
    const reservation = await getRestaurantReservation(reservationCode);
    if (!reservation.code) {
      setPageState('error', LOOKUP_ERROR_MESSAGE);
      return;
    }
    renderReservation(reservation);
  } catch {
    setPageState('error', LOOKUP_ERROR_MESSAGE);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export {
  MISSING_CODE_MESSAGE,
  LOOKUP_ERROR_MESSAGE,
  buildReservationConfirmUrl
};
