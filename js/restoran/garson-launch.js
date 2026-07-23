export const GARSON_DEMO_RESTAURANT_PATH = '/r/demo-cafe';
export const GARSON_DEMO_KITCHEN_PATH = '/garson/mutfak/?businessId=demo-cafe';
export const GARSON_KITCHEN_SCRIPT_PATH = '/js/restoran/kds-admin.js';
export const GARSON_LANDING_PATH = '/garson/';
export const GARSON_KITCHEN_PATH = '/garson/mutfak/';

/**
 * Dürüst başarı metni — otomatik kayıt / CRM yokken yanıltıcı “alındı” iddiası yok.
 * (PR-554A UX; backend bağlanınca metin güncellenebilir.)
 */
export const GARSON_BASVURU_SUCCESS_MESSAGE =
  'Teşekkürler. Formu tamamladınız. Bu aşamada başvurunuz otomatik bir sisteme kaydedilmez; canlı ön kayıt henüz bağlı değildir. Demo restoranı inceleyebilir veya iletişim kanallarımızdan bize ulaşabilirsiniz.';

const FIELD_MESSAGES = Object.freeze({
  restaurant_name: 'Lütfen işletme adını yazın.',
  contact_name: 'Lütfen yetkili adı ve soyadını yazın.',
  phone: 'Lütfen telefon numaranızı yazın.',
  city: 'Lütfen şehir bilgisini yazın.',
  email: 'Lütfen geçerli bir e-posta adresi yazın.',
  kvkk: 'Devam etmek için KVKK bilgilendirmesini onaylayın.'
});

/**
 * Yerel Türkçe doğrulama mesajları (çok adımlı form yok).
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
export function validateGarsonBasvuruForm(form) {
  if (!form || typeof form.querySelectorAll !== 'function' || !form.elements) {
    return false;
  }

  const controls = form.querySelectorAll('input, select, textarea');
  for (const el of controls) {
    if ('setCustomValidity' in el) {
      el.setCustomValidity('');
    }
  }

  const restaurant = form.elements.namedItem('restaurant_name');
  const contact = form.elements.namedItem('contact_name');
  const phone = form.elements.namedItem('phone');
  const city = form.elements.namedItem('city');
  const email = form.elements.namedItem('email');
  const kvkk = form.elements.namedItem('kvkk_consent');

  const isInput = (el) =>
    Boolean(el && typeof el === 'object' && 'value' in el && typeof el.setCustomValidity === 'function');

  /** @type {HTMLInputElement | null} */
  const firstInvalid = (() => {
    if (isInput(restaurant) && !String(restaurant.value || '').trim()) {
      restaurant.setCustomValidity(FIELD_MESSAGES.restaurant_name);
      return restaurant;
    }
    if (isInput(contact) && !String(contact.value || '').trim()) {
      contact.setCustomValidity(FIELD_MESSAGES.contact_name);
      return contact;
    }
    if (isInput(phone) && !String(phone.value || '').trim()) {
      phone.setCustomValidity(FIELD_MESSAGES.phone);
      return phone;
    }
    if (isInput(city) && !String(city.value || '').trim()) {
      city.setCustomValidity(FIELD_MESSAGES.city);
      return city;
    }
    if (
      isInput(email) &&
      String(email.value || '').trim() &&
      typeof email.checkValidity === 'function' &&
      !email.checkValidity()
    ) {
      email.setCustomValidity(FIELD_MESSAGES.email);
      return email;
    }
    if (isInput(kvkk) && !kvkk.checked) {
      kvkk.setCustomValidity(FIELD_MESSAGES.kvkk);
      return kvkk;
    }
    return null;
  })();

  if (firstInvalid) {
    form.reportValidity();
    firstInvalid.focus?.();
    return false;
  }

  return form.reportValidity();
}

/**
 * @param {HTMLFormElement} form
 * @returns {boolean} gönderim UI olarak tamamlandı mı
 */
export function handleGarsonBasvuruSubmit(form) {
  if (!validateGarsonBasvuruForm(form)) return false;

  const success = document.getElementById('garson-basvuru-success');
  if (success) {
    success.hidden = false;
    success.textContent = GARSON_BASVURU_SUCCESS_MESSAGE;
    success.classList.add('is-visible');
  }

  // Otomatik kayıt yok; alanları silmek kullanıcıya zarar verir — formu sıfırlama.
  success?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  return true;
}

function bindBasvuruForm() {
  const form = document.getElementById('garson-basvuru-form');
  if (!form || form.tagName !== 'FORM') return;

  const clearOnInput = (event) => {
    const target = event.target;
    if (target && 'setCustomValidity' in target) {
      target.setCustomValidity('');
    }
  };
  form.addEventListener('input', clearOnInput);
  form.addEventListener('change', clearOnInput);

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
