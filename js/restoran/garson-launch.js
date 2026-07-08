export const GARSON_DEMO_RESTAURANT_PATH = '/r/demo-cafe';
export const GARSON_DEMO_KITCHEN_PATH = '/garson/mutfak/?businessId=demo-cafe';
export const GARSON_KITCHEN_SCRIPT_PATH = '/js/restoran/kds-admin.js';
export const GARSON_LANDING_PATH = '/garson/';
export const GARSON_KITCHEN_PATH = '/garson/mutfak/';

export const GARSON_BASVURU_SUCCESS_MESSAGE =
  'Başvurunuz alındı. En kısa sürede sizinle iletişime geçeceğiz.';

/**
 * @param {HTMLFormElement} form
 */
export function handleGarsonBasvuruSubmit(form) {
  if (!form.reportValidity()) return;
  const success = document.getElementById('garson-basvuru-success');
  if (success) {
    success.hidden = false;
    success.textContent = GARSON_BASVURU_SUCCESS_MESSAGE;
  }
  form.reset();
}

function bindBasvuruForm() {
  const form = document.getElementById('garson-basvuru-form');
  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleGarsonBasvuruSubmit(form);
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindBasvuruForm);
  } else {
    bindBasvuruForm();
  }
}
