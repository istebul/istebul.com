/**
 * P4.2 — Enterprise form UX (modals, validation surface, submit loading).
 */

let authModalEscapeHandler = null;

export function bindAuthModalA11y(modal, onClose) {
  if (!modal || modal.dataset.ibModalA11y === '1') return;
  modal.dataset.ibModalA11y = '1';

  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn && !closeBtn.getAttribute('aria-label')) {
    closeBtn.setAttribute('aria-label', 'Pencereyi kapat');
    closeBtn.setAttribute('type', 'button');
  }

  if (authModalEscapeHandler) {
    document.removeEventListener('keydown', authModalEscapeHandler);
  }

  authModalEscapeHandler = (event) => {
    if (event.key !== 'Escape' || !modal.classList.contains('show')) return;
    event.preventDefault();
    onClose?.();
  };
  document.addEventListener('keydown', authModalEscapeHandler);

  const focusable = () =>
    Array.from(
      modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);

  modal.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || !modal.classList.contains('show')) return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

export function focusFirstField(container) {
  const el = container?.querySelector(
    'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
  );
  el?.focus?.();
}

export function setSubmitLoading(button, loading, { busyLabel, idleLabel } = {}) {
  if (!(button instanceof HTMLButtonElement)) return;
  if (!button.dataset.idleLabel) {
    button.dataset.idleLabel = idleLabel || button.textContent;
  }
  button.disabled = loading;
  button.classList.toggle('is-loading', loading);
  button.setAttribute('aria-busy', loading ? 'true' : 'false');
  if (busyLabel && loading) button.textContent = busyLabel;
  if (!loading) button.textContent = button.dataset.idleLabel;
}

export function showInlineFormBanner(container, message, type = 'error') {
  if (!container) return null;
  container.querySelectorAll('.ib-form-banner').forEach((el) => el.remove());
  const banner = document.createElement('div');
  banner.className = `ib-form-banner ib-form-banner--${type}`;
  banner.setAttribute('role', type === 'error' ? 'alert' : 'status');
  banner.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  banner.textContent = message;
  container.insertBefore(banner, container.firstChild);
  return banner;
}

export function clearInlineFormBanner(container) {
  container?.querySelectorAll('.ib-form-banner').forEach((el) => el.remove());
}

export function setFieldError(field, message) {
  const formGroup = field?.closest?.('.form-group, .field, label');
  if (!formGroup) return;
  formGroup.classList.add('error');
  field.setAttribute('aria-invalid', 'true');
  let err = formGroup.querySelector('.form-error');
  if (!err) {
    err = document.createElement('div');
    err.className = 'form-error';
    err.id = `${field.id || field.name}-error`;
    formGroup.appendChild(err);
  }
  err.textContent = message;
  field.setAttribute('aria-describedby', err.id);
}

export function clearFieldErrors(form) {
  if (!form) return;
  form.querySelectorAll('.form-error').forEach((el) => el.remove());
  form.querySelectorAll('.error').forEach((el) => el.classList.remove('error'));
  form.querySelectorAll('[aria-invalid]').forEach((el) => {
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  });
}
