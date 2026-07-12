/**
 * GarsonAI hafif Zod-benzeri şema doğrulayıcı (harici bağımlılık yok).
 */

/**
 * @typedef {Object} ZodValidationResult
 * @property {boolean} ok
 * @property {unknown} data
 * @property {string[]} errors
 */

/**
 * @param {unknown} value
 * @param {string} path
 * @param {string[]} errors
 */
function expectObject(value, path, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${path}: nesne bekleniyor`);
    return null;
  }
  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * @param {Record<string, (value: unknown, path: string, errors: string[]) => unknown>} shape
 * @returns {(value: unknown) => ZodValidationResult}
 */
export function zodObject(shape) {
  return (value) => {
    /** @type {string[]} */
    const errors = [];
    const source = expectObject(value, '$', errors);
    if (!source) return { ok: false, data: null, errors };

    /** @type {Record<string, unknown>} */
    const output = {};
    for (const [key, validator] of Object.entries(shape)) {
      output[key] = validator(source[key], `$.${key}`, errors);
    }

    return {
      ok: errors.length === 0,
      data: errors.length === 0 ? output : null,
      errors
    };
  };
}

/**
 * @param {readonly string[]} values
 */
export function zodEnum(values) {
  const allowed = new Set(values);
  return (value, path, errors) => {
    const normalized = String(value ?? '').trim();
    if (!allowed.has(normalized)) {
      errors.push(`${path}: geçersiz enum değeri`);
      return '';
    }
    return normalized;
  };
}

export function zodString(minLength = 0) {
  return (value, path, errors) => {
    const normalized = String(value ?? '').trim();
    if (normalized.length < minLength) {
      errors.push(`${path}: metin çok kısa`);
      return '';
    }
    return normalized;
  };
}

export function zodNumber(min = 0) {
  return (value, path, errors) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num < min) {
      errors.push(`${path}: geçersiz sayı`);
      return 0;
    }
    return num;
  };
}

export function zodOptionalString() {
  return (value, path, errors) => {
    if (value == null || value === '') return undefined;
    return zodString(0)(value, path, errors);
  };
}

/**
 * @param {(value: unknown, path: string, errors: string[]) => unknown} itemValidator
 */
export function zodArray(itemValidator) {
  return (value, path, errors) => {
    if (!Array.isArray(value)) {
      errors.push(`${path}: dizi bekleniyor`);
      return [];
    }
    return value.map((item, index) => itemValidator(item, `${path}[${index}]`, errors));
  };
}
